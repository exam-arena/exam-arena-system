package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"
	"golang.org/x/sync/singleflight"
)

const (
	defaultRoomExamPageLimit = 8
	maxRoomExamPageLimit     = 50
	roomExamCacheTTL         = 60 * time.Second
	roomExamPayloadCacheTTL  = 60 * time.Second
	roomExamCacheWaitWindow  = 500 * time.Millisecond
	roomExamCachePollDelay   = 50 * time.Millisecond
)

var (
	ErrRoomNotFound = errors.New("room not found")
	roomExamGroup   singleflight.Group
)

type GetRoomExamsInput struct {
	UserID string
	RoomID string
	Page   int
	Limit  int
}

type ExamRoomListItem struct {
	ExamID    string     `json:"exam_id"`
	RoomID    string     `json:"room_id"`
	Title     string     `json:"title"`
	Type      string     `json:"type"`
	Duration  int        `json:"duration"`
	StartTime *time.Time `json:"start_time,omitempty"`
}

type RoomExamListResponse struct {
	Items        []ExamRoomListItem `json:"items"`
	TotalItems   int                `json:"totalItems"`
	CurrentPage  int                `json:"currentPage"`
	TotalPages   int                `json:"totalPages"`
	ItemsPerPage int                `json:"itemsPerPage"`
}

func GetRoomExams(input GetRoomExamsInput) (*RoomExamListResponse, error) {
	return buildRoomExamResponse(context.Background(), input)
}

func GetRoomExamsPayload(ctx context.Context, input GetRoomExamsInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if input.UserID == "" {
		return nil, ErrRoomAccessForbidden
	}

	access, err := GetValidRoomAccess(ctx, input.UserID, input.RoomID)
	if err != nil {
		return nil, err
	}
	if access == nil {
		return nil, ErrRoomAccessForbidden
	}

	page, limit := normalizeRoomExamPagination(input.Page, input.Limit)
	payloadCacheKey := buildRoomExamPayloadCacheKey(input.RoomID, page, limit)
	if payload := getCachedRoomExamPayload(ctx, payloadCacheKey); payload != nil {
		return payload, nil
	}

	cacheKey := buildRoomExamCacheKey(input.RoomID, page, limit)

	result, err, _ := roomExamGroup.Do(cacheKey, func() (interface{}, error) {
		if payload := getCachedRoomExamPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireRoomExamReadThroughCacheLock(ctx, payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		} else if payload := waitForCachedRoomExamPayload(ctx, payloadCacheKey, roomExamCacheWaitWindow); payload != nil {
			return payload, nil
		}

		if payload := getCachedRoomExamPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildRoomExamResponse(ctx, GetRoomExamsInput{
			UserID: input.UserID,
			RoomID: input.RoomID,
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

		cacheRoomExamPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func buildRoomExamResponse(ctx context.Context, input GetRoomExamsInput) (*RoomExamListResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if input.UserID == "" {
		return nil, ErrRoomAccessForbidden
	}

	access, err := GetValidRoomAccess(ctx, input.UserID, input.RoomID)
	if err != nil {
		return nil, err
	}
	if access == nil {
		return nil, ErrRoomAccessForbidden
	}

	page, limit := normalizeRoomExamPagination(input.Page, input.Limit)
	cacheKey := buildRoomExamCacheKey(input.RoomID, page, limit)

	if cached := getCachedRoomExams(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	result, err, _ := roomExamGroup.Do("data:"+cacheKey, func() (interface{}, error) {
		if cached := getCachedRoomExams(ctx, cacheKey); cached != nil {
			return cached, nil
		}

		releaseLock, err := acquireRoomExamReadThroughCacheLock(ctx, cacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		} else if cached := waitForCachedRoomExams(ctx, cacheKey, roomExamCacheWaitWindow); cached != nil {
			return cached, nil
		}

		if cached := getCachedRoomExams(ctx, cacheKey); cached != nil {
			return cached, nil
		}

		rows, err := repositories.ListExamsByRoomID(ctx, input.RoomID, page, limit)
		if err != nil {
			return nil, err
		}

		totalItems := 0
		if len(rows) > 0 {
			totalItems = int(rows[0].TotalCount)
		} else {
			meta, err := repositories.GetRoomExamMeta(ctx, input.RoomID)
			if err != nil {
				return nil, err
			}
			if meta == nil || !meta.RoomExists {
				return nil, ErrRoomNotFound
			}

			totalItems = int(meta.TotalCount)
		}

		items := make([]ExamRoomListItem, 0, len(rows))
		for _, exam := range rows {
			items = append(items, ExamRoomListItem{
				ExamID:    exam.ExamID,
				RoomID:    exam.RoomID,
				Title:     exam.Title,
				Type:      exam.Type,
				Duration:  exam.Duration,
				StartTime: exam.StartTime,
			})
		}

		totalPages := 1
		if totalItems > 0 {
			totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
		}

		response := &RoomExamListResponse{
			Items:        items,
			TotalItems:   totalItems,
			CurrentPage:  page,
			TotalPages:   totalPages,
			ItemsPerPage: limit,
		}

		cacheRoomExams(ctx, cacheKey, response)

		return response, nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*RoomExamListResponse), nil
}

func normalizeRoomExamPagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = defaultRoomExamPageLimit
	}
	if limit > maxRoomExamPageLimit {
		limit = maxRoomExamPageLimit
	}
	return page, limit
}

func buildRoomExamCacheKey(roomID string, page, limit int) string {
	return fmt.Sprintf("room-exams:%s:page:%d:limit:%d", roomID, page, limit)
}

func buildRoomExamPayloadCacheKey(roomID string, page, limit int) string {
	return fmt.Sprintf("room-exams-payload:%s:page:%d:limit:%d", roomID, page, limit)
}

func acquireRoomExamReadThroughCacheLock(ctx context.Context, cacheKey string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, "room-exams:cache-fill-lock:"+cacheKey)
}

func getCachedRoomExams(ctx context.Context, cacheKey string) *RoomExamListResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result RoomExamListResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}

	return &result
}

func cacheRoomExams(ctx context.Context, cacheKey string, result *RoomExamListResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, roomExamCacheTTL).Err()
}

func getCachedRoomExamPayload(ctx context.Context, cacheKey string) []byte {
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

func cacheRoomExamPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, roomExamPayloadCacheTTL).Err()
}

func waitForCachedRoomExams(ctx context.Context, cacheKey string, maxWait time.Duration) *RoomExamListResponse {
	deadline := time.Now().Add(maxWait)

	for time.Now().Before(deadline) {
		if cached := getCachedRoomExams(ctx, cacheKey); cached != nil {
			return cached
		}

		timer := time.NewTimer(roomExamCachePollDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil
		case <-timer.C:
		}
	}

	return getCachedRoomExams(ctx, cacheKey)
}

func waitForCachedRoomExamPayload(ctx context.Context, cacheKey string, maxWait time.Duration) []byte {
	deadline := time.Now().Add(maxWait)

	for time.Now().Before(deadline) {
		if payload := getCachedRoomExamPayload(ctx, cacheKey); payload != nil {
			return payload
		}

		timer := time.NewTimer(roomExamCachePollDelay)
		select {
		case <-ctx.Done():
			timer.Stop()
			return nil
		case <-timer.C:
		}
	}

	return getCachedRoomExamPayload(ctx, cacheKey)
}
