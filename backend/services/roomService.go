package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"golang.org/x/sync/singleflight"
)

const (
	defaultRoomListPageLimit = 6
	maxRoomListPageLimit     = 50
	roomListCacheTTL         = 60 * time.Second
	roomListPayloadCacheTTL  = 60 * time.Second
	defaultHotRoomLimit      = 4
	maxHotRoomLimit          = 12
	hotRoomCacheTTL          = 60 * time.Second
	hotRoomPayloadCacheTTL   = 60 * time.Second
)

var (
	roomListGroup singleflight.Group
	hotRoomGroup  singleflight.Group
)

type GetRoomsInput struct {
	Page  int
	Limit int
}

type GetHotRoomsInput struct {
	Limit int
}

type RoomListItemResponse struct {
	RoomID       string  `json:"room_id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Price        float64 `json:"price"`
	TestQuantity int     `json:"test_quantity"`
	Status       string  `json:"status"`
}

type RoomListResponse struct {
	Items        []RoomListItemResponse `json:"items"`
	TotalItems   int                    `json:"totalItems"`
	CurrentPage  int                    `json:"currentPage"`
	TotalPages   int                    `json:"totalPages"`
	ItemsPerPage int                    `json:"itemsPerPage"`
}

func GetRooms(ctx context.Context, input GetRoomsInput) (*RoomListResponse, error) {
	return buildRoomListResponse(ctx, input)
}

func GetHotRooms(ctx context.Context, input GetHotRoomsInput) ([]RoomListItemResponse, error) {
	return buildHotRoomResponse(ctx, input)
}

func GetRoomsPayload(ctx context.Context, input GetRoomsInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeRoomListPagination(input.Page, input.Limit)
	cacheKey := buildRoomListPayloadCacheKey(page, limit)
	if payload := getCachedRoomListPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildRoomListCacheKey(page, limit)
	result, err, _ := roomListGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildRoomListPayloadCacheKey(page, limit)
		if payload := getCachedRoomListPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireReadThroughCacheLock(ctx, "room-list", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedRoomListPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildRoomListResponse(ctx, GetRoomsInput{Page: page, Limit: limit})
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

		cacheRoomListPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func GetHotRoomsPayload(ctx context.Context, input GetHotRoomsInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeHotRoomLimit(input.Limit)
	cacheKey := buildHotRoomPayloadCacheKey(limit)
	if payload := getCachedHotRoomPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildHotRoomCacheKey(limit)
	result, err, _ := hotRoomGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildHotRoomPayloadCacheKey(limit)
		if payload := getCachedHotRoomPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireReadThroughCacheLock(ctx, "room-hot", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedHotRoomPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildHotRoomResponse(ctx, GetHotRoomsInput{Limit: limit})
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

		cacheHotRoomPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func normalizeRoomListPagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = defaultRoomListPageLimit
	}
	if limit > maxRoomListPageLimit {
		limit = maxRoomListPageLimit
	}

	return page, limit
}

func normalizeHotRoomLimit(limit int) int {
	if limit <= 0 {
		limit = defaultHotRoomLimit
	}
	if limit > maxHotRoomLimit {
		limit = maxHotRoomLimit
	}

	return limit
}

func buildRoomListCacheKey(page, limit int) string {
	return fmt.Sprintf("room-list:page:%d:limit:%d", page, limit)
}

func buildHotRoomCacheKey(limit int) string {
	return fmt.Sprintf("room-list-hot:limit:%d", limit)
}

func buildRoomListPayloadCacheKey(page, limit int) string {
	return fmt.Sprintf("room-list-payload:page:%d:limit:%d", page, limit)
}

func buildHotRoomPayloadCacheKey(limit int) string {
	return fmt.Sprintf("room-list-hot-payload:limit:%d", limit)
}

func acquireReadThroughCacheLock(ctx context.Context, namespace, cacheKey string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, namespace+":cache-fill-lock:"+cacheKey)
}

func buildRoomListResponse(ctx context.Context, input GetRoomsInput) (*RoomListResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeRoomListPagination(input.Page, input.Limit)
	cacheKey := buildRoomListCacheKey(page, limit)
	if cached := getCachedRoomList(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	rows, err := repositories.ListRooms(ctx, page, limit)
	if err != nil {
		return nil, err
	}

	totalItems := 0
	if len(rows) > 0 {
		totalItems = int(rows[0].TotalCount)
	} else if page > 1 {
		total, err := repositories.CountRooms(ctx)
		if err != nil {
			return nil, err
		}
		totalItems = int(total)
	}

	totalPages := 1
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	items := make([]RoomListItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, RoomListItemResponse{
			RoomID:       row.RoomID,
			Name:         row.Name,
			Type:         row.Type,
			Price:        row.Price,
			TestQuantity: row.TestQuantity,
			Status:       row.Status,
		})
	}

	response := &RoomListResponse{
		Items:        items,
		TotalItems:   totalItems,
		CurrentPage:  page,
		TotalPages:   totalPages,
		ItemsPerPage: limit,
	}

	cacheRoomList(ctx, cacheKey, response)
	return response, nil
}

func buildHotRoomResponse(ctx context.Context, input GetHotRoomsInput) ([]RoomListItemResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeHotRoomLimit(input.Limit)
	cacheKey := buildHotRoomCacheKey(limit)
	if cached := getCachedHotRooms(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	rows, err := repositories.ListHotRooms(ctx, limit)
	if err != nil {
		return nil, err
	}

	items := make([]RoomListItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, RoomListItemResponse{
			RoomID:       row.RoomID,
			Name:         row.Name,
			Type:         row.Type,
			Price:        row.Price,
			TestQuantity: row.TestQuantity,
			Status:       row.Status,
		})
	}

	cacheHotRooms(ctx, cacheKey, items)
	return items, nil
}

func getCachedRoomList(ctx context.Context, cacheKey string) *RoomListResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result RoomListResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}
	if result.Items == nil {
		result.Items = make([]RoomListItemResponse, 0)
	}

	return &result
}

func getCachedHotRooms(ctx context.Context, cacheKey string) []RoomListItemResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result []RoomListItemResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}
	if result == nil {
		result = make([]RoomListItemResponse, 0)
	}

	return result
}

func cacheRoomList(ctx context.Context, cacheKey string, result *RoomListResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, roomListCacheTTL).Err()
}

func cacheHotRooms(ctx context.Context, cacheKey string, result []RoomListItemResponse) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, hotRoomCacheTTL).Err()
}

func getCachedRoomListPayload(ctx context.Context, cacheKey string) []byte {
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

func getCachedHotRoomPayload(ctx context.Context, cacheKey string) []byte {
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

func cacheRoomListPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, roomListPayloadCacheTTL).Err()
}

func cacheHotRoomPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, hotRoomPayloadCacheTTL).Err()
}
