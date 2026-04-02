package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"backend/config"
	"backend/repositories"
	"backend/utils"

	"golang.org/x/sync/singleflight"
)

const examSummaryCacheTTL = 5 * time.Minute
const examSummaryPayloadCacheTTL = 5 * time.Minute
const examSummaryCacheVersion = "v2"
const defaultExamListPageLimit = 8
const maxExamListPageLimit = 50
const examListCacheTTL = 60 * time.Second
const examListPayloadCacheTTL = 60 * time.Second
const defaultLatestExamLimit = 8
const maxLatestExamLimit = 20
const latestExamCacheTTL = 60 * time.Second
const latestExamPayloadCacheTTL = 60 * time.Second

var (
	ErrExamNotFound  = errors.New("exam not found")
	examSummaryGroup singleflight.Group
	examListGroup    singleflight.Group
	latestExamGroup  singleflight.Group
)

type GetExamSummaryInput struct {
	ExamID string
}

type GetExamListInput struct {
	Page  int
	Limit int
}

type GetLatestExamsInput struct {
	Limit int
}

type ExamSummaryResponse struct {
	ExamID           string     `json:"exam_id"`
	RoomID           string     `json:"room_id"`
	RoomName         string     `json:"room_name"`
	Title            string     `json:"title"`
	Type             string     `json:"type"`
	Capacity         int        `json:"capacity"`
	Duration         int        `json:"duration"`
	StartTime        *time.Time `json:"start_time,omitempty"`
	TotalQuestions   int        `json:"total_questions"`
	ParticipantCount int        `json:"participant_count"`
	Sections         []struct{} `json:"sections"`
}

type ExamListItemResponse struct {
	ExamID         string     `json:"exam_id"`
	RoomID         string     `json:"room_id"`
	Title          string     `json:"title"`
	Type           string     `json:"type"`
	Capacity       int        `json:"capacity"`
	Duration       int        `json:"duration"`
	StartTime      *time.Time `json:"start_time,omitempty"`
	TotalQuestions int        `json:"total_questions"`
}

type ExamListResponse struct {
	Items        []ExamListItemResponse `json:"items"`
	TotalItems   int                    `json:"totalItems"`
	CurrentPage  int                    `json:"currentPage"`
	TotalPages   int                    `json:"totalPages"`
	ItemsPerPage int                    `json:"itemsPerPage"`
}

func GetExamSummary(ctx context.Context, input GetExamSummaryInput) (*ExamSummaryResponse, error) {
	return buildExamSummaryResponse(ctx, input)
}

func GetExamList(ctx context.Context, input GetExamListInput) (*ExamListResponse, error) {
	return buildExamListResponse(ctx, input)
}

func GetLatestExams(ctx context.Context, input GetLatestExamsInput) ([]ExamListItemResponse, error) {
	return buildLatestExamsResponse(ctx, input)
}

