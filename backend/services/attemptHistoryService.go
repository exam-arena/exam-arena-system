package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"golang.org/x/sync/singleflight"
)

const defaultAttemptHistoryPageLimit = 6
const maxAttemptHistoryPageLimit = 50
const attemptHistoryFirstPageCacheTTL = 60 * time.Second
const attemptHistoryFirstPagePayloadCacheTTL = 60 * time.Second
const attemptHistoryCacheTTL = 15 * time.Second
const attemptHistoryPayloadCacheTTL = 15 * time.Second
const attemptHistoryVersionKeyPrefix = "attempt-history-version:user:"

var attemptHistoryGroup singleflight.Group

var ErrInvalidAttemptHistoryCursor = fmt.Errorf("attempt history cursor is invalid")

type GetAttemptHistoryInput struct {
	UserID string
	Cursor string
	Limit  int
}

type AttemptHistoryItemResponse struct {
	AttemptID   string     `json:"attempt_id"`
	StartedAt   time.Time  `json:"started_at"`
	SubmittedAt *time.Time `json:"submitted_at,omitempty"`
	RoomName    string     `json:"room_name"`
	ExamName    string     `json:"exam_name"`
	Score       string     `json:"score"`
}

type AttemptHistoryResponse struct {
	Items        []AttemptHistoryItemResponse `json:"items"`
	ItemsPerPage int                          `json:"itemsPerPage"`
	NextCursor   *string                      `json:"nextCursor,omitempty"`
	HasNextPage  bool                         `json:"hasNextPage"`
}

type attemptHistoryCursor struct {
	SubmittedAt time.Time
	AttemptID   string
}

