package handlers

import (
	"net/http"
	"strconv"

	"backend/services"
	"backend/utils"
)

func GetRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetRoomsPayload(r.Context(), services.GetRoomsInput{
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

func GetHotRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetHotRoomsPayload(r.Context(), services.GetHotRoomsInput{
		Limit: limit,
	})
	if err != nil {
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}
