package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math"
	"sync"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"golang.org/x/sync/singleflight"
)

const (
	defaultRoomListPageLimit  = 6
	maxRoomListPageLimit      = 50
	roomListPayloadCacheTTL   = 60 * time.Second
	roomCountCacheTTL         = 5 * time.Minute
	defaultHotRoomLimit       = 4
	maxHotRoomLimit           = 12
	hotRoomPayloadCacheTTL    = 60 * time.Second
	hotRoomBaseCacheTTL       = 60 * time.Second
	roomDetailPayloadCacheTTL = 60 * time.Second
	roomDetailBaseCacheTTL    = 60 * time.Second
	roomAccessVersionL1TTL    = 2 * time.Second
)

var (
	roomListGroup       singleflight.Group
	hotRoomGroup        singleflight.Group
	hotRoomBaseGroup    singleflight.Group
	roomDetailGroup     singleflight.Group
	roomDetailBaseGroup singleflight.Group
	roomCountGroup      singleflight.Group

	roomAccessVersionCacheMu sync.RWMutex
	roomAccessVersionCache   = make(map[string]roomAccessVersionCacheEntry)
)

type roomAccessVersionCacheEntry struct {
	Version   int64
	ExpiresAt time.Time
}

type GetRoomsInput struct {
	UserID        string
	CacheAudience string
	Page          int
	Limit         int
}

type GetHotRoomsInput struct {
	UserID        string
	CacheAudience string
	Limit         int
}

