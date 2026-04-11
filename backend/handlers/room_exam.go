package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"backend/middleware"
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
	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	page, _ := strconv.Atoi(r.URL.Query().Get("page"))
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))

	payload, err := services.GetRoomExamsPayload(r.Context(), services.GetRoomExamsInput{
		UserID: userID.String(),
		RoomID: roomID,
		Page:   page,
		Limit:  limit,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRoomNotFound):
			utils.SendError(w, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
		case errors.Is(err, services.ErrRoomAccessForbidden):
			utils.SendError(w, http.StatusForbidden, "ROOM_ACCESS_FORBIDDEN", "You are not allowed to access this room")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, max-age=15, stale-while-revalidate=60")
	utils.SendJSONBytes(w, http.StatusOK, payload)
}
