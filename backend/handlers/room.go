package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"backend/middleware"
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
	userID, ok := middleware.OptionalUserID(r)
	input := services.GetRoomsInput{
		Page:  page,
		Limit: limit,
	}
	if ok {
		input.UserID = userID.String()
	}

	payload, err := services.GetRoomsPayload(r.Context(), input)
	if err != nil {
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		return
	}

	if ok {
		w.Header().Set("Cache-Control", "private, max-age=15, stale-while-revalidate=60")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	}
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func GetHotRooms(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	userID, ok := middleware.OptionalUserID(r)
	input := services.GetHotRoomsInput{
		Limit: limit,
	}
	if ok {
		input.UserID = userID.String()
	}

	payload, err := services.GetHotRoomsPayload(r.Context(), input)
	if err != nil {
		utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		return
	}

	if ok {
		w.Header().Set("Cache-Control", "private, max-age=15, stale-while-revalidate=60")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	}
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func GetRoomByID(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	roomID := r.PathValue("roomId")
	if roomID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Room ID is required")
		return
	}

	userID, ok := middleware.OptionalUserID(r)
	userIDValue := ""
	if ok {
		userIDValue = userID.String()
	}

	payload, err := services.GetRoomDetailPayload(r.Context(), roomID, userIDValue, "")
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRoomNotFound):
			utils.SendError(w, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	if ok {
		w.Header().Set("Cache-Control", "private, max-age=15, stale-while-revalidate=60")
	} else {
		w.Header().Set("Cache-Control", "public, max-age=30, stale-while-revalidate=120")
	}
	utils.SendJSONBytes(w, http.StatusOK, payload)
}

func JoinRoom(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	roomID := r.PathValue("roomId")
	if roomID == "" {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Room ID is required")
		return
	}

	result, err := services.JoinRoom(r.Context(), services.JoinRoomInput{
		UserID: userID.String(),
		RoomID: roomID,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrRoomNotFound):
			utils.SendError(w, http.StatusNotFound, "ROOM_NOT_FOUND", "Room not found")
		case errors.Is(err, services.ErrRoomInactive):
			utils.SendError(w, http.StatusConflict, "ROOM_INACTIVE", "Room is not active")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	utils.SendSuccess(w, result)
}