type RoomListItemResponse struct {
	RoomID       string  `json:"room_id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Price        float64 `json:"price"`
	TestQuantity int     `json:"test_quantity"`
	Status       string  `json:"status"`
	HasAccess    bool    `json:"has_access"`
}

type RoomListResponse struct {
	Items        []RoomListItemResponse `json:"items"`
	TotalItems   int                    `json:"totalItems"`
	CurrentPage  int                    `json:"currentPage"`
	TotalPages   int                    `json:"totalPages"`
	ItemsPerPage int                    `json:"itemsPerPage"`
}

type RoomDetailResponse struct {
	RoomID       string  `json:"room_id"`
	Name         string  `json:"name"`
	Type         string  `json:"type"`
	Price        float64 `json:"price"`
	TestQuantity int     `json:"test_quantity"`
	Status       string  `json:"status"`
	HasAccess    bool    `json:"has_access"`
}

func GetRooms(ctx context.Context, input GetRoomsInput) (*RoomListResponse, error) {
	return buildRoomListResponse(ctx, input)
}

func GetHotRooms(ctx context.Context, input GetHotRoomsInput) ([]RoomListItemResponse, error) {
	return buildHotRoomResponse(ctx, input)
}

func GetRoomDetail(ctx context.Context, roomID, userID string) (*RoomDetailResponse, error) {
	return buildRoomDetailResponse(ctx, roomID, userID)
}

func GetRoomDetailPayload(ctx context.Context, roomID, userID, cacheAudience string) ([]byte, error) {
	if roomID == "" {
		return nil, ErrRoomNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

	audience := ensureRoomCacheAudience(ctx, userID, cacheAudience)
	cacheKey := buildRoomDetailPayloadCacheKey(audience, roomID)
	if payload := getCachedPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildRoomDetailPayloadCacheKey(audience, roomID)
	result, err, _ := roomDetailGroup.Do(groupKey, func() (interface{}, error) {
		if payload := getCachedPayload(ctx, cacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireReadThroughCacheLock(ctx, "room-detail", cacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedPayload(ctx, cacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildRoomDetailResponse(ctx, roomID, userID)
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

		cachePayload(ctx, cacheKey, payload, roomDetailPayloadCacheTTL)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func GetRoomsPayload(ctx context.Context, input GetRoomsInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	audience := ensureRoomCacheAudience(ctx, input.UserID, input.CacheAudience)
	page, limit := normalizeRoomListPagination(input.Page, input.Limit)
	cacheKey := buildRoomListPayloadCacheKey(audience, page, limit)
	if payload := getCachedPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildRoomListCacheKey(audience, page, limit)
	result, err, _ := roomListGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildRoomListPayloadCacheKey(audience, page, limit)
		if payload := getCachedPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireReadThroughCacheLock(ctx, "room-list", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildRoomListResponse(ctx, GetRoomsInput{
			UserID:        input.UserID,
			CacheAudience: audience,
			Page:          page,
			Limit:         limit,
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

		cachePayload(ctx, payloadCacheKey, payload, roomListPayloadCacheTTL)
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

	audience := ensureRoomCacheAudience(ctx, input.UserID, input.CacheAudience)
	limit := normalizeHotRoomLimit(input.Limit)
	cacheKey := buildHotRoomPayloadCacheKey(audience, limit)
	if payload := getCachedPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildHotRoomCacheKey(audience, limit)
	result, err, _ := hotRoomGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildHotRoomPayloadCacheKey(audience, limit)
		if payload := getCachedPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireReadThroughCacheLock(ctx, "room-hot", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildHotRoomResponse(ctx, GetHotRoomsInput{
			UserID:        input.UserID,
			CacheAudience: audience,
			Limit:         limit,
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

		cachePayload(ctx, payloadCacheKey, payload, hotRoomPayloadCacheTTL)
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

func buildRoomListCacheKey(audience string, page, limit int) string {
	return fmt.Sprintf("room-list:%s:page:%d:limit:%d", audience, page, limit)
}

func buildHotRoomCacheKey(audience string, limit int) string {
	return fmt.Sprintf("room-list-hot:%s:limit:%d", audience, limit)
}

func buildRoomListPayloadCacheKey(audience string, page, limit int) string {
	return fmt.Sprintf("room-list-payload:%s:page:%d:limit:%d", audience, page, limit)
}

func buildHotRoomPayloadCacheKey(audience string, limit int) string {
	return fmt.Sprintf("room-list-hot-payload:%s:limit:%d", audience, limit)
}

func buildHotRoomBaseCacheKey(limit int) string {
	return fmt.Sprintf("room-list-hot:base:limit:%d", limit)
}

func buildRoomDetailPayloadCacheKey(audience, roomID string) string {
	return fmt.Sprintf("room-detail-payload:%s:room:%s", audience, roomID)
}

func buildRoomDetailBaseCacheKey(roomID string) string {
	return fmt.Sprintf("room-detail:base:room:%s", roomID)
}

func buildRoomCountCacheKey() string {
	return "room-count"
}

func acquireReadThroughCacheLock(ctx context.Context, namespace, cacheKey string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, namespace+":cache-fill-lock:"+cacheKey)
}

func buildRoomDetailResponse(ctx context.Context, roomID, userID string) (*RoomDetailResponse, error) {
	if roomID == "" {
		return nil, ErrRoomNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

	room, err := getCachedRoomBaseDetail(ctx, roomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrRoomNotFound
	}

	hasAccess := false
	if userID != "" {
		access, err := GetValidRoomAccess(ctx, userID, roomID)
		if err != nil {
			return nil, err
		}
		hasAccess = access != nil
	}

	return &RoomDetailResponse{
		RoomID:       room.RoomID,
		Name:         room.Name,
		Type:         room.Type,
		Price:        room.Price,
		TestQuantity: room.TestQuantity,
		Status:       room.Status,
		HasAccess:    hasAccess,
	}, nil
}

func buildRoomListResponse(ctx context.Context, input GetRoomsInput) (*RoomListResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeRoomListPagination(input.Page, input.Limit)
	rows, err := repositories.ListRooms(ctx, page, limit)
	if err != nil {
		return nil, err
	}

	accessMap, err := listAccessibleRoomMap(ctx, input.UserID, rows)
	if err != nil {
		return nil, err
	}

	total, err := getCachedRoomCount(ctx)
	if err != nil {
		return nil, err
	}
	totalItems := int(total)

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
			HasAccess:    roomIsAccessible(row.RoomID, accessMap),
		})
	}

	response := &RoomListResponse{
		Items:        items,
		TotalItems:   totalItems,
		CurrentPage:  page,
		TotalPages:   totalPages,
		ItemsPerPage: limit,
	}

	return response, nil
}

func buildHotRoomResponse(ctx context.Context, input GetHotRoomsInput) ([]RoomListItemResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeHotRoomLimit(input.Limit)
	baseItems, err := getCachedHotRoomBase(ctx, limit)
	if err != nil {
		return nil, err
	}

	if input.UserID == "" {
		return cloneRoomListItems(baseItems), nil
	}

	accessMap, err := listAccessibleRoomIDs(ctx, input.UserID, collectRoomIDs(baseItems))
	if err != nil {
		return nil, err
	}

	items := make([]RoomListItemResponse, 0, len(baseItems))
	for _, row := range baseItems {
		items = append(items, RoomListItemResponse{
			RoomID:       row.RoomID,
			Name:         row.Name,
			Type:         row.Type,
			Price:        row.Price,
			TestQuantity: row.TestQuantity,
			Status:       row.Status,
			HasAccess:    roomIsAccessible(row.RoomID, accessMap),
		})
	}

	return items, nil
}

func getCachedRoomItems(ctx context.Context, cacheKey string) []RoomListItemResponse {
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

func getCachedRoomCount(ctx context.Context) (int64, error) {
	cacheKey := buildRoomCountCacheKey()
	if payload := getCachedPayload(ctx, cacheKey); payload != nil {
		var total int64
		if err := json.Unmarshal(payload, &total); err == nil && total >= 0 {
			return total, nil
		}
	}

	result, err, _ := roomCountGroup.Do(cacheKey, func() (interface{}, error) {
		if payload := getCachedPayload(ctx, cacheKey); payload != nil {
			var total int64
			if err := json.Unmarshal(payload, &total); err == nil && total >= 0 {
				return total, nil
			}
		}

		total, err := repositories.CountRooms(ctx)
		if err != nil {
			return nil, err
		}

		if payload, err := json.Marshal(total); err == nil {
			cachePayload(ctx, cacheKey, payload, roomCountCacheTTL)
		}

		return total, nil
	})
	if err != nil {
		return 0, err
	}

	return result.(int64), nil
}

func listAccessibleRoomMap(ctx context.Context, userID string, rows []repositories.RoomListRow) (map[string]struct{}, error) {
	roomIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		if row.RoomID != "" {
			roomIDs = append(roomIDs, row.RoomID)
		}
	}

	return listAccessibleRoomIDs(ctx, userID, roomIDs)
}

func collectRoomIDs(rows []RoomListItemResponse) []string {
	roomIDs := make([]string, 0, len(rows))
	for _, row := range rows {
		if row.RoomID != "" {
			roomIDs = append(roomIDs, row.RoomID)
		}
	}

	return roomIDs
}

func listAccessibleRoomIDs(ctx context.Context, userID string, roomIDs []string) (map[string]struct{}, error) {
	if userID == "" || len(roomIDs) == 0 {
		return map[string]struct{}{}, nil
	}

	return repositories.ListAccessibleRoomIDs(ctx, userID, roomIDs)
}

func roomIsAccessible(roomID string, accessMap map[string]struct{}) bool {
	if roomID == "" || len(accessMap) == 0 {
		return false
	}

	_, ok := accessMap[roomID]
	return ok
}

func invalidateRoomListCacheForUser(ctx context.Context, userID string) {
	if userID == "" {
		return
	}

	bumpUserRoomAccessVersion(ctx, userID)
}

func ensureRoomCacheAudience(ctx context.Context, userID, cacheAudience string) string {
	if cacheAudience != "" {
		return cacheAudience
	}

	return roomCacheAudience(ctx, userID)
}

func roomCacheAudience(ctx context.Context, userID string) string {
	if userID == "" {
		return "anon"
	}

	version := getUserRoomAccessVersion(ctx, userID)
	return fmt.Sprintf("user:%s:v%d", userID, version)
}

func getUserRoomAccessVersion(ctx context.Context, userID string) int64 {
	if userID == "" || !config.RedisEnabled || config.RedisClient == nil {
		return 1
	}

	if version, ok := getRoomAccessVersionL1(userID); ok {
		return version
	}

	cacheCtx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	value, err := config.RedisClient.Get(cacheCtx, buildUserRoomAccessVersionKey(userID)).Int64()
	if err != nil || value <= 0 {
		setRoomAccessVersionL1(userID, 1)
		return 1
	}

	setRoomAccessVersionL1(userID, value)
	return value
}

func bumpUserRoomAccessVersion(ctx context.Context, userID string) {
	if userID == "" || !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	cacheCtx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	key := buildUserRoomAccessVersionKey(userID)
	version, err := config.RedisClient.Incr(cacheCtx, key).Result()
	if err != nil {
		return
	}

	setRoomAccessVersionL1(userID, version)

	if version == 1 {
		_ = config.RedisClient.Expire(cacheCtx, key, 30*24*time.Hour).Err()
	}
}

func buildUserRoomAccessVersionKey(userID string) string {
	return fmt.Sprintf("user-room-access-version:%s", userID)
}

func getCachedHotRoomBase(ctx context.Context, limit int) ([]RoomListItemResponse, error) {
	cacheKey := buildHotRoomBaseCacheKey(limit)
	if cached := getCachedRoomItems(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	result, err, _ := hotRoomBaseGroup.Do(cacheKey, func() (interface{}, error) {
		if cached := getCachedRoomItems(ctx, cacheKey); cached != nil {
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
				HasAccess:    false,
			})
		}

		cacheRoomItems(ctx, cacheKey, items, hotRoomBaseCacheTTL)
		return items, nil
	})
	if err != nil {
		return nil, err
	}

	return cloneRoomListItems(result.([]RoomListItemResponse)), nil
}

func getCachedRoomBaseDetail(ctx context.Context, roomID string) (*RoomDetailResponse, error) {
	cacheKey := buildRoomDetailBaseCacheKey(roomID)
	if payload := getCachedPayload(ctx, cacheKey); payload != nil {
		var result RoomDetailResponse
		if err := json.Unmarshal(payload, &result); err == nil {
			return &result, nil
		}
	}

	result, err, _ := roomDetailBaseGroup.Do(cacheKey, func() (interface{}, error) {
		if payload := getCachedPayload(ctx, cacheKey); payload != nil {
			var cached RoomDetailResponse
			if err := json.Unmarshal(payload, &cached); err == nil {
				return &cached, nil
			}
		}

		room, err := repositories.GetRoomByID(roomID)
		if err != nil {
			return nil, err
		}
		if room == nil {
			return nil, nil
		}

		base := &RoomDetailResponse{
			RoomID:       room.RoomID,
			Name:         room.Name,
			Type:         room.Type,
			Price:        room.Price,
			TestQuantity: room.TestQuantity,
			Status:       room.Status,
			HasAccess:    false,
		}

		if payload, err := json.Marshal(base); err == nil {
			cachePayload(ctx, cacheKey, payload, roomDetailBaseCacheTTL)
		}

		return base, nil
	})
	if err != nil {
		return nil, err
	}
	if result == nil {
		return nil, nil
	}

	return result.(*RoomDetailResponse), nil
}

func cloneRoomListItems(items []RoomListItemResponse) []RoomListItemResponse {
	if items == nil {
		return nil
	}

	cloned := make([]RoomListItemResponse, len(items))
	copy(cloned, items)
	return cloned
}

func cacheRoomItems(ctx context.Context, cacheKey string, result []RoomListItemResponse, ttl time.Duration) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, ttl).Err()
}

func getCachedPayload(ctx context.Context, cacheKey string) []byte {
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

func cachePayload(ctx context.Context, cacheKey string, payload []byte, ttl time.Duration) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, ttl).Err()
}

func getRoomAccessVersionL1(userID string) (int64, bool) {
	roomAccessVersionCacheMu.RLock()
	entry, ok := roomAccessVersionCache[userID]
	roomAccessVersionCacheMu.RUnlock()
	if !ok || time.Now().After(entry.ExpiresAt) {
		return 0, false
	}

	return entry.Version, true
}

func setRoomAccessVersionL1(userID string, version int64) {
	if userID == "" {
		return
	}

	roomAccessVersionCacheMu.Lock()
	roomAccessVersionCache[userID] = roomAccessVersionCacheEntry{
		Version:   version,
		ExpiresAt: time.Now().Add(roomAccessVersionL1TTL),
	}
	roomAccessVersionCacheMu.Unlock()
}
