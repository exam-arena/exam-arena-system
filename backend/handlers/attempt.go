package handlers

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

type SaveAttemptAnswersRequest struct {
	Answers []SaveAttemptAnswerRequest `json:"answers"`
}

type SaveAttemptAnswerRequest struct {
	QuestionID  string `json:"question_id"`
	SelectedAns string `json:"selected_ans"`
}

func StartAttempt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	examID := r.PathValue("examId")
	if examID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Exam ID is required")
		return
	}

	result, err := services.StartAttempt(r.Context(), services.StartAttemptInput{
		UserID: userID.String(),
		ExamID: examID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrExamNotFound):
			utils.SendError(w, http.StatusNotFound, "EXAM_NOT_FOUND", "Exam not found")
		case errors.Is(err, services.ErrExamNotStarted):
			utils.SendError(w, http.StatusConflict, "EXAM_NOT_STARTED", "Chưa tới giờ thi")
		case errors.Is(err, services.ErrExamEnded):
			utils.SendError(w, http.StatusConflict, "EXAM_ENDED", "Bài thi đã kết thúc")
		case errors.Is(err, services.ErrExamAlreadyCompleted):
			utils.SendError(w, http.StatusConflict, "EXAM_ALREADY_COMPLETED", "Bạn đã hoàn thành bài thi này")
		case errors.Is(err, services.ErrStartAttemptBusy):
			utils.SendError(w, http.StatusTooManyRequests, "START_ATTEMPT_BUSY", "Too many concurrent start attempt requests")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendCreated(w, result)
}

func GetAttemptHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	cursor := r.URL.Query().Get("cursor")

	payload, err := services.GetAttemptHistoryPayload(r.Context(), services.GetAttemptHistoryInput{
		UserID: userID.String(),
		Cursor: cursor,
		Limit:  limit,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidAttemptHistoryCursor):
			utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "History cursor is invalid")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, max-age=5, stale-while-revalidate=30")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func GetAttempt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	attemptID := r.PathValue("attemptId")
	if attemptID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Attempt ID is required")
		return
	}

	payload, err := services.GetAttemptDetailPayload(r.Context(), services.GetAttemptDetailInput{
		UserID:    userID.String(),
		AttemptID: attemptID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAttemptNotFound):
			utils.SendError(w, http.StatusNotFound, "ATTEMPT_NOT_FOUND", "Attempt not found")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func SaveAttemptAnswers(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	attemptID := r.PathValue("attemptId")
	if attemptID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Attempt ID is required")
		return
	}

	r.Body = http.MaxBytesReader(w, r.Body, 64<<10)
	var req SaveAttemptAnswersRequest
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&req); err != nil {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request body")
		return
	}

	input := services.SaveAttemptAnswersInput{
		UserID:    userID.String(),
		AttemptID: attemptID,
		Answers:   make([]services.SaveAttemptAnswerInput, 0, len(req.Answers)),
	}
	for _, answer := range req.Answers {
		input.Answers = append(input.Answers, services.SaveAttemptAnswerInput{
			QuestionID:  answer.QuestionID,
			SelectedAns: answer.SelectedAns,
		})
	}

	result, err := services.SaveAttemptAnswers(r.Context(), input)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAttemptNotFound):
			utils.SendError(w, http.StatusNotFound, "ATTEMPT_NOT_FOUND", "Attempt not found")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		case errors.Is(err, services.ErrAttemptClosed):
			utils.SendError(w, http.StatusConflict, "ATTEMPT_NOT_IN_PROGRESS", "Attempt is not in progress")
		case errors.Is(err, services.ErrInvalidAnswerPayload):
			utils.SendValidationError(w, []utils.ValidationError{
				{Field: "answers", Message: err.Error()},
			})
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendSuccess(w, result)
}

func SubmitAttempt(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	attemptID := r.PathValue("attemptId")
	if attemptID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Attempt ID is required")
		return
	}

	result, err := services.SubmitAttempt(r.Context(), services.SubmitAttemptInput{
		UserID:    userID.String(),
		AttemptID: attemptID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAttemptNotFound):
			utils.SendError(w, http.StatusNotFound, "ATTEMPT_NOT_FOUND", "Attempt not found")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		case errors.Is(err, services.ErrAttemptClosed):
			utils.SendError(w, http.StatusConflict, "ATTEMPT_NOT_IN_PROGRESS", "Attempt is not in progress")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendSuccess(w, result)
}

func GetAttemptResult(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	attemptID := r.PathValue("attemptId")
	if attemptID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Attempt ID is required")
		return
	}

	result, err := services.GetAttemptResult(r.Context(), services.GetAttemptDetailInput{
		UserID:    userID.String(),
		AttemptID: attemptID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAttemptNotFound):
			utils.SendError(w, http.StatusNotFound, "ATTEMPT_NOT_FOUND", "Attempt not found")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		case errors.Is(err, services.ErrAttemptProcessing):
			utils.SendAccepted(w, map[string]string{
				"attempt_id": attemptID,
				"status":     "processing",
			})
			return
		case errors.Is(err, services.ErrAttemptNotSubmitted):
			utils.SendError(w, http.StatusConflict, "ATTEMPT_NOT_SUBMITTED", "Attempt is not submitted")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendSuccess(w, result)
}

func GetAttemptReview(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	attemptID := r.PathValue("attemptId")
	if attemptID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Attempt ID is required")
		return
	}

	result, err := services.GetAttemptReview(r.Context(), services.GetAttemptDetailInput{
		UserID:    userID.String(),
		AttemptID: attemptID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrAttemptNotFound):
			utils.SendError(w, http.StatusNotFound, "ATTEMPT_NOT_FOUND", "Attempt not found")
		case errors.Is(err, services.ErrAttemptForbidden):
			utils.SendError(w, http.StatusForbidden, "FORBIDDEN", "You are not allowed to access this attempt")
		case errors.Is(err, services.ErrAttemptProcessing):
			utils.SendAccepted(w, map[string]string{
				"attempt_id": attemptID,
				"status":     "processing",
			})
			return
		case errors.Is(err, services.ErrAttemptNotSubmitted):
			utils.SendError(w, http.StatusConflict, "ATTEMPT_NOT_SUBMITTED", "Attempt is not submitted")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendSuccess(w, result)
}
