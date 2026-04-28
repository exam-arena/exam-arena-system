package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

func GetExams(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetExamListPayload(r.Context(), services.GetExamListInput{
		Page:  page,
		Limit: limit,
	})
	if err != nil {
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func GetLatestExams(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetLatestExamsPayload(r.Context(), services.GetLatestExamsInput{
		Limit: limit,
	})
	if err != nil {
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func GetExamCompletion(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	idsParam := strings.TrimSpace(r.URL.Query().Get("ids"))
	var examIDs []string
	if idsParam != "" {
		examIDs = strings.Split(idsParam, ",")
	}

	response, err := services.GetExamCompletion(r.Context(), services.GetExamCompletionInput{
		UserID:  userID.String(),
		ExamIDs: examIDs,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidExamIDs):
			utils.SendError(w, http.StatusBadRequest, "INVALID_EXAM_IDS", "Exam IDs are invalid")
		case errors.Is(err, services.ErrTooManyExamIDs):
			utils.SendError(w, http.StatusBadRequest, "TOO_MANY_EXAM_IDS", "Too many exam IDs")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	utils.SendSuccess(w, response)
}

func GetExamByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	examID := r.PathValue("examId")
	if examID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Exam ID is required")
		return
	}

	payload, err := services.GetExamSummaryPayload(r.Context(), services.GetExamSummaryInput{
		ExamID: examID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrExamNotFound):
			utils.SendError(w, http.StatusNotFound, "EXAM_NOT_FOUND", "Exam not found")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	// Let intermediaries and browsers reuse the light exam summary briefly.
	w.Header().Set("Cache-Control", "public, max-age=60, stale-while-revalidate=300")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}
