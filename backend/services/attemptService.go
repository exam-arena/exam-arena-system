package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"log"
	"os"
	"slices"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
	"golang.org/x/sync/singleflight"
)

var (
	ErrAttemptNotFound      = errors.New("attempt not found")
	ErrAttemptForbidden     = errors.New("attempt forbidden")
	ErrAttemptClosed        = errors.New("attempt is not in progress")
	ErrAttemptNotSubmitted  = errors.New("attempt is not submitted")
	ErrAttemptProcessing    = errors.New("attempt is processing")
	ErrInvalidAnswerPayload = errors.New("answers payload is invalid")
	ErrExamNotStarted       = errors.New("exam not started")
	ErrExamEnded            = errors.New("exam ended")
	ErrExamAlreadyCompleted = errors.New("exam already completed")
	ErrStartAttemptBusy     = errors.New("start attempt busy")
	startAttemptGroup       singleflight.Group
	examPolicyGroup         singleflight.Group
	saveAnswersGroup        singleflight.Group
	submitAttemptGroup      singleflight.Group
	attemptInfoGroup        singleflight.Group
	attemptWriteGuardGroup  singleflight.Group
	attemptQuestionGroup    singleflight.Group
	attemptDetailGroup      singleflight.Group
	attemptReviewGroup      singleflight.Group
	attemptResultGroup      singleflight.Group
)

const attemptQuestionCacheTTL = 10 * time.Minute
const examAttemptPolicyCacheTTL = 10 * time.Second
const attemptInfoCacheTTL = 10 * time.Second
const attemptWriteGuardCacheTTL = 10 * time.Second
const saveAnswersResponseCacheTTL = 3 * time.Second
const saveAnswersLatestCacheTTL = 10 * time.Second
const attemptDetailCacheTTL = 5 * time.Second
const attemptDetailPayloadCacheTTL = 5 * time.Second
const attemptReviewCacheTTL = 30 * time.Second
const attemptResultCacheTTL = 30 * time.Second
const defaultExpiredAttemptSweepInterval = 30 * time.Second
const defaultExpiredAttemptSweepBatchSize = 100
const defaultStartAttemptDBTimeout = 800 * time.Millisecond
const submitAttemptStatusTTL = 6 * time.Hour
const submitAttemptStreamMaxLen = 50000
const attemptAnswerBufferTTL = 8 * time.Hour
const defaultAttemptAnswerFlushBatchSize = 100
const defaultAttemptAnswerFlushInterval = 15 * time.Second

const (
	submitAttemptStreamName   = "exam_submit_stream"
	submitAttemptStatusQueued = "submitted_queued"
	submitAttemptStatusDone   = "submitted_done"
	attemptAnswersDirtySetKey = "dirty_attempts"
)

type StartAttemptInput struct {
	UserID string
	ExamID string
}

type StartAttemptResponse struct {
	AttemptID string    `json:"attempt_id"`
	ExamID    string    `json:"exam_id"`
	Status    string    `json:"status"`
	StartedAt time.Time `json:"started_at"`
}

type GetAttemptDetailInput struct {
	UserID    string
	AttemptID string
}

type AttemptUserResponse struct {
	Name     string `json:"name"`
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Role     string `json:"role"`
}

type AttemptQuestionOptionResponse struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type AttemptQuestionExplanationBlockResponse struct {
	BlockType   string                 `json:"block_type"`
	ContentText *string                `json:"content_text,omitempty"`
	ImageURL    *string                `json:"image_url,omitempty"`
	AltText     *string                `json:"alt_text,omitempty"`
	Metadata    map[string]interface{} `json:"metadata,omitempty"`
}

type AttemptQuestionResponse struct {
	QuestionID   string                          `json:"question_id"`
	ParentID     *string                         `json:"parent_id"`
	Content      string                          `json:"content"`
	ImageURL     *string                         `json:"image_url"`
	Options      []AttemptQuestionOptionResponse `json:"options"`
	Type         string                          `json:"type"`
	QuestionType string                          `json:"question_type"`
}

type AttemptReviewQuestionResponse struct {
	QuestionID        string                                    `json:"question_id"`
	ParentID          *string                                   `json:"parent_id"`
	Content           string                                    `json:"content"`
	ImageURL          *string                                   `json:"image_url"`
	Options           []AttemptQuestionOptionResponse           `json:"options"`
	Type              string                                    `json:"type"`
	QuestionType      string                                    `json:"question_type"`
	CorrectAnswer     *string                                   `json:"correct_answer,omitempty"`
	Explanation       *string                                   `json:"explanation,omitempty"`
	ExplanationBlocks []AttemptQuestionExplanationBlockResponse `json:"explanation_blocks,omitempty"`
}

type AttemptDetailResponse struct {
	AttemptID       string                    `json:"attempt_id"`
	Title           string                    `json:"title"`
	DurationMinutes int                       `json:"durationMinutes"`
	DurationSeconds int                       `json:"duration_seconds"`
	Status          string                    `json:"status"`
	StartedAt       time.Time                 `json:"started_at"`
	ServerTime      time.Time                 `json:"server_time"`
	UserAnswers     map[string]string         `json:"user_answers"`
	Questions       []AttemptQuestionResponse `json:"questions"`
	User            AttemptUserResponse       `json:"user"`
}

type SaveAttemptAnswerInput struct {
	QuestionID  string `json:"question_id"`
	SelectedAns string `json:"selected_ans"`
}

type SaveAttemptAnswersInput struct {
	UserID    string
	AttemptID string
	Answers   []SaveAttemptAnswerInput
}

type SaveAttemptAnswerResult struct {
	QuestionID  string `json:"question_id"`
	SelectedAns string `json:"selected_ans"`
}

type SaveAttemptAnswersResponse struct {
	AttemptID     string                    `json:"attempt_id"`
	SavedAt       time.Time                 `json:"saved_at"`
	SavedCount    int                       `json:"saved_count"`
	Answers       []SaveAttemptAnswerResult `json:"answers"`
	Storage       string                    `json:"storage,omitempty"`
	BufferVersion int64                     `json:"buffer_version,omitempty"`
}

type saveAnswersLatestCacheEntry struct {
	PayloadHash string                      `json:"payload_hash"`
	Response    *SaveAttemptAnswersResponse `json:"response"`
}

type SubmitAttemptInput struct {
	UserID    string
	AttemptID string
}

type SubmitAttemptResponse struct {
	AttemptID   string     `json:"attempt_id"`
	Status      string     `json:"status"`
	SubmittedAt *time.Time `json:"submitted_at"`
}

type AttemptResultResponse struct {
	User struct {
		Username string `json:"username"`
		Fullname string `json:"fullname"`
		Email    string `json:"email"`
		Role     string `json:"role"`
	} `json:"user"`
	Exam struct {
		ID        string     `json:"id"`
		Title     string     `json:"title"`
		Type      string     `json:"type"`
		Duration  int        `json:"duration"`
		StartTime *time.Time `json:"start_time,omitempty"`
	} `json:"exam"`
	Room struct {
		ID   string `json:"id"`
		Name string `json:"name"`
	} `json:"room"`
	Result struct {
		Score   string `json:"score"`
		Message string `json:"message"`
		Correct int    `json:"correct"`
		Wrong   int    `json:"wrong"`
		Skipped int    `json:"skipped"`
	} `json:"result"`
}

type AttemptReviewResponse struct {
	Title       string                          `json:"title"`
	Questions   []AttemptReviewQuestionResponse `json:"questions"`
	UserAnswers map[string]string               `json:"userAnswers"`
	User        AttemptUserResponse             `json:"user"`
}

func StartAttempt(ctx context.Context, input StartAttemptInput) (*StartAttemptResponse, error) {
	if input.UserID == "" || input.ExamID == "" {
		return nil, ErrExamNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

	key := fmt.Sprintf("start-attempt:%s:%s", input.UserID, input.ExamID)
	result, err, _ := startAttemptGroup.Do(key, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		policyCtx, cancel := context.WithTimeout(ctx, getStartAttemptDBTimeout())
		examPolicy, err := getCachedExamAttemptPolicy(policyCtx, input.ExamID)
		cancel()
		if err != nil {
			return nil, err
		}
		if examPolicy == nil {
			return nil, ErrExamNotFound
		}
		if err := validateAttemptStartWindow(time.Now().UTC(), examPolicy); err != nil {
			return nil, err
		}
		access, err := GetValidRoomAccess(ctx, input.UserID, examPolicy.RoomID)
		if err != nil {
			return nil, err
		}
		if access == nil {
			return nil, ErrAttemptForbidden
		}
		if usesSingleAttemptExamPolicy(examPolicy.Type) {
			completedAttempt, err := repositories.GetLatestSubmittedAttemptByUserAndExam(ctx, input.UserID, input.ExamID)
			if err != nil {
				return nil, err
			}
			if completedAttempt != nil {
				return nil, ErrExamAlreadyCompleted
			}
		}

		releaseLock, err := acquireStartAttemptLock(ctx, input.UserID, input.ExamID)
		if err != nil {
			return nil, err
		}
		if releaseLock == nil && config.RedisEnabled {
			return nil, ErrStartAttemptBusy
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if err := validateAttemptStartWindow(time.Now().UTC(), examPolicy); err != nil {
			return nil, err
		}
		if usesSingleAttemptExamPolicy(examPolicy.Type) {
			completedAttempt, err := repositories.GetLatestSubmittedAttemptByUserAndExam(ctx, input.UserID, input.ExamID)
			if err != nil {
				return nil, err
			}
			if completedAttempt != nil {
				return nil, ErrExamAlreadyCompleted
			}
		}

		dbCtx, cancel := context.WithTimeout(ctx, getStartAttemptDBTimeout())
		attempt, err := repositories.GetOrCreateInProgressAttempt(dbCtx, input.UserID, input.ExamID)
		cancel()
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, ErrExamNotFound
		}
		if attempt.CreatedNew && attempt.RoomID != "" {
			statsCtx, statsCancel := context.WithTimeout(ctxOrBackground(ctx), 300*time.Millisecond)
			if statsErr := repositories.IncrementRoomAttemptCount(statsCtx, attempt.RoomID); statsErr != nil {
				log.Printf("[WARN] StartAttempt: failed to increment room activity stats for room %s: %v", attempt.RoomID, statsErr)
			}
			statsCancel()
		}

		return &StartAttemptResponse{
			AttemptID: attempt.AttemptID,
			ExamID:    attempt.ExamID,
			Status:    attempt.Status,
			StartedAt: attempt.StartedAt,
		}, nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*StartAttemptResponse), nil
}

func usesSingleAttemptExamPolicy(examType string) bool {
	switch strings.ToLower(strings.TrimSpace(examType)) {
	case "mock_test", "official":
		return true
	default:
		return false
	}
}

func acquireStartAttemptLock(ctx context.Context, userID, examID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "start-attempt-lock:"+userID+":"+examID)
}

func getStartAttemptDBTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("START_ATTEMPT_DB_TIMEOUT_MS"))
	if raw == "" {
		return defaultStartAttemptDBTimeout
	}

	ms, err := strconv.Atoi(raw)
	if err != nil || ms <= 0 {
		return defaultStartAttemptDBTimeout
	}

	return time.Duration(ms) * time.Millisecond
}

func SaveAttemptAnswers(ctx context.Context, input SaveAttemptAnswersInput) (*SaveAttemptAnswersResponse, error) {
	if input.UserID == "" || input.AttemptID == "" || len(input.Answers) == 0 {
		return nil, ErrInvalidAnswerPayload
	}
	if len(input.Answers) > 20 {
		return nil, errors.New("too many answers in one request")
	}
	if ctx == nil {
		ctx = context.Background()
	}

	deduped := make([]repositories.SaveAttemptAnswerInput, 0, len(input.Answers))
	seen := make(map[string]struct{}, len(input.Answers))
	for _, answer := range input.Answers {
		questionID := strings.TrimSpace(answer.QuestionID)
		if questionID == "" {
			return nil, ErrInvalidAnswerPayload
		}

		if _, exists := seen[questionID]; exists {
			continue
		}
		seen[questionID] = struct{}{}

		deduped = append(deduped, repositories.SaveAttemptAnswerInput{
			QuestionID:  questionID,
			SelectedAns: strings.TrimSpace(answer.SelectedAns),
		})
	}

	if len(deduped) == 0 {
		return nil, ErrInvalidAnswerPayload
	}

	slices.SortFunc(deduped, func(a, b repositories.SaveAttemptAnswerInput) int {
		return strings.Compare(a.QuestionID, b.QuestionID)
	})

	attempt, err := getCachedAttemptWriteGuard(ctx, input.AttemptID)
	if err != nil {
		return nil, err
	}
	if attempt == nil {
		return nil, ErrAttemptNotFound
	}
	if attempt.UserID != input.UserID {
		return nil, ErrAttemptForbidden
	}

	if attempt.Status != "in_progress" {
		return nil, ErrAttemptClosed
	}

	payloadHash := hashSaveAnswersPayload(input.UserID, input.AttemptID, deduped)
	latestCacheKey := buildSaveAnswersLatestCacheKey(input.UserID, input.AttemptID)
	if cached, ok := loadSaveAnswersLatestFromCache(ctx, latestCacheKey, payloadHash); ok {
		return cached, nil
	}

	responseCacheKey := buildSaveAnswersResponseCacheKey(payloadHash)
	if cached, ok := loadSaveAnswersResponseFromCache(ctx, responseCacheKey); ok {
		storeSaveAnswersLatestInCache(ctx, latestCacheKey, payloadHash, cached)
		return cached, nil
	}

	saveKey := buildSaveAnswersKey(input.UserID, input.AttemptID, payloadHash)
	result, err, _ := saveAnswersGroup.Do(saveKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if cached, ok := loadSaveAnswersLatestFromCache(ctx, latestCacheKey, payloadHash); ok {
			return cached, nil
		}

		if cached, ok := loadSaveAnswersResponseFromCache(ctx, responseCacheKey); ok {
			storeSaveAnswersLatestInCache(ctx, latestCacheKey, payloadHash, cached)
			return cached, nil
		}

		releaseLock, err := acquireSaveAnswersLock(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		var response *SaveAttemptAnswersResponse
		if config.RedisEnabled && config.RedisClient != nil {
			response, err = saveAttemptAnswersWriteBehind(ctx, input.AttemptID, input.UserID, deduped)
		} else {
			response, err = saveAttemptAnswersDirect(ctx, input.AttemptID, input.UserID, deduped)
		}
		if err != nil {
			return nil, err
		}

		storeSaveAnswersResponseInCache(ctx, responseCacheKey, response)
		storeSaveAnswersLatestInCache(ctx, latestCacheKey, payloadHash, response)

		return response, nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*SaveAttemptAnswersResponse), nil
}

func acquireSaveAnswersLock(ctx context.Context, attemptID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "save-answers-lock:"+attemptID)
}

func acquireFlushAnswersLock(ctx context.Context, attemptID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "flush-answers-lock:"+attemptID)
}

func buildSaveAnswersKey(userID, attemptID, payloadHash string) string {
	return "save-answers:" + userID + ":" + attemptID + ":" + payloadHash
}

func buildSaveAnswersResponseCacheKey(payloadHash string) string {
	return "save-answers-response:" + payloadHash
}

func buildSaveAnswersLatestCacheKey(userID, attemptID string) string {
	return "save-answers-latest:" + userID + ":" + attemptID
}

func hashSaveAnswersPayload(userID, attemptID string, answers []repositories.SaveAttemptAnswerInput) string {
	hasher := fnv.New64a()
	_, _ = hasher.Write([]byte(userID))
	_, _ = hasher.Write([]byte{0})
	_, _ = hasher.Write([]byte(attemptID))
	_, _ = hasher.Write([]byte{0})

	for _, answer := range answers {
		_, _ = hasher.Write([]byte(answer.QuestionID))
		_, _ = hasher.Write([]byte{0})
		_, _ = hasher.Write([]byte(answer.SelectedAns))
		_, _ = hasher.Write([]byte{0})
	}

	return fmt.Sprintf("%x", hasher.Sum64())
}

func saveAttemptAnswersDirect(
	ctx context.Context,
	attemptID string,
	userID string,
	deduped []repositories.SaveAttemptAnswerInput,
) (*SaveAttemptAnswersResponse, error) {
	resolvedResult, err := repositories.ResolveAttemptAnswersAuthorized(ctx, attemptID, userID, deduped)
	if err != nil {
		return nil, err
	}
	if !resolvedResult.AttemptExists {
		return nil, ErrAttemptNotFound
	}
	if !resolvedResult.IsOwner {
		return nil, ErrAttemptForbidden
	}
	if !resolvedResult.CanWrite {
		return nil, ErrAttemptClosed
	}
	if len(resolvedResult.Rows) != len(deduped) {
		return nil, ErrInvalidAnswerPayload
	}

	changedRows := make([]repositories.ResolvedAttemptAnswerRow, 0, len(resolvedResult.Rows))
	results := make([]SaveAttemptAnswerResult, 0, len(resolvedResult.Rows))
	for _, item := range resolvedResult.Rows {
		results = append(results, SaveAttemptAnswerResult{
			QuestionID:  item.QuestionID,
			SelectedAns: item.SelectedAns,
		})
		if item.ExistingSelectedAns != item.SelectedAns {
			changedRows = append(changedRows, item)
		}
	}

	if len(changedRows) > 0 {
		savedResult, err := repositories.ApplyAttemptAnswerChangesAuthorized(ctx, attemptID, userID, changedRows)
		if err != nil {
			return nil, err
		}
		if !savedResult.AttemptExists {
			return nil, ErrAttemptNotFound
		}
		if !savedResult.IsOwner {
			return nil, ErrAttemptForbidden
		}
		if !savedResult.CanWrite {
			return nil, ErrAttemptClosed
		}
		if len(savedResult.Rows) != len(changedRows) {
			return nil, ErrInvalidAnswerPayload
		}

		invalidateAttemptDetailCache(userID, attemptID)
		invalidateAttemptDetailPayloadCache(userID, attemptID)
		invalidateAttemptReviewCache(userID, attemptID)
		invalidateAttemptResultCache(userID, attemptID)
	}

	return &SaveAttemptAnswersResponse{
		AttemptID:  attemptID,
		SavedAt:    time.Now().UTC(),
		SavedCount: len(results),
		Answers:    results,
	}, nil
}

