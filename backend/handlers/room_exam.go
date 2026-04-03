package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"backend/services"
	"backend/utils"
)

func GetRoomExams(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	roomID := r.PathValue("roomId")
	if roomID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Room ID is required")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetRoomExamsPayload(r.Context(), services.GetRoomExamsInput{
		RoomID: roomID,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRoomNotFound):
			utils.SendError(w, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}