func GetExamListPayload(ctx context.Context, input GetExamListInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeExamListPagination(input.Page, input.Limit)
	cacheKey := buildExamListPayloadCacheKey(page, limit)
	if payload := getCachedExamListPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildExamListCacheKey(page, limit)
	result, err, _ := examListGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildExamListPayloadCacheKey(page, limit)
		if payload := getCachedExamListPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireExamReadThroughCacheLock(ctx, "exam-list", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedExamListPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildExamListResponse(ctx, GetExamListInput{Page: page, Limit: limit})
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

		cacheExamListPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func GetLatestExamsPayload(ctx context.Context, input GetLatestExamsInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeLatestExamLimit(input.Limit)
	cacheKey := buildLatestExamsPayloadCacheKey(limit)
	if payload := getCachedLatestExamsPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildLatestExamsCacheKey(limit)
	result, err, _ := latestExamGroup.Do(groupKey, func() (interface{}, error) {
		payloadCacheKey := buildLatestExamsPayloadCacheKey(limit)
		if payload := getCachedLatestExamsPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		releaseLock, err := acquireExamReadThroughCacheLock(ctx, "exam-latest", payloadCacheKey)
		if err != nil {
			return nil, err
		}
		if releaseLock != nil {
			defer releaseLock()
		}

		if payload := getCachedLatestExamsPayload(ctx, payloadCacheKey); payload != nil {
			return payload, nil
		}

		response, err := buildLatestExamsResponse(ctx, GetLatestExamsInput{Limit: limit})
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

		cacheLatestExamsPayload(ctx, payloadCacheKey, payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func GetExamSummaryPayload(ctx context.Context, input GetExamSummaryInput) ([]byte, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildExamSummaryPayloadCacheKey(input.ExamID)
	if payload := getCachedExamSummaryPayload(ctx, cacheKey); payload != nil {
		return payload, nil
	}

	groupKey := buildExamSummaryCacheKey(input.ExamID)
	result, err, _ := examSummaryGroup.Do(groupKey, func() (interface{}, error) {
		if payload := getCachedExamSummaryPayload(ctx, buildExamSummaryPayloadCacheKey(input.ExamID)); payload != nil {
			return payload, nil
		}

		response, err := buildExamSummaryResponse(ctx, input)
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

		cacheExamSummaryPayload(ctx, buildExamSummaryPayloadCacheKey(input.ExamID), payload)
		return payload, nil
	})
	if err != nil {
		return nil, err
	}

	return result.([]byte), nil
}

func buildExamSummaryCacheKey(examID string) string {
	return fmt.Sprintf("exam-summary:%s:%s", examSummaryCacheVersion, examID)
}

func buildExamListCacheKey(page, limit int) string {
	return fmt.Sprintf("exam-list:page:%d:limit:%d", page, limit)
}

func buildLatestExamsCacheKey(limit int) string {
	return fmt.Sprintf("exam-list-latest:limit:%d", limit)
}

func buildExamSummaryPayloadCacheKey(examID string) string {
	return fmt.Sprintf("exam-summary-payload:%s:%s", examSummaryCacheVersion, examID)
}

func buildExamListPayloadCacheKey(page, limit int) string {
	return fmt.Sprintf("exam-list-payload:page:%d:limit:%d", page, limit)
}

func buildLatestExamsPayloadCacheKey(limit int) string {
	return fmt.Sprintf("exam-list-latest-payload:limit:%d", limit)
}

func acquireExamReadThroughCacheLock(ctx context.Context, namespace, cacheKey string) (func(), error) {
	return acquireRedisLockWithRetry(ctx, namespace+":cache-fill-lock:"+cacheKey)
}

func buildExamSummaryResponse(ctx context.Context, input GetExamSummaryInput) (*ExamSummaryResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	cacheKey := buildExamSummaryCacheKey(input.ExamID)
	if cached := getCachedExamSummary(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	exam, err := repositories.GetExamSummaryByID(ctx, input.ExamID)
	if err != nil {
		return nil, err
	}
	if exam == nil {
		return nil, ErrExamNotFound
	}

	response := &ExamSummaryResponse{
		ExamID:           exam.ExamID,
		RoomID:           exam.RoomID,
		RoomName:         exam.RoomName,
		Title:            exam.Title,
		Type:             exam.Type,
		Capacity:         exam.Capacity,
		Duration:         exam.Duration,
		StartTime:        exam.StartTime,
		TotalQuestions:   exam.TotalQuestions,
		ParticipantCount: exam.ParticipantCount,
		Sections:         make([]struct{}, 0),
	}

	cacheExamSummary(ctx, cacheKey, response)
	return response, nil
}

func normalizeExamListPagination(page, limit int) (int, int) {
	if page <= 0 {
		page = 1
	}
	if limit <= 0 {
		limit = defaultExamListPageLimit
	}
	if limit > maxExamListPageLimit {
		limit = maxExamListPageLimit
	}

	return page, limit
}

func normalizeLatestExamLimit(limit int) int {
	if limit <= 0 {
		limit = defaultLatestExamLimit
	}
	if limit > maxLatestExamLimit {
		limit = maxLatestExamLimit
	}

	return limit
}

func buildExamListResponse(ctx context.Context, input GetExamListInput) (*ExamListResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	page, limit := normalizeExamListPagination(input.Page, input.Limit)
	cacheKey := buildExamListCacheKey(page, limit)
	if cached := getCachedExamList(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	rows, err := repositories.ListExamSummaries(ctx, page, limit)
	if err != nil {
		return nil, err
	}

	totalItems := 0
	if len(rows) > 0 {
		totalItems = int(rows[0].TotalCount)
	} else if page > 1 {
		total, err := repositories.CountExamSummaries(ctx)
		if err != nil {
			return nil, err
		}
		totalItems = int(total)
	}

	totalPages := 1
	if totalItems > 0 {
		totalPages = int(math.Ceil(float64(totalItems) / float64(limit)))
	}

	items := make([]ExamListItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, ExamListItemResponse{
			ExamID:         row.ExamID,
			RoomID:         row.RoomID,
			Title:          row.Title,
			Type:           row.Type,
			Capacity:       row.Capacity,
			Duration:       row.Duration,
			StartTime:      row.StartTime,
			TotalQuestions: row.TotalQuestions,
		})
	}

	response := &ExamListResponse{
		Items:        items,
		TotalItems:   totalItems,
		CurrentPage:  page,
		TotalPages:   totalPages,
		ItemsPerPage: limit,
	}

	cacheExamList(ctx, cacheKey, response)
	return response, nil
}

func buildLatestExamsResponse(ctx context.Context, input GetLatestExamsInput) ([]ExamListItemResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	limit := normalizeLatestExamLimit(input.Limit)
	cacheKey := buildLatestExamsCacheKey(limit)
	if cached := getCachedLatestExams(ctx, cacheKey); cached != nil {
		return cached, nil
	}

	rows, err := repositories.ListLatestExamSummaries(ctx, limit)
	if err != nil {
		return nil, err
	}

	items := make([]ExamListItemResponse, 0, len(rows))
	for _, row := range rows {
		items = append(items, ExamListItemResponse{
			ExamID:         row.ExamID,
			RoomID:         row.RoomID,
			Title:          row.Title,
			Type:           row.Type,
			Capacity:       row.Capacity,
			Duration:       row.Duration,
			StartTime:      row.StartTime,
			TotalQuestions: row.TotalQuestions,
		})
	}

	cacheLatestExams(ctx, cacheKey, items)
	return items, nil
}

func getCachedExamSummary(ctx context.Context, cacheKey string) *ExamSummaryResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result ExamSummaryResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}

	// Ignore stale cache entries created before room_name was added.
	if result.RoomID != "" && strings.TrimSpace(result.RoomName) == "" {
		return nil
	}

	if result.Sections == nil {
		result.Sections = make([]struct{}, 0)
	}

	return &result
}

func getCachedExamList(ctx context.Context, cacheKey string) *ExamListResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result ExamListResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}

	if result.Items == nil {
		result.Items = make([]ExamListItemResponse, 0)
	}

	return &result
}

func getCachedLatestExams(ctx context.Context, cacheKey string) []ExamListItemResponse {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	payload, err := config.RedisClient.Get(ctx, cacheKey).Result()
	if err != nil {
		return nil
	}

	var result []ExamListItemResponse
	if err := json.Unmarshal([]byte(payload), &result); err != nil {
		return nil
	}
	if result == nil {
		result = make([]ExamListItemResponse, 0)
	}

	return result
}

func cacheExamSummary(ctx context.Context, cacheKey string, result *ExamSummaryResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, examSummaryCacheTTL).Err()
}

func cacheExamList(ctx context.Context, cacheKey string, result *ExamListResponse) {
	if !config.RedisEnabled || config.RedisClient == nil || result == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, examListCacheTTL).Err()
}

func cacheLatestExams(ctx context.Context, cacheKey string, result []ExamListItemResponse) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}

	payload, err := json.Marshal(result)
	if err != nil {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, latestExamCacheTTL).Err()
}

func getCachedExamSummaryPayload(ctx context.Context, cacheKey string) []byte {
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

func getCachedExamListPayload(ctx context.Context, cacheKey string) []byte {
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

func getCachedLatestExamsPayload(ctx context.Context, cacheKey string) []byte {
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

func cacheExamSummaryPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, examSummaryPayloadCacheTTL).Err()
}

func cacheExamListPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, examListPayloadCacheTTL).Err()
}

func cacheLatestExamsPayload(ctx context.Context, cacheKey string, payload []byte) {
	if !config.RedisEnabled || config.RedisClient == nil || len(payload) == 0 {
		return
	}

	ctx, cancel := context.WithTimeout(ctxOrBackground(ctx), time.Second)
	defer cancel()

	_ = config.RedisClient.Set(ctx, cacheKey, payload, latestExamPayloadCacheTTL).Err()
}

func ctxOrBackground(ctx context.Context) context.Context {
	if ctx == nil {
		return context.Background()
	}

	return ctx
}