func saveAttemptAnswersWriteBehind(
	ctx context.Context,
	attemptID string,
	userID string,
	deduped []repositories.SaveAttemptAnswerInput,
) (*SaveAttemptAnswersResponse, error) {
	attempt, err := getCachedAttemptInfo(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if attempt == nil {
		return nil, ErrAttemptNotFound
	}
	if attempt.UserID != userID {
		return nil, ErrAttemptForbidden
	}
	if attempt.Status != "in_progress" {
		return nil, ErrAttemptClosed
	}
	if status, ok, err := getAttemptSubmitStatus(ctx, attemptID); err != nil {
		return nil, err
	} else if ok && (status == submitAttemptStatusQueued || status == submitAttemptStatusDone) {
		return nil, ErrAttemptClosed
	}

	if err := validateAttemptAnswerQuestions(ctx, attempt.ExamID, deduped); err != nil {
		return nil, err
	}

	bufferVersion, err := enqueueAttemptAnswerBuffer(ctx, attemptID, deduped)
	if err != nil {
		return nil, err
	}

	results := make([]SaveAttemptAnswerResult, 0, len(deduped))
	for _, item := range deduped {
		results = append(results, SaveAttemptAnswerResult{
			QuestionID:  item.QuestionID,
			SelectedAns: item.SelectedAns,
		})
	}

	return &SaveAttemptAnswersResponse{
		AttemptID:     attemptID,
		SavedAt:       time.Now().UTC(),
		SavedCount:    len(results),
		Answers:       results,
		Storage:       "buffered",
		BufferVersion: bufferVersion,
	}, nil
}

func validateAttemptAnswerQuestions(ctx context.Context, examID string, answers []repositories.SaveAttemptAnswerInput) error {
	questions, err := getCachedAttemptQuestions(ctx, examID)
	if err != nil {
		return err
	}

	questionSet := make(map[string]struct{}, len(questions))
	for _, question := range questions {
		questionSet[question.QuestionID] = struct{}{}
	}

	for _, answer := range answers {
		if _, ok := questionSet[answer.QuestionID]; !ok {
			log.Printf("[WARN] validateAttemptAnswerQuestions: questionID %q not in exam %q (set size=%d)", answer.QuestionID, examID, len(questionSet))
			return ErrInvalidAnswerPayload
		}
	}

	return nil
}

func enqueueAttemptAnswerBuffer(ctx context.Context, attemptID string, answers []repositories.SaveAttemptAnswerInput) (int64, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return 0, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	bufferKey := buildAttemptAnswersBufferKey(attemptID)
	versionKey := buildAttemptAnswersVersionKey(attemptID)
	values := make(map[string]interface{}, len(answers))
	for _, answer := range answers {
		values[answer.QuestionID] = answer.SelectedAns
	}

	pipe := config.RedisClient.TxPipeline()
	pipe.HSet(redisCtx, bufferKey, values)
	pipe.Expire(redisCtx, bufferKey, attemptAnswerBufferTTL)
	versionCmd := pipe.Incr(redisCtx, versionKey)
	pipe.Expire(redisCtx, versionKey, attemptAnswerBufferTTL)
	pipe.SAdd(redisCtx, attemptAnswersDirtySetKey, attemptID)
	_, err := pipe.Exec(redisCtx)
	if err != nil {
		return 0, err
	}

	return versionCmd.Val(), nil
}

func SubmitAttempt(ctx context.Context, input SubmitAttemptInput) (*SubmitAttemptResponse, error) {
	if input.UserID == "" || input.AttemptID == "" {
		return nil, ErrAttemptNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

	if !config.RedisEnabled || config.RedisClient == nil {
		return submitAttemptSync(ctx, input)
	}

	if status, ok, err := getAttemptSubmitStatus(ctx, input.AttemptID); err != nil {
		return nil, err
	} else if ok {
		if status == submitAttemptStatusDone {
			attempt, attemptErr := getCachedAttemptInfo(ctx, input.AttemptID)
			if attemptErr != nil {
				return nil, attemptErr
			}
			if attempt == nil {
				return nil, ErrAttemptNotFound
			}
			if attempt.UserID != input.UserID {
				return nil, ErrAttemptForbidden
			}
			if pending, pendingErr := hasPendingAttemptAnswerBuffer(ctx, input.AttemptID); pendingErr != nil {
				return nil, pendingErr
			} else if pending || attempt.Status != "submitted" {
				log.Printf("[WARN] SubmitAttempt found stale done status attempt_id=%s user_id=%s db_status=%s pending=%t", input.AttemptID, input.UserID, attempt.Status, pending)
				clearAttemptSubmitStatus(ctx, input.AttemptID)
			} else {
				return buildSubmitAttemptStatusResponse(input.AttemptID, status), nil
			}
		} else {
			return buildSubmitAttemptStatusResponse(input.AttemptID, status), nil
		}
	}

	attempt, err := getCachedAttemptInfo(ctx, input.AttemptID)
	if err != nil {
		return nil, err
	}
	if attempt == nil {
		return nil, ErrAttemptNotFound
	}
	if attempt.UserID != input.UserID {
		return nil, ErrAttemptForbidden
	}
	switch attempt.Status {
	case "in_progress":
		// continue
	case "submitted":
		log.Printf("[INFO] SubmitAttempt finalizing already submitted attempt attempt_id=%s user_id=%s", input.AttemptID, input.UserID)
		if err := setAttemptSubmitStatus(ctx, input.AttemptID, submitAttemptStatusQueued); err != nil {
			return nil, err
		}
		finalizeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		finalizeErr := FinalizeQueuedSubmitAttempt(finalizeCtx, input.UserID, input.AttemptID)
		cancel()
		if finalizeErr == nil {
			return buildSubmitAttemptStatusResponse(input.AttemptID, submitAttemptStatusDone), nil
		}
		log.Printf("[WARN] SubmitAttempt finalize already submitted failed attempt_id=%s user_id=%s err=%v", input.AttemptID, input.UserID, finalizeErr)
		return buildSubmitAttemptStatusResponse(input.AttemptID, submitAttemptStatusQueued), nil
	default:
		return nil, ErrAttemptClosed
	}

	queued, err := setAttemptSubmitStatusNX(ctx, input.AttemptID, submitAttemptStatusQueued)
	if err != nil {
		return nil, err
	}
	if !queued {
		if status, ok, err := getAttemptSubmitStatus(ctx, input.AttemptID); err == nil && ok {
			return buildSubmitAttemptStatusResponse(input.AttemptID, status), nil
		}
		return buildSubmitAttemptStatusResponse(input.AttemptID, submitAttemptStatusQueued), nil
	}

	if err := setAttemptPostSubmitFlushAllowed(ctx, input.AttemptID); err != nil {
		clearAttemptSubmitStatus(ctx, input.AttemptID)
		return nil, err
	}

	if err := enqueueSubmitAttempt(ctx, input.UserID, input.AttemptID); err != nil {
		clearAttemptSubmitStatus(ctx, input.AttemptID)
		return nil, err
	}

	// Fast-path finalize to avoid long "processing" loops under light load.
	finalizeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	finalizeErr := FinalizeQueuedSubmitAttempt(finalizeCtx, input.UserID, input.AttemptID)
	cancel()
	if finalizeErr == nil {
		return buildSubmitAttemptStatusResponse(input.AttemptID, submitAttemptStatusDone), nil
	}

	log.Printf("[WARN] SubmitAttempt fast finalize failed for %s: %v", input.AttemptID, finalizeErr)

	return buildSubmitAttemptStatusResponse(input.AttemptID, submitAttemptStatusQueued), nil
}

func acquireSubmitAttemptLock(ctx context.Context, attemptID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "submit-attempt-lock:"+attemptID)
}

func submitAttemptSync(ctx context.Context, input SubmitAttemptInput) (*SubmitAttemptResponse, error) {
	key := fmt.Sprintf("submit-attempt:%s:%s", input.UserID, input.AttemptID)
	result, err, _ := submitAttemptGroup.Do(key, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		releaseLock, err := acquireSubmitAttemptLock(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		submitResult, err := repositories.SubmitAttemptAuthorized(ctx, input.AttemptID, input.UserID)
		if err != nil {
			return nil, err
		}
		if !submitResult.AttemptExists {
			return nil, ErrAttemptNotFound
		}
		if !submitResult.IsOwner {
			return nil, ErrAttemptForbidden
		}
		switch submitResult.Status {
		case "in_progress", "submitted":
			if submitResult.Summary == nil {
				return nil, ErrAttemptNotFound
			}

			if _, err := calculateAndPersistAttemptMarks(ctx, input.AttemptID); err != nil {
				return nil, err
			}

			invalidateAttemptInfoCache(input.AttemptID)
			invalidateAttemptWriteGuardCache(input.AttemptID)
			invalidateAttemptDetailCache(input.UserID, input.AttemptID)
			invalidateAttemptDetailPayloadCache(input.UserID, input.AttemptID)
			invalidateAttemptReviewCache(input.UserID, input.AttemptID)
			invalidateAttemptResultCache(input.UserID, input.AttemptID)
			invalidateAttemptHistoryCachesForUser(ctx, input.UserID)
			invalidateRoomExamCachesForUser(ctx, input.UserID)
			WarmAttemptHistoryFirstPage(ctx, input.UserID)
			warmRoomExamCacheAfterSubmit(ctx, input.UserID, input.AttemptID)

			return &SubmitAttemptResponse{
				AttemptID:   submitResult.Summary.AttemptID,
				Status:      submitResult.Summary.Status,
				SubmittedAt: submitResult.Summary.SubmittedAt,
			}, nil
		default:
			return nil, ErrAttemptClosed
		}
	})
	if err != nil {
		return nil, err
	}

	return result.(*SubmitAttemptResponse), nil
}

func buildSubmitAttemptStatusResponse(attemptID, status string) *SubmitAttemptResponse {
	return &SubmitAttemptResponse{
		AttemptID: attemptID,
		Status:    status,
	}
}

func SubmitAttemptStreamName() string {
	return submitAttemptStreamName
}

func buildAttemptSubmitStatusKey(attemptID string) string {
	return "attempt-status:" + attemptID
}

func buildAttemptPostSubmitFlushKey(attemptID string) string {
	return "attempt-post-submit-flush:" + attemptID
}

func buildAttemptAnswersBufferKey(attemptID string) string {
	return "attempt-answers-buffer:" + attemptID
}

func buildAttemptAnswersFlushingKey(attemptID string) string {
	return "attempt-answers-flushing:" + attemptID
}

func buildAttemptAnswersFlushingVersionKey(attemptID string) string {
	return "attempt-answers-flushing-version:" + attemptID
}

func buildAttemptAnswersVersionKey(attemptID string) string {
	return "attempt-answers-version:" + attemptID
}

func buildAttemptAnswersFlushedAtKey(attemptID string) string {
	return "attempt-answers-flushed-at:" + attemptID
}

func buildAttemptAnswersFlushedVersionKey(attemptID string) string {
	return "attempt-answers-flushed-version:" + attemptID
}

func getAttemptSubmitStatus(ctx context.Context, attemptID string) (string, bool, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return "", false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	value, err := config.RedisClient.Get(redisCtx, buildAttemptSubmitStatusKey(attemptID)).Result()
	if err == redis.Nil {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}

	return value, true, nil
}

func setAttemptSubmitStatus(ctx context.Context, attemptID, status string) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	return config.RedisClient.Set(redisCtx, buildAttemptSubmitStatusKey(attemptID), status, submitAttemptStatusTTL).Err()
}

func setAttemptPostSubmitFlushAllowed(ctx context.Context, attemptID string) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	return config.RedisClient.Set(redisCtx, buildAttemptPostSubmitFlushKey(attemptID), "1", submitAttemptStatusTTL).Err()
}

func isAttemptPostSubmitFlushAllowed(ctx context.Context, attemptID string) (bool, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	exists, err := config.RedisClient.Exists(redisCtx, buildAttemptPostSubmitFlushKey(attemptID)).Result()
	if err != nil {
		return false, err
	}

	return exists > 0, nil
}

func setAttemptSubmitStatusNX(ctx context.Context, attemptID, status string) (bool, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	return config.RedisClient.SetNX(redisCtx, buildAttemptSubmitStatusKey(attemptID), status, submitAttemptStatusTTL).Result()
}

func clearAttemptSubmitStatus(ctx context.Context, attemptID string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Del(redisCtx, buildAttemptSubmitStatusKey(attemptID), buildAttemptPostSubmitFlushKey(attemptID)).Err()
}

