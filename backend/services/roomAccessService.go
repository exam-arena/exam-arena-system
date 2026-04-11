package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"

	"golang.org/x/sync/singleflight"
)

var (
	ErrRoomAccessForbidden = errors.New("room access forbidden")
	ErrRoomInactive        = errors.New("room inactive")
	roomAccessGroup        singleflight.Group
	roomJoinGroup          singleflight.Group
)

const roomAccessCacheTTL = 15 * time.Second

type JoinRoomInput struct {
	UserID string
	RoomID string
}

type JoinRoomResponse struct {
	RoomID           string     `json:"room_id"`
	AccessGranted    bool       `json:"access_granted"`
	RequiresPayment  bool       `json:"requires_payment"`
	MembershipStatus string     `json:"membership_status"`
	Price            float64    `json:"price"`
	GrantedAt        *time.Time `json:"granted_at,omitempty"`
	ExpiredAt        *time.Time `json:"expired_at,omitempty"`
	SourceType       string     `json:"source_type,omitempty"`
}

type cachedRoomAccessEntry struct {
	HasAccess bool                        `json:"has_access"`
	Access    *repositories.RoomAccessRow `json:"access,omitempty"`
}

func JoinRoom(ctx context.Context, input JoinRoomInput) (*JoinRoomResponse, error) {
	if input.UserID == "" || input.RoomID == "" {
		return nil, ErrRoomNotFound
	}
	if ctx == nil {
		ctx = context.Background()
	}

	room, err := repositories.GetRoomByID(input.RoomID)
	if err != nil {
		return nil, err
	}
	if room == nil {
		return nil, ErrRoomNotFound
	}
	if !strings.EqualFold(room.Status, "active") {
		return nil, ErrRoomInactive
	}

	access, err := GetValidRoomAccess(ctx, input.UserID, input.RoomID)
	if err != nil {
		return nil, err
	}
	if access != nil {
		warmRoomDetailPayloadAsync(input.UserID, input.RoomID)
		return buildJoinRoomGrantedResponse(room.Price, access), nil
	}

	if room.Price > 0 {
		return &JoinRoomResponse{
			RoomID:           input.RoomID,
			AccessGranted:    false,
			RequiresPayment:  true,
			MembershipStatus: "payment_required",
			Price:            room.Price,
		}, nil
	}

	key := fmt.Sprintf("join-room:%s:%s", input.UserID, input.RoomID)
	result, err, _ := roomJoinGroup.Do(key, func() (interface{}, error) {
		releaseLock, lockErr := acquireRedisLockWithRetry(ctx, "join-room-lock:"+input.UserID+":"+input.RoomID)
		if lockErr != nil {
			return nil, lockErr
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		currentAccess, accessErr := GetValidRoomAccess(ctx, input.UserID, input.RoomID)
		if accessErr != nil {
			return nil, accessErr
		}
		if currentAccess != nil {
			warmRoomDetailPayloadAsync(input.UserID, input.RoomID)
			return buildJoinRoomGrantedResponse(room.Price, currentAccess), nil
		}

		grantedAccess, grantErr := GrantRoomAccess(ctx, repositories.GrantRoomAccessInput{
			UserID:     input.UserID,
			RoomID:     input.RoomID,
			SourceType: "free_join",
		})
		if grantErr != nil {
			return nil, grantErr
		}
		if grantedAccess == nil {
			return nil, ErrRoomAccessForbidden
		}

		return buildJoinRoomGrantedResponse(room.Price, grantedAccess), nil
	})
	if err != nil {
		return nil, err
	}

	return result.(*JoinRoomResponse), nil
}

func GetValidRoomAccess(ctx context.Context, userID, roomID string) (*repositories.RoomAccessRow, error) {
	if userID == "" || roomID == "" {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildRoomAccessCacheKey(userID, roomID)
	if entry, ok := loadRoomAccessFromCache(ctx, cacheKey); ok {
		if !entry.HasAccess {
			return nil, nil
		}
		return entry.Access, nil
	}

	result, err, _ := roomAccessGroup.Do(cacheKey, func() (interface{}, error) {
		if entry, ok := loadRoomAccessFromCache(ctx, cacheKey); ok {
			return entry, nil
		}

		access, queryErr := repositories.GetValidRoomAccess(ctx, userID, roomID)
		if queryErr != nil {
			return nil, queryErr
		}

		entry := cachedRoomAccessEntry{
			HasAccess: access != nil,
			Access:    access,
		}
		storeRoomAccessInCache(ctx, cacheKey, entry)
		return entry, nil
	})
	if err != nil {
		return nil, err
	}

	entry := result.(cachedRoomAccessEntry)
	if !entry.HasAccess {
		return nil, nil
	}

	return entry.Access, nil
}

func GrantRoomAccess(ctx context.Context, input repositories.GrantRoomAccessInput) (*repositories.RoomAccessRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	access, err := repositories.GrantRoomAccess(ctx, input)
	if err != nil {
		return nil, err
	}

	cacheKey := buildRoomAccessCacheKey(input.UserID, input.RoomID)
	storeRoomAccessInCache(ctx, cacheKey, cachedRoomAccessEntry{
		HasAccess: access != nil,
		Access:    access,
	})
	invalidateRoomListCacheForUser(ctx, input.UserID)
	warmRoomDetailPayloadAsync(input.UserID, input.RoomID)

	return access, nil
}

func buildJoinRoomGrantedResponse(price float64, access *repositories.RoomAccessRow) *JoinRoomResponse {
	if access == nil {
		return nil
	}

	grantedAt := access.GrantedAt
	return &JoinRoomResponse{
		RoomID:           access.RoomID,
		AccessGranted:    true,
		RequiresPayment:  false,
		MembershipStatus: access.Status,
		Price:            price,
		GrantedAt:        &grantedAt,
		ExpiredAt:        access.ExpiredAt,
		SourceType:       access.SourceType,
	}
}

func buildRoomAccessCacheKey(userID, roomID string) string {
	return fmt.Sprintf("room-access:%s:%s", userID, roomID)
}

func loadRoomAccessFromCache(ctx context.Context, cacheKey string) (cachedRoomAccessEntry, bool) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return cachedRoomAccessEntry{}, false
	}

	cacheCtx, cancel := cacheContext(ctx)
	defer cancel()

	payload, err := config.RedisClient.Get(cacheCtx, cacheKey).Result()
	if err != nil {
		return cachedRoomAccessEntry{}, false
	}

	var entry cachedRoomAccessEntry
	if err := json.Unmarshal([]byte(payload), &entry); err != nil {
		return cachedRoomAccessEntry{}, false
	}

	return entry, true
}

func storeRoomAccessInCache(ctx context.Context, cacheKey string, entry cachedRoomAccessEntry) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	payload, err := json.Marshal(entry)
	if err != nil {
		return
	}

	cacheCtx, cancel := cacheContext(ctx)
	defer cancel()

	_ = config.RedisClient.Set(cacheCtx, cacheKey, payload, roomAccessCacheTTL).Err()
}

func warmRoomDetailPayloadAsync(userID, roomID string) {
	if userID == "" || roomID == "" {
		return
	}

	go func() {
		warmCtx, cancel := context.WithTimeout(ctxOrBackground(context.Background()), 2*time.Second)
		defer cancel()

		if _, err := GetRoomDetailPayload(warmCtx, roomID, userID, ""); err != nil {
			log.Printf("[WARN] warmRoomDetailPayloadAsync: failed to warm room %s for user %s: %v", roomID, userID, err)
		}
	}()
}
