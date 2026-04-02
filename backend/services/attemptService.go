package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"hash/fnv"
	"slices"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"github.com/google/uuid"
	"golang.org/x/sync/singleflight"
)

var (
	ErrAttemptNotFound      = errors.New("attempt not found")
	ErrAttemptForbidden     = errors.New("attempt forbidden")
	ErrAttemptClosed        = errors.New("attempt is not in progress")
	ErrAttemptNotSubmitted  = errors.New("attempt is not submitted")
	ErrInvalidAnswerPayload = errors.New("answers payload is invalid")
	startAttemptGroup       singleflight.Group
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
const attemptInfoCacheTTL = 10 * time.Second
const attemptWriteGuardCacheTTL = 10 * time.Second
const saveAnswersResponseCacheTTL = 3 * time.Second
const saveAnswersLatestCacheTTL = 10 * time.Second
const attemptDetailCacheTTL = 5 * time.Second
const attemptDetailPayloadCacheTTL = 5 * time.Second
const attemptReviewCacheTTL = 30 * time.Second
const attemptResultCacheTTL = 30 * time.Second

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
	QuestionID    string                          `json:"question_id"`
	ParentID      *string                         `json:"parent_id"`
	Content       string                          `json:"content"`
	ImageURL      *string                         `json:"image_url"`
	Options       []AttemptQuestionOptionResponse `json:"options"`
	Type          string                          `json:"type"`
	QuestionType  string                          `json:"question_type"`
	CorrectAnswer *string                         `json:"correct_answer,omitempty"`
	Explanation   *string                         `json:"explanation,omitempty"`
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
	AttemptID  string                    `json:"attempt_id"`
	SavedAt    time.Time                 `json:"saved_at"`
	SavedCount int                       `json:"saved_count"`
	Answers    []SaveAttemptAnswerResult `json:"answers"`
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
		Title string `json:"title"`
		Type  string `json:"type"`
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

		releaseLock, err := acquireStartAttemptLock(ctx, input.UserID, input.ExamID)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		attempt, err := repositories.GetOrCreateInProgressAttempt(ctx, input.UserID, input.ExamID)
		if err != nil {
			return nil, err
		}
		if attempt == nil {
			return nil, ErrExamNotFound
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

func acquireStartAttemptLock(ctx context.Context, userID, examID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "start-attempt-lock:"+userID+":"+examID)
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

	saveKey := buildSaveAnswersKey(input.UserID, input.AttemptID)
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

		resolvedResult, err := repositories.ResolveAttemptAnswersAuthorized(ctx, input.AttemptID, input.UserID, deduped)
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
			savedResult, err := repositories.ApplyAttemptAnswerChangesAuthorized(ctx, input.AttemptID, input.UserID, changedRows)
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
		}

		response := &SaveAttemptAnswersResponse{
			AttemptID:  input.AttemptID,
			SavedAt:    time.Now().UTC(),
			SavedCount: len(results),
			Answers:    results,
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

func buildSaveAnswersKey(userID, attemptID string) string {
	return "save-answers:" + userID + ":" + attemptID
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

func SubmitAttempt(ctx context.Context, input SubmitAttemptInput) (*SubmitAttemptResponse, error) {
	if input.UserID == "" || input.AttemptID == "" {
		return nil, ErrAttemptNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

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

			invalidateAttemptInfoCache(input.AttemptID)
			invalidateAttemptWriteGuardCache(input.AttemptID)
			invalidateAttemptDetailCache(input.UserID, input.AttemptID)
			invalidateAttemptDetailPayloadCache(input.UserID, input.AttemptID)
			invalidateAttemptReviewCache(input.UserID, input.AttemptID)
			invalidateAttemptResultCache(input.UserID, input.AttemptID)

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

func acquireSubmitAttemptLock(ctx context.Context, attemptID string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "submit-attempt-lock:"+attemptID)
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
			return nil, err
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

	detail := &AttemptDetailResponse{
		AttemptID:       attempt.AttemptID,
		Title:           attempt.ExamTitle,
		DurationMinutes: attempt.Duration / 60,
		DurationSeconds: attempt.Duration,
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

	storeAttemptDetailInCache(ctx, cacheKey, detail)
	return detail, nil
}

func GetAttemptResult(ctx context.Context, input GetAttemptDetailInput) (*AttemptResultResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildAttemptResultCacheKey(input.UserID, input.AttemptID)
	if result, ok := loadAttemptResultFromCache(ctx, cacheKey); ok {
		return result, nil
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
	if attempt.Status != "submitted" {
		return nil, ErrAttemptNotSubmitted
	}

	result, err, _ := attemptResultGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if result, ok := loadAttemptResultFromCache(ctx, cacheKey); ok {
			return result, nil
		}

		questions, err := repositories.ListAttemptResultQuestions(ctx, input.AttemptID)
		if err != nil {
			return nil, err
		}

		score, correct, wrong, skipped := gradeMathAttemptResult(questions)

		response := &AttemptResultResponse{}
		response.User.Username = attempt.Username
		response.User.Fullname = attempt.Fullname
		response.User.Email = attempt.Email
		response.User.Role = attempt.Role
		response.Exam.Title = attempt.ExamTitle
		response.Exam.Type = attempt.ExamType
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
	if review, ok := loadAttemptReviewFromCache(ctx, cacheKey); ok {
		return review, nil
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
	if attempt.Status != "submitted" {
		return nil, ErrAttemptNotSubmitted
	}

	result, err, _ := attemptReviewGroup.Do(cacheKey, func() (interface{}, error) {
		if err := ctx.Err(); err != nil {
			return nil, err
		}

		if review, ok := loadAttemptReviewFromCache(ctx, cacheKey); ok {
			return review, nil
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

			items = append(items, AttemptReviewQuestionResponse{
				QuestionID:    question.QuestionID,
				ParentID:      question.ParentID,
				Content:       question.Content,
				ImageURL:      question.ImageURL,
				Options:       options,
				Type:          question.Type,
				QuestionType:  question.QuestionType,
				CorrectAnswer: question.CorrectAnswer,
				Explanation:   question.Explanation,
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

func buildAttemptQuestionsCacheKey(examID string) string {
	return fmt.Sprintf("attempt-questions:%s", examID)
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