func ClearAttemptSubmitStatus(ctx context.Context, attemptID string) {
	clearAttemptSubmitStatus(ctx, attemptID)
}

func hasPendingAttemptAnswerBuffer(ctx context.Context, attemptID string) (bool, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	count, err := config.RedisClient.Exists(
		redisCtx,
		buildAttemptAnswersBufferKey(attemptID),
		buildAttemptAnswersFlushingKey(attemptID),
	).Result()
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func logAttemptAnswerBufferState(ctx context.Context, label, attemptID, userID string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	bufferKey := buildAttemptAnswersBufferKey(attemptID)
	flushingKey := buildAttemptAnswersFlushingKey(attemptID)
	versionKey := buildAttemptAnswersVersionKey(attemptID)
	flushedVersionKey := buildAttemptAnswersFlushedVersionKey(attemptID)
	bufferCount, bufferErr := config.RedisClient.HLen(redisCtx, bufferKey).Result()
	flushingCount, flushingErr := config.RedisClient.HLen(redisCtx, flushingKey).Result()
	version, versionErr := config.RedisClient.Get(redisCtx, versionKey).Result()
	if errors.Is(versionErr, redis.Nil) {
		version = "0"
		versionErr = nil
	}
	flushedVersion, flushedVersionErr := config.RedisClient.Get(redisCtx, flushedVersionKey).Result()
	if errors.Is(flushedVersionErr, redis.Nil) {
		flushedVersion = "0"
		flushedVersionErr = nil
	}

	log.Printf(
		"[INFO] attempt answer buffer state label=%s attempt_id=%s user_id=%s buffer_count=%d flushing_count=%d version=%s flushed_version=%s buffer_err=%v flushing_err=%v version_err=%v flushed_version_err=%v",
		label,
		attemptID,
		userID,
		bufferCount,
		flushingCount,
		version,
		flushedVersion,
		bufferErr,
		flushingErr,
		versionErr,
		flushedVersionErr,
	)
}

func enqueueSubmitAttempt(ctx context.Context, userID, attemptID string) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	return config.RedisClient.XAdd(redisCtx, &redis.XAddArgs{
		Stream: submitAttemptStreamName,
		MaxLen: submitAttemptStreamMaxLen,
		Approx: true,
		Values: map[string]interface{}{
			"user_id":    userID,
			"attempt_id": attemptID,
		},
	}).Err()
}

func FlushDirtyAttemptAnswers(ctx context.Context, limit int) (int, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return 0, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}
	if limit <= 0 {
		limit = defaultAttemptAnswerFlushBatchSize
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	attemptIDs, err := config.RedisClient.SPopN(redisCtx, attemptAnswersDirtySetKey, int64(limit)).Result()
	if errors.Is(err, redis.Nil) {
		return 0, nil
	}
	if err != nil {
		return 0, err
	}
	if len(attemptIDs) == 0 {
		return 0, nil
	}

	flushed := 0
	for _, attemptID := range attemptIDs {
		if strings.TrimSpace(attemptID) == "" {
			continue
		}

		attempt, err := getCachedAttemptInfo(ctx, attemptID)
		if err != nil {
			requeueDirtyAttempt(ctx, attemptID)
			continue
		}
		if attempt == nil {
			clearAttemptAnswerBuffer(ctx, attemptID)
			continue
		}

		didFlush, err := flushAttemptAnswerBufferOnce(ctx, attemptID, attempt.UserID)
		if err == nil {
			if didFlush {
				flushed++
			}
			continue
		}

		if errors.Is(err, ErrAttemptClosed) {
			requeueDirtyAttempt(ctx, attemptID)
			continue
		}

		if errors.Is(err, ErrAttemptNotFound) || errors.Is(err, ErrAttemptForbidden) || errors.Is(err, ErrInvalidAnswerPayload) {
			clearAttemptAnswerBuffer(ctx, attemptID)
			continue
		}

		requeueDirtyAttempt(ctx, attemptID)
	}

	return flushed, nil
}

func FlushAttemptAnswersForAttempt(ctx context.Context, attemptID, userID string) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	return drainAttemptAnswerBuffer(ctx, attemptID, userID)
}

func drainAttemptAnswerBuffer(ctx context.Context, attemptID, userID string) error {
	for pass := 0; pass < 20; pass++ {
		flushed, err := flushAttemptAnswerBufferOnce(ctx, attemptID, userID)
		if err != nil {
			return err
		}
		if !flushed {
			return nil
		}
	}

	requeueDirtyAttempt(ctx, attemptID)
	return ErrAttemptProcessing
}

func flushAttemptAnswerBufferOnce(ctx context.Context, attemptID, userID string) (bool, error) {
	releaseLock, err := acquireFlushAnswersLock(ctx, attemptID)
	if err != nil {
		return false, err
	}
	if releaseLock == nil && config.RedisEnabled {
		requeueDirtyAttempt(ctx, attemptID)
		return false, ErrAttemptProcessing
	}
	if releaseLock != nil {
		defer releaseLock()
	}

	claimedKey, claimedVersion, claimed, err := claimAttemptAnswerBuffer(ctx, attemptID)
	if err != nil {
		return false, err
	}
	if !claimed {
		return false, nil
	}

	bufferedAnswers, err := getBufferedAttemptAnswers(ctx, claimedKey)
	if err != nil {
		mergeClaimedAttemptAnswersBack(ctx, attemptID, claimedKey)
		return false, err
	}
	if len(bufferedAnswers) == 0 {
		clearClaimedAttemptAnswerBuffer(ctx, attemptID, claimedKey)
		setAttemptAnswerFlushedVersion(ctx, attemptID, claimedVersion)
		return true, nil
	}

	allowPostSubmitFlush, err := isAttemptPostSubmitFlushAllowed(ctx, attemptID)
	if err != nil {
		mergeClaimedAttemptAnswersBack(ctx, attemptID, claimedKey)
		return false, err
	}

	savedResult, err := repositories.UpsertAttemptAnswersAuthorized(ctx, attemptID, userID, bufferedAnswers, allowPostSubmitFlush)
	if err != nil {
		mergeClaimedAttemptAnswersBack(ctx, attemptID, claimedKey)
		return false, err
	}
	if !savedResult.AttemptExists {
		clearClaimedAttemptAnswerBuffer(ctx, attemptID, claimedKey)
		return false, ErrAttemptNotFound
	}
	if !savedResult.IsOwner {
		clearClaimedAttemptAnswerBuffer(ctx, attemptID, claimedKey)
		return false, ErrAttemptForbidden
	}
	if !savedResult.CanWrite {
		mergeClaimedAttemptAnswersBack(ctx, attemptID, claimedKey)
		log.Printf("[WARN] flushAttemptAnswerBufferOnce cannot write attempt_id=%s user_id=%s answer_count=%d version=%d payload_count=%d resolved_count=%d upserted_count=%d saved_rows=%d", attemptID, userID, len(bufferedAnswers), claimedVersion, savedResult.PayloadCount, savedResult.ResolvedCount, savedResult.UpsertedCount, len(savedResult.Rows))
		return false, ErrAttemptClosed
	}
	if savedResult.PayloadCount != len(bufferedAnswers) ||
		savedResult.ResolvedCount != len(bufferedAnswers) ||
		len(savedResult.Rows) != len(bufferedAnswers) {
		mergeClaimedAttemptAnswersBack(ctx, attemptID, claimedKey)
		log.Printf("[WARN] flushAttemptAnswerBufferOnce incomplete write attempt_id=%s user_id=%s answer_count=%d version=%d payload_count=%d resolved_count=%d upserted_count=%d saved_rows=%d", attemptID, userID, len(bufferedAnswers), claimedVersion, savedResult.PayloadCount, savedResult.ResolvedCount, savedResult.UpsertedCount, len(savedResult.Rows))
		return false, ErrAttemptProcessing
	}
	clearClaimedAttemptAnswerBuffer(ctx, attemptID, claimedKey)
	setAttemptAnswerFlushedAt(ctx, attemptID)
	setAttemptAnswerFlushedVersion(ctx, attemptID, claimedVersion)
	invalidateAttemptDetailCache(userID, attemptID)
	invalidateAttemptDetailPayloadCache(userID, attemptID)
	invalidateAttemptReviewCache(userID, attemptID)
	invalidateAttemptResultCache(userID, attemptID)

	return true, nil
}

func claimAttemptAnswerBuffer(ctx context.Context, attemptID string) (string, int64, bool, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return "", 0, false, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	bufferKey := buildAttemptAnswersBufferKey(attemptID)
	flushingKey := buildAttemptAnswersFlushingKey(attemptID)
	flushingVersionKey := buildAttemptAnswersFlushingVersionKey(attemptID)
	versionKey := buildAttemptAnswersVersionKey(attemptID)
	const claimScript = `
if redis.call("EXISTS", KEYS[2]) == 1 then
	return {1, redis.call("GET", KEYS[3]) or "0"}
end
if redis.call("EXISTS", KEYS[1]) == 0 then
	return {0, redis.call("GET", KEYS[4]) or "0"}
end
local version = redis.call("GET", KEYS[4]) or "0"
redis.call("RENAME", KEYS[1], KEYS[2])
redis.call("EXPIRE", KEYS[2], ARGV[1])
redis.call("SET", KEYS[3], version, "EX", ARGV[1])
return {1, version}
`

	raw, err := config.RedisClient.Eval(redisCtx, claimScript, []string{bufferKey, flushingKey, flushingVersionKey, versionKey}, int(attemptAnswerBufferTTL.Seconds())).Result()
	if err != nil {
		return "", 0, false, err
	}

	values, ok := raw.([]interface{})
	if !ok || len(values) < 2 {
		return "", 0, false, errors.New("invalid Redis claim buffer response")
	}

	claimed, err := redisInt(values[0])
	if err != nil {
		return "", 0, false, err
	}
	version, err := redisInt(values[1])
	if err != nil {
		return "", 0, false, err
	}

	return flushingKey, version, claimed == 1, nil
}

func getBufferedAttemptAnswers(ctx context.Context, bufferKey string) ([]repositories.SaveAttemptAnswerInput, error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	values, err := config.RedisClient.HGetAll(redisCtx, bufferKey).Result()
	if err != nil {
		return nil, err
	}
	if len(values) == 0 {
		return nil, nil
	}

	answers := make([]repositories.SaveAttemptAnswerInput, 0, len(values))
	for questionID, selectedAns := range values {
		answers = append(answers, repositories.SaveAttemptAnswerInput{
			QuestionID:  questionID,
			SelectedAns: selectedAns,
		})
	}
	slices.SortFunc(answers, func(a, b repositories.SaveAttemptAnswerInput) int {
		return strings.Compare(a.QuestionID, b.QuestionID)
	})

	return answers, nil
}

