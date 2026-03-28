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
	"golang.org/x/sync/singleflight"
)

const (
	defaultRoomExamPageLimit = 8
	maxRoomExamPageLimit     = 50
	roomExamCacheTTL         = 60 * time.Second
)

var (
	ErrRoomNotFound = errors.New("room not found")
	roomExamGroup   singleflight.Group
)

type GetRoomExamsInput struct {
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
	page, limit := normalizeRoomExamPagination(input.Page, input.Limit)
	cacheKey := buildRoomExamCacheKey(input.RoomID, page, limit)

	if cached := getCachedRoomExams(cacheKey); cached != nil {
		return cached, nil
	}

	result, err, _ := roomExamGroup.Do(cacheKey, func() (interface{}, error) {
		// Another request may have warmed the cache while we were waiting.
		if cached := getCachedRoomExams(cacheKey); cached != nil {
			return cached, nil
		}

		total, err := repositories.CountExamsByRoomID(input.RoomID)
		if err != nil {
			return nil, err
		}

		if total == 0 {
			room, err := repositories.GetRoomByID(input.RoomID)
			if err != nil {
				return nil, err
			}
			if room == nil {
				return nil, ErrRoomNotFound
			}
		}

		exams, err := repositories.ListExamsByRoomID(input.RoomID, page, limit)
		if err != nil {
			return nil, err
		}

		items := make([]ExamRoomListItem, 0, len(exams))
		for _, exam := range exams {
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
		if total > 0 {
			totalPages = int(math.Ceil(float64(total) / float64(limit)))
		}

		response := &RoomExamListResponse{
			Items:        items,
			TotalItems:   int(total),
			CurrentPage:  page,
			TotalPages:   totalPages,
			ItemsPerPage: limit,
		}

		cacheRoomExams(cacheKey, response)

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

func getCachedRoomExams(cacheKey string) *RoomExamListResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
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

func cacheRoomExams(cacheKey string, result *RoomExamListResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, roomExamCacheTTL).Err()
}