func GetAttemptHistoryPayload(ctx context.Context, input GetAttemptHistoryInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeAttemptHistoryLimit(input.Limit)
	version := getAttemptHistoryCacheVersion(ctx, input.UserID)
	payloadCacheKey := buildAttemptHistoryPayloadCacheKey(version, input.UserID, input.Cursor, limit)
	if payload := getCachedAttemptHistoryPayload(ctx, payloadCacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildAttemptHistoryCacheKey(version, input.UserID, input.Cursor, limit)
	result, err, _ := attemptHistoryGroup.Do(groupKey, func() (interface{}, error) {
		if payload := getCachedAttemptHistoryPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireExamReadThroughCacheLock(ctx, "attempt-history", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedAttemptHistoryPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildAttemptHistoryResponse(ctx, GetAttemptHistoryInput{
			UserID: input.UserID,
			Cursor: input.Cursor,
			Limit:  limit,
		}, version)
		if err != nil {
			return nil, err
		}

		payload, err := json.Marshal(utils.SuccessResponse{
			Status: "success",
			Data:   response,
		})
		if err != nil {
			return nil, err
		}

		cacheAttemptHistoryPayload(ctx, payloadCacheKey, payload, input.Cursor == "")
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func buildAttemptHistoryResponse(ctx context.Context, input GetAttemptHistoryInput, version string) (*AttemptHistoryResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeAttemptHistoryLimit(input.Limit)
	cacheKey := buildAttemptHistoryCacheKey(version, input.UserID, input.Cursor, limit)
	if cached := getCachedAttemptHistory(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	decodedCursor, err := decodeAttemptHistoryCursor(input.Cursor)
	if err != nil {
		return nil, err
	}

	var submittedAt *time.Time
	var attemptID string
	if decodedCursor != nil {
		submittedAt = &decodedCursor.SubmittedAt
		attemptID = decodedCursor.AttemptID
	}

	rows, err := repositories.ListAttemptHistoryByUser(ctx, input.UserID, submittedAt, attemptID, limit)
	if err != nil {
		return nil, err
	}

	hasNextPage := len(rows) > limit
	if hasNextPage {
		rows = rows[:limit]
	}

	items := make([]AttemptHistoryItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, AttemptHistoryItemResponse{
			AttemptID:   row.AttemptID,
			StartedAt:   row.StartedAt,
			SubmittedAt: row.SubmittedAt,
			RoomName:    row.RoomName,
			ExamName:    row.ExamName,
			Score:       row.Score,
		})
	}

	var nextCursor *string
	if hasNextPage && len(rows) > 0 {
		lastRow := rows[len(rows)-1]
		if lastRow.SubmittedAt != nil {
			cursor := encodeAttemptHistoryCursor(*lastRow.SubmittedAt, lastRow.AttemptID)
			nextCursor = &cursor
		}
	}

	response := &AttemptHistoryResponse{
		Items:        items,
		ItemsPerPage: limit,
		NextCursor:   nextCursor,
		HasNextPage:  hasNextPage,
	}

	cacheAttemptHistory(ctx, cacheKey, response, input.Cursor == "")
	return response, nil
}

func WarmAttemptHistoryFirstPage(ctx context.Context, userID string) {
	if strings.TrimSpace(userID) == "" {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	_, _ = GetAttemptHistoryPayload(ctx, GetAttemptHistoryInput{
		UserID: userID,
		Limit:  defaultAttemptHistoryPageLimit,
	})
}

func normalizeAttemptHistoryLimit(limit int) int {
	if limit <= 0 {
		limit = defaultAttemptHistoryPageLimit
	}
	if limit > maxAttemptHistoryPageLimit {
		limit = maxAttemptHistoryPageLimit
	}

	return limit
}

func encodeAttemptHistoryCursor(submittedAt time.Time, attemptID string) string {
	raw := submittedAt.UTC().Format(time.RFC3339Nano) + "|" + attemptID
	return base64.RawURLEncoding.EncodeToString([]byte(raw))
}

func decodeAttemptHistoryCursor(cursor string) (*attemptHistoryCursor, error) {
	cursor = strings.TrimSpace(cursor)
	if cursor == "" {
		return nil, nil
	}

	decoded, err := base64.RawURLEncoding.DecodeString(cursor)
	if err != nil {
		return nil, ErrInvalidAttemptHistoryCursor
	}

	parts := strings.SplitN(string(decoded), "|", 2)
	if len(parts) != 2 || strings.TrimSpace(parts[1]) == "" {
		return nil, ErrInvalidAttemptHistoryCursor
	}

	submittedAt, err := time.Parse(time.RFC3339Nano, parts[0])
	if err != nil {
		return nil, ErrInvalidAttemptHistoryCursor
	}

	return &attemptHistoryCursor{
		SubmittedAt: submittedAt,
		AttemptID:   parts[1],
	}, nil
}

func buildAttemptHistoryCacheKey(version, userID, cursor string, limit int) string {
	return fmt.Sprintf("attempt-history:%s:user:%s:cursor:%s:limit:%d", version, userID, normalizedAttemptHistoryCursorToken(cursor), limit)
}

func buildAttemptHistoryPayloadCacheKey(version, userID, cursor string, limit int) string {
	return fmt.Sprintf("attempt-history-payload:%s:user:%s:cursor:%s:limit:%d", version, userID, normalizedAttemptHistoryCursorToken(cursor), limit)
}

func normalizedAttemptHistoryCursorToken(cursor string) string {
	cursor = strings.TrimSpace(cursor)
	if cursor == "" {
		return "first"
	}

	return cursor
}

func getAttemptHistoryCacheVersion(ctx context.Context, userID string) string {
	if !config.RedisEnabled || config.RedisClient == nil || strings.TrimSpace(userID) == "" {
		return "1"
	}

	redisCtx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	value, err := config.RedisClient.Get(redisCtx, attemptHistoryVersionKeyPrefix+userID).Result()
	if err != nil || strings.TrimSpace(value) == "" {
		return "1"
	}

	return value
}

func getCachedAttemptHistory(ctx context.Context, cacheKey string) *AttemptHistoryResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result AttemptHistoryResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}

	return &result
}

func cacheAttemptHistory(ctx context.Context, cacheKey string, result *AttemptHistoryResponse, isFirstPage bool) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	ttl := attemptHistoryCacheTTL
	if isFirstPage {
		ttl = attemptHistoryFirstPageCacheTTL
	}

	_ = config.RedisClient.Set(ctx, cacheKey, payload, ttl).Err()
}

func getCachedAttemptHistoryPayload(ctx context.Context, cacheKey string) []byte {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Bytes()
	if err != nil || len(payload) == 0 {
		return nil
	}

	return payload
}

func cacheAttemptHistoryPayload(ctx context.Context, cacheKey string, payload []byte, isFirstPage bool) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	ttl := attemptHistoryPayloadCacheTTL
	if isFirstPage {
		ttl = attemptHistoryFirstPagePayloadCacheTTL
	}

	_ = config.RedisClient.Set(ctx, cacheKey, payload, ttl).Err()
}

func invalidateAttemptHistoryCachesForUser(ctx context.Context, userID string) {
	if !config.RedisEnabled || config.RedisClient == nil || strings.TrimSpace(userID) == "" {
		return
	}

	redisCtx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Incr(redisCtx, attemptHistoryVersionKeyPrefix+userID).Err()
}