func clearAttemptAnswerBuffer(ctx context.Context, attemptID string) {
	clearAttemptAnswerBufferKey(ctx, buildAttemptAnswersBufferKey(attemptID))
}

func clearAttemptAnswerBufferKey(ctx context.Context, bufferKey string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Del(redisCtx, bufferKey).Err()
}

func clearClaimedAttemptAnswerBuffer(ctx context.Context, attemptID, flushingKey string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Del(redisCtx, flushingKey, buildAttemptAnswersFlushingVersionKey(attemptID)).Err()
}

func mergeClaimedAttemptAnswersBack(ctx context.Context, attemptID, flushingKey string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	bufferKey := buildAttemptAnswersBufferKey(attemptID)
	const mergeScript = `
local values = redis.call("HGETALL", KEYS[2])
for i = 1, #values, 2 do
	redis.call("HSETNX", KEYS[1], values[i], values[i + 1])
end
if #values > 0 then
	redis.call("EXPIRE", KEYS[1], ARGV[1])
	redis.call("SADD", KEYS[3], ARGV[2])
end
redis.call("DEL", KEYS[2])
redis.call("DEL", KEYS[4])
return #values / 2
`
	_ = config.RedisClient.Eval(redisCtx, mergeScript, []string{bufferKey, flushingKey, attemptAnswersDirtySetKey, buildAttemptAnswersFlushingVersionKey(attemptID)}, int(attemptAnswerBufferTTL.Seconds()), attemptID).Err()
	log.Printf("[WARN] mergeClaimedAttemptAnswersBack attempt_id=%s flushing_key=%s", attemptID, flushingKey)
}

func setAttemptAnswerFlushedAt(ctx context.Context, attemptID string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Set(redisCtx, buildAttemptAnswersFlushedAtKey(attemptID), strconv.FormatInt(time.Now().UTC().Unix(), 10), attemptAnswerBufferTTL).Err()
}

func setAttemptAnswerFlushedVersion(ctx context.Context, attemptID string, version int64) {
	if !config.RedisEnabled || config.RedisClient == nil || version <= 0 {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Set(redisCtx, buildAttemptAnswersFlushedVersionKey(attemptID), strconv.FormatInt(version, 10), attemptAnswerBufferTTL).Err()
}

func redisInt(value interface{}) (int64, error) {
	switch v := value.(type) {
	case int64:
		return v, nil
	case string:
		return strconv.ParseInt(v, 10, 64)
	case []byte:
		return strconv.ParseInt(string(v), 10, 64)
	default:
		return 0, fmt.Errorf("unexpected Redis integer type %T", value)
	}
}

func requeueDirtyAttempt(ctx context.Context, attemptID string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.SAdd(redisCtx, attemptAnswersDirtySetKey, attemptID).Err()
}

func GetAttemptAnswerFlushInterval() time.Duration {
	raw := strings.TrimSpace(os.Getenv("ATTEMPT_ANSWER_FLUSH_INTERVAL_SECONDS"))
	if raw == "" {
		return defaultAttemptAnswerFlushInterval
	}

	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds < 0 {
		return defaultAttemptAnswerFlushInterval
	}
	if seconds == 0 {
		return 0
	}

	return time.Duration(seconds) * time.Second
}

func GetAttemptAnswerFlushBatchSize() int {
	raw := strings.TrimSpace(os.Getenv("ATTEMPT_ANSWER_FLUSH_BATCH_SIZE"))
	if raw == "" {
		return defaultAttemptAnswerFlushBatchSize
	}

	size, err := strconv.Atoi(raw)
	if err != nil || size <= 0 {
		return defaultAttemptAnswerFlushBatchSize
	}

	return size
}

func FinalizeQueuedSubmitAttempt(ctx context.Context, userID, attemptID string) error {
	if ctx == nil {
		ctx = context.Background()
	}

	releaseLock, err := acquireSubmitAttemptLock(ctx, attemptID)
	if err != nil {
		return err
	}
	if releaseLock == nil && config.RedisEnabled {
		log.Printf("[INFO] FinalizeQueuedSubmitAttempt busy attempt_id=%s user_id=%s", attemptID, userID)
		return ErrAttemptProcessing
	}
	if releaseLock != nil {
		defer releaseLock()
	}

	logAttemptAnswerBufferState(ctx, "finalize-start", attemptID, userID)
	if err := setAttemptPostSubmitFlushAllowed(ctx, attemptID); err != nil {
		return err
	}

	if err := FlushAttemptAnswersForAttempt(ctx, attemptID, userID); err != nil {
		logAttemptAnswerBufferState(ctx, "finalize-flush-failed", attemptID, userID)
		return err
	}
	logAttemptAnswerBufferState(ctx, "finalize-after-flush", attemptID, userID)

	submitResult, err := repositories.SubmitAttemptAuthorized(ctx, attemptID, userID)
	if err != nil {
		return err
	}
	if !submitResult.AttemptExists {
		return ErrAttemptNotFound
	}
	if !submitResult.IsOwner {
		return ErrAttemptForbidden
	}
	switch submitResult.Status {
	case "in_progress", "submitted":
		_, err := calculateAndPersistAttemptMarks(ctx, attemptID)
		if err != nil {
			return err
		}

		invalidateAttemptInfoCache(attemptID)
		invalidateAttemptWriteGuardCache(attemptID)
		invalidateAttemptDetailCache(userID, attemptID)
		invalidateAttemptDetailPayloadCache(userID, attemptID)
		invalidateAttemptReviewCache(userID, attemptID)
		invalidateAttemptResultCache(userID, attemptID)
		invalidateAttemptHistoryCachesForUser(ctx, userID)
		invalidateRoomExamCachesForUser(ctx, userID)
		WarmAttemptHistoryFirstPage(ctx, userID)
		warmRoomExamCacheAfterSubmit(ctx, userID, attemptID)
		clearAttemptSubmitStatus(ctx, attemptID)
		_ = setAttemptSubmitStatus(ctx, attemptID, submitAttemptStatusDone)
		return nil
	default:
		return ErrAttemptClosed
	}
}

func StartExpiredAttemptAutoSubmitter(ctx context.Context) {
	interval := getExpiredAttemptSweepInterval()
	if interval <= 0 {
		log.Println("attempt auto-submit worker disabled")
		return
	}

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		runExpiredAttemptSweep(ctx)
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runExpiredAttemptSweep(ctx)
			}
		}
	}()
}

func runExpiredAttemptSweep(parent context.Context) {
	batchSize := getExpiredAttemptSweepBatchSize()
	for {
		sweepCtx, cancel := context.WithTimeout(ctxOrBackground(parent), 5*time.Second)
		rows, err := repositories.AutoSubmitExpiredAttempts(sweepCtx, batchSize)
		cancel()
		if err != nil {
			log.Printf("attempt auto-submit worker failed: %v", err)
			return
		}
		if len(rows) == 0 {
			return
		}

		for _, row := range rows {
			log.Printf("[INFO] attempt auto-submit worker finalizing attempt_id=%s user_id=%s", row.AttemptID, row.UserID)
			invalidateAttemptCachesForUser(row.UserID, row.AttemptID)
			if err := setAttemptPostSubmitFlushAllowed(ctxOrBackground(parent), row.AttemptID); err != nil {
				log.Printf("[WARN] attempt auto-submit worker cannot enable post-submit flush for %s: %v", row.AttemptID, err)
				continue
			}

			if flushErr := FlushAttemptAnswersForAttempt(ctxOrBackground(parent), row.AttemptID, row.UserID); flushErr != nil {
				log.Printf("[WARN] attempt auto-submit worker flush failed for %s: %v", row.AttemptID, flushErr)
				continue
			}

			if _, err := calculateAndPersistAttemptMarks(ctxOrBackground(parent), row.AttemptID); err != nil {
				log.Printf("[WARN] attempt auto-submit worker cannot persist marks for %s: %v", row.AttemptID, err)
				continue
			}

			invalidateAttemptHistoryCachesForUser(ctxOrBackground(parent), row.UserID)
			invalidateRoomExamCachesForUser(ctxOrBackground(parent), row.UserID)
			WarmAttemptHistoryFirstPage(ctxOrBackground(parent), row.UserID)
			clearAttemptSubmitStatus(ctxOrBackground(parent), row.AttemptID)
			_ = setAttemptSubmitStatus(ctxOrBackground(parent), row.AttemptID, submitAttemptStatusDone)
		}

		log.Printf("attempt auto-submit worker finalized %d expired attempt(s)", len(rows))
		if len(rows) < batchSize {
			return
		}
	}
}

func getExpiredAttemptSweepInterval() time.Duration {
	raw := strings.TrimSpace(os.Getenv("ATTEMPT_AUTO_SUBMIT_SWEEP_INTERVAL_SECONDS"))
	if raw == "" {
		return defaultExpiredAttemptSweepInterval
	}

	seconds, err := strconv.Atoi(raw)
	if err != nil || seconds < 0 {
		return defaultExpiredAttemptSweepInterval
	}
	if seconds == 0 {
		return 0
	}

	return time.Duration(seconds) * time.Second
}

func getExpiredAttemptSweepBatchSize() int {
	raw := strings.TrimSpace(os.Getenv("ATTEMPT_AUTO_SUBMIT_SWEEP_BATCH_SIZE"))
	if raw == "" {
		return defaultExpiredAttemptSweepBatchSize
	}

	size, err := strconv.Atoi(raw)
	if err != nil || size <= 0 {
		return defaultExpiredAttemptSweepBatchSize
	}

	return size
}

