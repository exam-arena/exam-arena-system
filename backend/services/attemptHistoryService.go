package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"golang.org/x/sync/singleflight"
)

const defaultAttemptHistoryPageLimit = 6
const maxAttemptHistoryPageLimit = 50
const attemptHistoryCacheTTL = 15 * time.Second
const attemptHistoryPayloadCacheTTL = 15 * time.Second
const attemptHistoryCacheVersion = "v1"

var attemptHistoryGroup singleflight.Group

type GetAttemptHistoryInput struct {
	UserID string
	Page   int
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
	TotalItems   int                          `json:"totalItems"`
	CurrentPage  int                          `json:"currentPage"`
	TotalPages   int                          `json:"totalPages"`
	ItemsPerPage int                          `json:"itemsPerPage"`
}

func GetAttemptHistoryPayload(ctx context.Context, input GetAttemptHistoryInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeAttemptHistoryPagination(input.Page, input.Limit)
	payloadCacheKey := buildAttemptHistoryPayloadCacheKey(input.UserID, page, limit)
	if payload := getCachedAttemptHistoryPayload(ctx, payloadCacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildAttemptHistoryCacheKey(input.UserID, page, limit)
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
			Page:   page,
			Limit:  limit,
		})
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

		cacheAttemptHistoryPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func buildAttemptHistoryResponse(ctx context.Context, input GetAttemptHistoryInput) (*AttemptHistoryResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeAttemptHistoryPagination(input.Page, input.Limit)
	cacheKey := buildAttemptHistoryCacheKey(input.UserID, page, limit)
	if cached := getCachedAttemptHistory(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	rows, err := repositories.ListAttemptHistoryByUser(ctx, input.UserID, page, limit)
	if err != nil {
		return nil, err
	}

	totalItems := 0
	if len(rows) > 0 {
		totalItems = int(rows[0].TotalCount)
	} else if page > 1 {
		totalCount, err := repositories.CountAttemptHistoryByUser(ctx, input.UserID)
		if err != nil {
			return nil, err
		}
		totalItems = int(totalCount)
	}

	totalPages := 1
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
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

	response := &AttemptHistoryResponse{
		Items:        items,
		TotalItems:   totalItems,
		CurrentPage:  page,
		TotalPages:   totalPages,
		ItemsPerPage: limit,
	}

	cacheAttemptHistory(ctx, cacheKey, response)
	return response, nil
}

func normalizeAttemptHistoryPagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = defaultAttemptHistoryPageLimit
	}
	if limit > maxAttemptHistoryPageLimit {
		limit = maxAttemptHistoryPageLimit
	}

	return page, limit
}

func buildAttemptHistoryCacheKey(userID string, page, limit int) string {
	return fmt.Sprintf("attempt-history:%s:user:%s:page:%d:limit:%d", attemptHistoryCacheVersion, userID, page, limit)
}

func buildAttemptHistoryPayloadCacheKey(userID string, page, limit int) string {
	return fmt.Sprintf("attempt-history-payload:%s:user:%s:page:%d:limit:%d", attemptHistoryCacheVersion, userID, page, limit)
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

func cacheAttemptHistory(ctx context.Context, cacheKey string, result *AttemptHistoryResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptHistoryCacheTTL).Err()
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

func cacheAttemptHistoryPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, attemptHistoryPayloadCacheTTL).Err()
}

func invalidateAttemptHistoryCachesForUser(ctx context.Context, userID string) {
	if !config.RedisEnabled || config.RedisClient == nil || strings.TrimSpace(userID) == "" {
		return
	}

	redisCtx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	patterns := []string{
		fmt.Sprintf("attempt-history:%s:user:%s:*", attemptHistoryCacheVersion, userID),
		fmt.Sprintf("attempt-history-payload:%s:user:%s:*", attemptHistoryCacheVersion, userID),
	}

	for _, pattern := range patterns {
		var cursor uint64
		for {
			keys, nextCursor, err := config.RedisClient.Scan(redisCtx, cursor, pattern, 100).Result()
			if err != nil {
				break
			}
			if len(keys) > 0 {
				_ = config.RedisClient.Del(redisCtx, keys...).Err()
			}
			cursor = nextCursor
			if cursor == 0 {
				break
			}
		}
	}
}