func acquireRedisLockWithRetry(ctx context.Context, lockKey string) (func(), error) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, nil
	}

	lockValue := uuid.NewString()
	lockTTL := 5 * time.Second
	retryDelay := 100 * time.Millisecond

	for attempt := 0; attempt < 5; attempt++ {
		acquired, err := config.RedisClient.SetNX(ctx, lockKey, lockValue, lockTTL).Result()
		if err != nil {
			// Redis unreachable — degrade gracefully, skip locking
			log.Printf("[WARN] acquireRedisLockWithRetry: Redis unavailable for key %q: %v", lockKey, err)
			return nil, nil
		}
		if acquired {
			return func() {
				releaseCtx, cancel := context.WithTimeout(context.Background(), time.Second)
				defer cancel()

				const releaseScript = `
if redis.call("GET", KEYS[1]) == ARGV[1] then
	return redis.call("DEL", KEYS[1])
end
return 0
`
				_ = config.RedisClient.Eval(releaseCtx, releaseScript, []string{lockKey}, lockValue).Err()
			}, nil
		}

		timer := time.NewTimer(retryDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil, ctx.Err()
		case <-timer.C:
		}
	}

	return nil, nil
}

func GetAttemptDetail(ctx context.Context, input GetAttemptDetailInput) (*AttemptDetailResponse, error) {
	return buildAttemptDetailResponse(ctx, input)
}

func GetAttemptDetailPayload(ctx context.Context, input GetAttemptDetailInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildAttemptDetailPayloadCacheKey(input.UserID, input.AttemptID)
	if payload, ok := loadAttemptDetailPayloadFromCache(ctx, cacheKey); ok {
		return payload, nil
	}

	result, err, _ := attemptDetailGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if payload, ok := loadAttemptDetailPayloadFromCache(ctx, cacheKey); ok {
			return payload, nil
		}

		detail, err := buildAttemptDetailResponse(ctx, input)
		if err != nil {
			return nil, err
		}

		payload, err := json.Marshal(utils.SuccessResponse{
			Status: "success",
			Data:   detail,
		})
		if err != nil {
			return nil, err
		}

		storeAttemptDetailPayloadInCache(ctx, cacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func buildAttemptDetailResponse(ctx context.Context, input GetAttemptDetailInput) (*AttemptDetailResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildAttemptDetailCacheKey(input.UserID, input.AttemptID)
	if detail, ok := loadAttemptDetailFromCache(ctx, cacheKey); ok {
		return detail, nil
	}

	attempt, err := getCachedAttemptInfo(ctx, input.AttemptID)
	if err != nil {
		return nil, err
	}
	if attempt == nil {
		return nil, ErrAttemptNotFound
	}
	if attempt.UserID != input.UserID {
		return nil, ErrAttemptForbidden
	}

	submitStatus, submitStatusOk, submitStatusErr := getAttemptSubmitStatus(ctx, input.AttemptID)
	if submitStatusErr != nil {
		log.Printf("[WARN] buildAttemptDetailResponse: Redis unavailable for attempt %s: %v", input.AttemptID, submitStatusErr)
	}
	if attempt.Status == "in_progress" && submitStatusOk && (submitStatus == submitAttemptStatusQueued || submitStatus == submitAttemptStatusDone) {
		finalizeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
		_ = FinalizeQueuedSubmitAttempt(finalizeCtx, input.UserID, input.AttemptID)
		cancel()

		refreshedAttempt, refreshErr := getCachedAttemptInfo(ctx, input.AttemptID)
		if refreshErr == nil && refreshedAttempt != nil && refreshedAttempt.UserID == input.UserID {
			attempt = refreshedAttempt
		}
	}

	questions, err := getCachedAttemptQuestions(ctx, attempt.ExamID)
	if err != nil {
		return nil, err
	}

	answerRows, err := repositories.ListAttemptAnswers(ctx, attempt.AttemptID)
	if err != nil {
		return nil, err
	}

	userAnswers := make(map[string]string, len(answerRows))
	for _, answer := range answerRows {
		selectedAns := strings.TrimSpace(answer.SelectedAns)
		if selectedAns == "" {
			continue
		}
		userAnswers[answer.QuestionID] = selectedAns
	}

	effectiveDurationSeconds := computeAttemptDurationSeconds(
		attempt.ExamType,
		attempt.StartedAt,
		attempt.StartTime,
		attempt.Duration,
	)

	detail := &AttemptDetailResponse{
		AttemptID:       attempt.AttemptID,
		Title:           attempt.ExamTitle,
		DurationMinutes: effectiveDurationSeconds / 60,
		DurationSeconds: effectiveDurationSeconds,
		Status:          attempt.Status,
		StartedAt:       attempt.StartedAt,
		ServerTime:      time.Now().UTC(),
		UserAnswers:     userAnswers,
		Questions:       append([]AttemptQuestionResponse(nil), questions...),
		User: AttemptUserResponse{
			Name:     attempt.Username,
			FullName: attempt.Fullname,
			Email:    attempt.Email,
			Role:     attempt.Role,
		},
	}
	if detail.Status == "in_progress" && submitStatusOk && (submitStatus == submitAttemptStatusQueued || submitStatus == submitAttemptStatusDone) {
		detail.Status = "submitted"
	}

	storeAttemptDetailInCache(ctx, cacheKey, detail)
	return detail, nil
}

func validateAttemptStartWindow(now time.Time, examPolicy *repositories.ExamAttemptPolicyRow) error {
	if examPolicy == nil {
		return ErrExamNotFound
	}
	if !usesExamWindow(examPolicy.Type) {
		return nil
	}
	if examPolicy.StartTime == nil {
		return nil
	}

	startTime := examPolicy.StartTime.UTC()
	deadline := startTime.Add(time.Duration(examPolicy.Duration) * time.Second)
	if now.Before(startTime) {
		return ErrExamNotStarted
	}
	if !now.Before(deadline) {
		return ErrExamEnded
	}

	return nil
}

func computeAttemptDurationSeconds(examType string, startedAt time.Time, examStartTime *time.Time, configuredDuration int) int {
	if configuredDuration <= 0 {
		return 0
	}
	if !usesExamWindow(examType) || examStartTime == nil {
		return configuredDuration
	}

	examDeadline := examStartTime.UTC().Add(time.Duration(configuredDuration) * time.Second)
	attemptDeadline := startedAt.UTC().Add(time.Duration(configuredDuration) * time.Second)
	if examDeadline.Before(attemptDeadline) {
		remaining := int(examDeadline.Sub(startedAt.UTC()).Seconds())
		if remaining < 0 {
			return 0
		}
		return remaining
	}

	return configuredDuration
}

func usesExamWindow(examType string) bool {
	switch strings.ToLower(strings.TrimSpace(examType)) {
	case "mock_test", "official":
		return true
	default:
		return false
	}
}

func ensureAttemptFinalizedForRead(ctx context.Context, userID, attemptID, source string) (*repositories.AttemptRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	attempt, err := getCachedAttemptInfo(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if attempt == nil {
		return nil, ErrAttemptNotFound
	}
	if attempt.UserID != userID {
		return nil, ErrAttemptForbidden
	}

	if !config.RedisEnabled || config.RedisClient == nil {
		if attempt.Status != "submitted" {
			return nil, ErrAttemptNotSubmitted
		}
		return attempt, nil
	}

	status, statusOk, err := getAttemptSubmitStatus(ctx, attemptID)
	if err != nil {
		log.Printf("[WARN] ensureAttemptFinalizedForRead status failed source=%s attempt_id=%s user_id=%s err=%v", source, attemptID, userID, err)
		return nil, err
	}

	pending, err := hasPendingAttemptAnswerBuffer(ctx, attemptID)
	if err != nil {
		log.Printf("[WARN] ensureAttemptFinalizedForRead pending check failed source=%s attempt_id=%s user_id=%s err=%v", source, attemptID, userID, err)
		return nil, err
	}

	if statusOk && status == submitAttemptStatusDone && !pending && attempt.Status == "submitted" {
		return attempt, nil
	}

	shouldFinalize := attempt.Status == "submitted" ||
		(statusOk && (status == submitAttemptStatusQueued || status == submitAttemptStatusDone))

	if !shouldFinalize {
		if attempt.Status == "submitted" {
			shouldFinalize = true
		} else {
			return nil, ErrAttemptNotSubmitted
		}
	}

	log.Printf("[INFO] ensureAttemptFinalizedForRead finalizing source=%s attempt_id=%s user_id=%s db_status=%s redis_status=%s redis_status_ok=%t pending=%t", source, attemptID, userID, attempt.Status, status, statusOk, pending)
	finalizeCtx, cancel := context.WithTimeout(ctx, 3*time.Second)
	finalizeErr := FinalizeQueuedSubmitAttempt(finalizeCtx, userID, attemptID)
	cancel()
	if finalizeErr != nil {
		if errors.Is(finalizeErr, ErrAttemptNotFound) || errors.Is(finalizeErr, ErrAttemptForbidden) {
			return nil, finalizeErr
		}
		log.Printf("[WARN] ensureAttemptFinalizedForRead finalize pending source=%s attempt_id=%s user_id=%s err=%v", source, attemptID, userID, finalizeErr)
		return nil, ErrAttemptProcessing
	}

	refreshed, err := getCachedAttemptInfo(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if refreshed == nil {
		return nil, ErrAttemptNotFound
	}
	if refreshed.UserID != userID {
		return nil, ErrAttemptForbidden
	}
	if refreshed.Status != "submitted" {
		return nil, ErrAttemptProcessing
	}

	status, statusOk, err = getAttemptSubmitStatus(ctx, attemptID)
	if err != nil {
		return nil, err
	}
	if !statusOk || status != submitAttemptStatusDone {
		log.Printf("[WARN] ensureAttemptFinalizedForRead missing done after finalize source=%s attempt_id=%s user_id=%s status=%s status_ok=%t", source, attemptID, userID, status, statusOk)
		return nil, ErrAttemptProcessing
	}

	return refreshed, nil
}

func GetAttemptResult(ctx context.Context, input GetAttemptDetailInput) (*AttemptResultResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildAttemptResultCacheKey(input.UserID, input.AttemptID)
	if _, err := ensureAttemptFinalizedForRead(ctx, input.UserID, input.AttemptID, "result"); err != nil {
		return nil, err
	}
	if result, ok := loadAttemptResultFromCache(ctx, cacheKey); ok {
		return result, nil
	}

	result, err, _ := attemptResultGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if result, ok := loadAttemptResultFromCache(ctx, cacheKey); ok {
			return result, nil
		}

		if _, err := ensureAttemptFinalizedForRead(ctx, input.UserID, input.AttemptID, "result-group"); err != nil {
			return nil, err
		}

		attempt, err := repositories.GetAttemptResultBase(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, ErrAttemptNotFound
		}
		if attempt.UserID != input.UserID {
			return nil, ErrAttemptForbidden
		}

		questions, err := repositories.ListAttemptResultQuestions(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}

		score, correct, wrong, skipped := gradeMathAttemptResult(questions)
		log.Printf("[INFO] GetAttemptResult built result attempt_id=%s user_id=%s score=%s correct=%d wrong=%d skipped=%d", input.AttemptID, input.UserID, formatResultScore(score), correct, wrong, skipped)

		response := &AttemptResultResponse{}
		response.User.Username = attempt.Username
		response.User.Fullname = attempt.Fullname
		response.User.Email = attempt.Email
		response.User.Role = attempt.Role
		response.Exam.ID = attempt.ExamID
		response.Exam.Title = attempt.ExamTitle
		response.Exam.Type = attempt.ExamType
		response.Exam.Duration = attempt.Duration
		response.Exam.StartTime = attempt.StartTime
		response.Room.ID = attempt.RoomID
		response.Room.Name = attempt.RoomName
		response.Result.Score = formatResultScore(score)
		response.Result.Message = buildResultMessage(score)
		response.Result.Correct = correct
		response.Result.Wrong = wrong
		response.Result.Skipped = skipped

		storeAttemptResultInCache(ctx, cacheKey, response)
		return response, nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*AttemptResultResponse), nil
}

func GetAttemptReview(ctx context.Context, input GetAttemptDetailInput) (*AttemptReviewResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildAttemptReviewCacheKey(input.UserID, input.AttemptID)
	if _, err := ensureAttemptFinalizedForRead(ctx, input.UserID, input.AttemptID, "review"); err != nil {
		return nil, err
	}
	if review, ok := loadAttemptReviewFromCache(ctx, cacheKey); ok {
		return review, nil
	}

	result, err, _ := attemptReviewGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if review, ok := loadAttemptReviewFromCache(ctx, cacheKey); ok {
			return review, nil
		}

		if _, err := ensureAttemptFinalizedForRead(ctx, input.UserID, input.AttemptID, "review-group"); err != nil {
			return nil, err
		}

		attempt, err := repositories.GetAttemptResultBase(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, ErrAttemptNotFound
		}
		if attempt.UserID != input.UserID {
			return nil, ErrAttemptForbidden
		}

		questions, err := repositories.ListAttemptReviewQuestions(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}

		items := make([]AttemptReviewQuestionResponse, 0, len(questions))
		userAnswers := make(map[string]string, len(questions))

		for _, question := range questions {
			options := make([]AttemptQuestionOptionResponse, 0, len(question.Options))
			for _, option := range question.Options {
				options = append(options, AttemptQuestionOptionResponse{
					ID:   option.ID,
					Text: option.Text,
				})
			}
			explanationBlocks, explanationText := mapAttemptReviewExplanationBlocks(question.ExplanationBlocks)

			items = append(items, AttemptReviewQuestionResponse{
				QuestionID:        question.QuestionID,
				ParentID:          question.ParentID,
				Content:           question.Content,
				ImageURL:          question.ImageURL,
				Options:           options,
				Type:              question.Type,
				QuestionType:      question.QuestionType,
				CorrectAnswer:     question.CorrectAnswer,
				Explanation:       explanationText,
				ExplanationBlocks: explanationBlocks,
			})

			if question.SelectedAns != nil {
				userAnswers[question.QuestionID] = strings.TrimSpace(*question.SelectedAns)
			}
		}

		review := &AttemptReviewResponse{
			Title:       attempt.ExamTitle,
			Questions:   items,
			UserAnswers: userAnswers,
			User: AttemptUserResponse{
				Name:     attempt.Username,
				FullName: attempt.Fullname,
				Email:    attempt.Email,
				Role:     attempt.Role,
			},
		}

		storeAttemptReviewInCache(ctx, cacheKey, review)
		return review, nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*AttemptReviewResponse), nil
}

func mapAttemptReviewExplanationBlocks(blocks []repositories.AttemptQuestionExplanationBlockRow) ([]AttemptQuestionExplanationBlockResponse, *string) {
	if len(blocks) == 0 {
		return nil, nil
	}

	result := make([]AttemptQuestionExplanationBlockResponse, 0, len(blocks))
	textParts := make([]string, 0, len(blocks))
	for _, block := range blocks {
		result = append(result, AttemptQuestionExplanationBlockResponse{
			BlockType:   block.BlockType,
			ContentText: block.ContentText,
			ImageURL:    block.ImageURL,
			AltText:     block.AltText,
			Metadata:    block.Metadata,
		})
		if block.BlockType == "text" && block.ContentText != nil {
			text := strings.TrimSpace(*block.ContentText)
			if text != "" {
				textParts = append(textParts, text)
			}
		}
	}

	if len(textParts) == 0 {
		return result, nil
	}
	explanation := strings.Join(textParts, "\n\n")
	return result, &explanation
}

func buildAttemptQuestionsCacheKey(examID string) string {
	return fmt.Sprintf("attempt-questions:%s", examID)
}

func buildExamAttemptPolicyCacheKey(examID string) string {
	return fmt.Sprintf("exam-attempt-policy:%s", examID)
}

func buildAttemptInfoCacheKey(attemptID string) string {
	return fmt.Sprintf("attempt-info:%s", attemptID)
}

func buildAttemptWriteGuardCacheKey(attemptID string) string {
	return fmt.Sprintf("attempt-write-guard:%s", attemptID)
}

func buildAttemptDetailCacheKey(userID, attemptID string) string {
	return fmt.Sprintf("attempt-detail:%s:%s", userID, attemptID)
}

func buildAttemptDetailPayloadCacheKey(userID, attemptID string) string {
	return fmt.Sprintf("attempt-detail-payload:%s:%s", userID, attemptID)
}

func buildAttemptReviewCacheKey(userID, attemptID string) string {
	return fmt.Sprintf("attempt-review:%s:%s", userID, attemptID)
}

func buildAttemptResultCacheKey(userID, attemptID string) string {
	return fmt.Sprintf("attempt-result:%s:%s", userID, attemptID)
}

func cacheContext(parent context.Context) (context.Context, context.CancelFunc) {
	if parent == nil {
		parent = context.Background()
	}

	return context.WithTimeout(parent, time.Second)
}

func loadAttemptInfoFromCache(ctx context.Context, cacheKey string) (*repositories.AttemptRow, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var attempt repositories.AttemptRow
	if err := json.Unmarshal([]byte(payload), &attempt); err != nil {
		return nil, false
	}
	if attempt.AttemptID == "" {
		return nil, false
	}

	return &attempt, true
}

func loadExamAttemptPolicyFromCache(ctx context.Context, cacheKey string) (*repositories.ExamAttemptPolicyRow, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var policy repositories.ExamAttemptPolicyRow
	if err := json.Unmarshal([]byte(payload), &policy); err != nil {
		return nil, false
	}
	if policy.ExamID == "" {
		return nil, false
	}

	return &policy, true
}

func loadAttemptWriteGuardFromCache(ctx context.Context, cacheKey string) (*repositories.AttemptWriteGuardRow, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var attempt repositories.AttemptWriteGuardRow
	if err := json.Unmarshal([]byte(payload), &attempt); err != nil {
		return nil, false
	}
	if attempt.AttemptID == "" {
		return nil, false
	}

	return &attempt, true
}

func storeAttemptInfoInCache(ctx context.Context, cacheKey string, attempt *repositories.AttemptRow) {
	if !config.RedisEnabled || config.RedisClient == nil || attempt == nil {
		return
	}

	payload, err := json.Marshal(attempt)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptInfoCacheTTL).Err()
}

func storeExamAttemptPolicyInCache(ctx context.Context, cacheKey string, policy *repositories.ExamAttemptPolicyRow) {
	if !config.RedisEnabled || config.RedisClient == nil || policy == nil {
		return
	}

	payload, err := json.Marshal(policy)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, examAttemptPolicyCacheTTL).Err()
}

func storeAttemptWriteGuardInCache(ctx context.Context, cacheKey string, attempt *repositories.AttemptWriteGuardRow) {
	if !config.RedisEnabled || config.RedisClient == nil || attempt == nil {
		return
	}

	payload, err := json.Marshal(attempt)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptWriteGuardCacheTTL).Err()
}

func loadSaveAnswersResponseFromCache(ctx context.Context, cacheKey string) (*SaveAttemptAnswersResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var response SaveAttemptAnswersResponse
	if err := json.Unmarshal([]byte(payload), &response); err != nil {
		return nil, false
	}
	if response.AttemptID == "" {
		return nil, false
	}

	return &response, true
}

func loadSaveAnswersLatestFromCache(ctx context.Context, cacheKey, payloadHash string) (*SaveAttemptAnswersResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var entry saveAnswersLatestCacheEntry
	if err := json.Unmarshal([]byte(payload), &entry); err != nil {
		return nil, false
	}
	if entry.PayloadHash != payloadHash || entry.Response == nil || entry.Response.AttemptID == "" {
		return nil, false
	}

	return entry.Response, true
}

func storeSaveAnswersResponseInCache(ctx context.Context, cacheKey string, response *SaveAttemptAnswersResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || response == nil {
		return
	}

	payload, err := json.Marshal(response)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, saveAnswersResponseCacheTTL).Err()
}

func storeSaveAnswersLatestInCache(ctx context.Context, cacheKey, payloadHash string, response *SaveAttemptAnswersResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || response == nil {
		return
	}

	entry := saveAnswersLatestCacheEntry{
		PayloadHash: payloadHash,
		Response:    response,
	}

	payload, err := json.Marshal(entry)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, saveAnswersLatestCacheTTL).Err()
}

func invalidateAttemptInfoCache(attemptID string) {
	cacheKey := buildAttemptInfoCacheKey(attemptID)
	attemptInfoGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func invalidateAttemptWriteGuardCache(attemptID string) {
	cacheKey := buildAttemptWriteGuardCacheKey(attemptID)
	attemptWriteGuardGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func invalidateAttemptCachesForUser(userID, attemptID string) {
	invalidateAttemptInfoCache(attemptID)
	invalidateAttemptWriteGuardCache(attemptID)
	invalidateAttemptDetailCache(userID, attemptID)
	invalidateAttemptDetailPayloadCache(userID, attemptID)
	invalidateAttemptReviewCache(userID, attemptID)
	invalidateAttemptResultCache(userID, attemptID)
}

func getCachedAttemptInfo(ctx context.Context, attemptID string) (*repositories.AttemptRow, error) {
	cacheKey := buildAttemptInfoCacheKey(attemptID)

	if attempt, ok := loadAttemptInfoFromCache(ctx, cacheKey); ok {
		return attempt, nil
	}

	result, err, _ := attemptInfoGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if attempt, ok := loadAttemptInfoFromCache(ctx, cacheKey); ok {
			return attempt, nil
		}

		attempt, err := repositories.GetAttemptByID(ctx, attemptID)
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, nil
		}

		storeAttemptInfoInCache(ctx, cacheKey, attempt)
		return attempt, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return result.(*repositories.AttemptRow), nil
}

func getCachedExamAttemptPolicy(ctx context.Context, examID string) (*repositories.ExamAttemptPolicyRow, error) {
	cacheKey := buildExamAttemptPolicyCacheKey(examID)

	if policy, ok := loadExamAttemptPolicyFromCache(ctx, cacheKey); ok {
		return policy, nil
	}

	result, err, _ := examPolicyGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if policy, ok := loadExamAttemptPolicyFromCache(ctx, cacheKey); ok {
			return policy, nil
		}

		policy, err := repositories.GetExamAttemptPolicyByID(ctx, examID)
		if err != nil {
			return nil, err
		}
		if policy == nil {
			return nil, nil
		}

		storeExamAttemptPolicyInCache(ctx, cacheKey, policy)
		return policy, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return result.(*repositories.ExamAttemptPolicyRow), nil
}

func getCachedAttemptWriteGuard(ctx context.Context, attemptID string) (*repositories.AttemptWriteGuardRow, error) {
	cacheKey := buildAttemptWriteGuardCacheKey(attemptID)

	if attempt, ok := loadAttemptWriteGuardFromCache(ctx, cacheKey); ok {
		return attempt, nil
	}

	result, err, _ := attemptWriteGuardGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if attempt, ok := loadAttemptWriteGuardFromCache(ctx, cacheKey); ok {
			return attempt, nil
		}

		attempt, err := repositories.GetAttemptWriteGuard(ctx, attemptID)
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, nil
		}

		storeAttemptWriteGuardInCache(ctx, cacheKey, attempt)
		return attempt, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return result.(*repositories.AttemptWriteGuardRow), nil
}

func loadAttemptDetailFromCache(ctx context.Context, cacheKey string) (*AttemptDetailResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var detail AttemptDetailResponse
	if err := json.Unmarshal([]byte(payload), &detail); err != nil {
		return nil, false
	}
	if detail.AttemptID == "" {
		return nil, false
	}

	return &detail, true
}

func storeAttemptDetailInCache(ctx context.Context, cacheKey string, detail *AttemptDetailResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || detail == nil {
		return
	}

	payload, err := json.Marshal(detail)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptDetailCacheTTL).Err()
}

func loadAttemptDetailPayloadFromCache(ctx context.Context, cacheKey string) ([]byte, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Bytes()
	if err != nil || len(payload) == 0 {
		return nil, false
	}

	return payload, true
}

func storeAttemptDetailPayloadInCache(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptDetailPayloadCacheTTL).Err()
}

func loadAttemptReviewFromCache(ctx context.Context, cacheKey string) (*AttemptReviewResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var review AttemptReviewResponse
	if err := json.Unmarshal([]byte(payload), &review); err != nil {
		return nil, false
	}
	if review.Title == "" {
		return nil, false
	}

	return &review, true
}

func loadAttemptResultFromCache(ctx context.Context, cacheKey string) (*AttemptResultResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var result AttemptResultResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil, false
	}
	if result.Exam.Title == "" {
		return nil, false
	}
	if usesExamWindow(result.Exam.Type) && result.Exam.Duration <= 0 {
		return nil, false
	}

	return &result, true
}

func storeAttemptReviewInCache(ctx context.Context, cacheKey string, review *AttemptReviewResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || review == nil {
		return
	}

	payload, err := json.Marshal(review)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptReviewCacheTTL).Err()
}

func storeAttemptResultInCache(ctx context.Context, cacheKey string, result *AttemptResultResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptResultCacheTTL).Err()
}

func invalidateAttemptDetailCache(userID, attemptID string) {
	cacheKey := buildAttemptDetailCacheKey(userID, attemptID)
	attemptDetailGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func invalidateAttemptDetailPayloadCache(userID, attemptID string) {
	cacheKey := buildAttemptDetailPayloadCacheKey(userID, attemptID)
	attemptDetailGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func invalidateAttemptReviewCache(userID, attemptID string) {
	cacheKey := buildAttemptReviewCacheKey(userID, attemptID)
	attemptReviewGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func invalidateAttemptResultCache(userID, attemptID string) {
	cacheKey := buildAttemptResultCacheKey(userID, attemptID)
	attemptResultGroup.Forget(cacheKey)

	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Del(ctx, cacheKey).Err()
}

func gradeMathAttemptResult(rows []repositories.AttemptResultQuestionRow) (float64, int, int, int) {
	score := 0.0
	correct := 0
	wrong := 0
	skipped := 0

	trueFalseGroups := make(map[string][]repositories.AttemptResultQuestionRow)

	for _, row := range rows {
		selected := normalizeAttemptAnswer(row.SelectedAns)
		expected := normalizeAttemptAnswer(row.CorrectAnswer)

		switch row.Type {
		case "single_choice":
			if selected == "" {
				skipped++
				continue
			}
			if selected == expected {
				score += 0.25
				correct++
			} else {
				wrong++
			}
		case "short_answer":
			if selected == "" {
				skipped++
				continue
			}
			if selected == expected {
				score += 0.5
				correct++
			} else {
				wrong++
			}
		case "true_false":
			parentKey := ""
			if row.ParentID != nil {
				parentKey = *row.ParentID
			}
			trueFalseGroups[parentKey] = append(trueFalseGroups[parentKey], row)
		}
	}

	for _, group := range trueFalseGroups {
		correctInGroup := 0
		answeredInGroup := 0

		for _, row := range group {
			selected := normalizeAttemptAnswer(row.SelectedAns)
			expected := normalizeAttemptAnswer(row.CorrectAnswer)

			if selected == "" {
				skipped++
				continue
			}

			answeredInGroup++
			if selected == expected {
				correctInGroup++
				correct++
			} else {
				wrong++
			}
		}

		switch correctInGroup {
		case 1:
			score += 0.1
		case 2:
			score += 0.25
		case 3:
			score += 0.5
		case 4:
			score += 1.0
		}

		if answeredInGroup == 0 {
			// no-op: skipped was already counted at statement level
		}
	}

	return score, correct, wrong, skipped
}

func calculateAndPersistAttemptMarks(ctx context.Context, attemptID string) (float64, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	questions, err := repositories.ListAttemptResultQuestions(ctx, attemptID)
	if err != nil {
		return 0, err
	}

	score, _, _, _ := gradeMathAttemptResult(questions)
	if err := repositories.UpdateAttemptMarks(ctx, attemptID, score); err != nil {
		return 0, err
	}

	return score, nil
}

func normalizeAttemptAnswer(value *string) string {
	if value == nil {
		return ""
	}

	return strings.ToLower(strings.TrimSpace(*value))
}

func formatResultScore(score float64) string {
	return strconv.FormatFloat(score, 'f', -1, 64)
}

func buildResultMessage(score float64) string {
	switch {
	case score >= 8:
		return "Mức điểm rất tốt, bạn đang có nền tảng khá vững."
	case score >= 6:
		return "Kết quả khá ổn, chỉ cần cải thiện thêm ở các câu phân hóa."
	case score >= 4:
		return "Bạn đã có nền cơ bản, nhưng vẫn còn nhiều điểm có thể kéo lên."
	default:
		return "Kết quả chưa cao, nên xem lại đáp án và luyện thêm theo từng phần."
	}
}

func loadAttemptQuestionsFromCache(ctx context.Context, cacheKey string) ([]AttemptQuestionResponse, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil, false
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil, false
	}

	var questions []AttemptQuestionResponse
	if err := json.Unmarshal([]byte(payload), &questions); err != nil {
		return nil, false
	}

	return questions, true
}

func storeAttemptQuestionsInCache(ctx context.Context, cacheKey string, questions []AttemptQuestionResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || questions == nil {
		return
	}

	payload, err := json.Marshal(questions)
	if err != nil {
		return
	}

	ctx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptQuestionCacheTTL).Err()
}

func getCachedAttemptQuestions(ctx context.Context, examID string) ([]AttemptQuestionResponse, error) {
	cacheKey := buildAttemptQuestionsCacheKey(examID)

	if questions, ok := loadAttemptQuestionsFromCache(ctx, cacheKey); ok {
		return questions, nil
	}

	result, err, _ := attemptQuestionGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if questions, ok := loadAttemptQuestionsFromCache(ctx, cacheKey); ok {
			return questions, nil
		}

		questions, err := repositories.ListQuestionsByExamID(ctx, examID)
		if err != nil {
			return nil, err
		}

		items := make([]AttemptQuestionResponse, 0, len(questions))
		for _, question := range questions {
			options := make([]AttemptQuestionOptionResponse, 0, len(question.Options))
			for _, option := range question.Options {
				options = append(options, AttemptQuestionOptionResponse{
					ID:   option.ID,
					Text: option.Text,
				})
			}

			items = append(items, AttemptQuestionResponse{
				QuestionID:   question.QuestionID,
				ParentID:     question.ParentID,
				Content:      question.Content,
				ImageURL:     question.ImageURL,
				Options:      options,
				Type:         question.Type,
				QuestionType: question.QuestionType,
			})
		}

		storeAttemptQuestionsInCache(ctx, cacheKey, items)
		return items, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]AttemptQuestionResponse), nil
}

func warmRoomExamCacheAfterSubmit(ctx context.Context, userID, attemptID string) {
	if userID == "" || attemptID == "" {
		return
	}

	attempt, err := getCachedAttemptInfo(ctx, attemptID)
	if err != nil || attempt == nil {
		return
	}

	roomID := attempt.RoomID
	if roomID == "" && attempt.ExamID != "" {
		policy, policyErr := getCachedExamAttemptPolicy(ctx, attempt.ExamID)
		if policyErr == nil && policy != nil {
			roomID = policy.RoomID
		}
	}

	if roomID == "" {
		return
	}

	WarmRoomExamFirstPage(ctx, userID, roomID)
}
