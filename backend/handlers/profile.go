package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"backend/middleware"
	"backend/services"
	"backend/utils"
)

const maxProfileBodyBytes int64 = 8 << 10

// Profile returns the authenticated session user from the database.
func Profile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	user, err := services.GetCurrentUser(r.Context(), userID.String())
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	utils.SendSuccess(w, user)
}

type UpdateProfileRequest struct {
	Fullname      string `json:"fullname"`
	AvatarURL     string `json:"avatar_url"`
	Gender        string `json:"gender"`
	DateOfBirth   string `json:"date_of_birth"`
	Phone         string `json:"phone"`
	ProvinceCode  string `json:"province_code"`
	ProvinceName  string `json:"province_name"`
	WardCode      string `json:"ward_code"`
	WardName      string `json:"ward_name"`
	AddressDetail string `json:"address_detail"`
}

func GetProfileDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	profile, err := services.GetProfile(r.Context(), services.GetProfileInput{
		UserID: userID.String(),
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrProfileNotFound):
			utils.SendError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profile not found")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	utils.SendSuccess(w, profile)
}

func UpdateProfileDetail(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPut {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	userID, ok := middleware.UserID(r)
	if !ok {
		utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
		return
	}

	var req UpdateProfileRequest
	if err := decodeProfileRequest(w, r, &req); err != nil {
		return
	}

	profile, err := services.UpdateProfile(r.Context(), services.UpdateProfileInput{
		UserID:        userID.String(),
		Fullname:      req.Fullname,
		AvatarURL:     req.AvatarURL,
		Gender:        req.Gender,
		DateOfBirth:   req.DateOfBirth,
		Phone:         req.Phone,
		ProvinceCode:  req.ProvinceCode,
		ProvinceName:  req.ProvinceName,
		WardCode:      req.WardCode,
		WardName:      req.WardName,
		AddressDetail: req.AddressDetail,
	})
	if err != nil {
		switch {
		case errors.Is(err, services.ErrMissingFields),
			errors.Is(err, services.ErrInvalidFullname),
			errors.Is(err, services.ErrInvalidGender),
			errors.Is(err, services.ErrInvalidDateOfBirth),
			errors.Is(err, services.ErrInvalidPhone),
			errors.Is(err, services.ErrInvalidAvatarURL),
			errors.Is(err, services.ErrProvincePairRequired),
			errors.Is(err, services.ErrWardPairRequired),
			errors.Is(err, services.ErrWardRequiresProvince),
			errors.Is(err, services.ErrProfileAddressTooLong),
			errors.Is(err, services.ErrProfileLocationTooLong),
			errors.Is(err, services.ErrProfileDateOfBirthFuture):
			utils.SendValidationError(w, []utils.ValidationError{
				{Field: "profile", Message: err.Error()},
			})
		case errors.Is(err, services.ErrProfileNotFound):
			utils.SendError(w, http.StatusNotFound, "PROFILE_NOT_FOUND", "Profile not found")
		default:
			utils.SendError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "An unexpected error occurred")
		}
		return
	}

	w.Header().Set("Cache-Control", "private, no-store")
	utils.SendSuccess(w, profile)
}

func decodeProfileRequest(w http.ResponseWriter, r *http.Request, dest any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxProfileBodyBytes)

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	if err := decoder.Decode(dest); err != nil {
		var maxBytesErr *http.MaxBytesError
		if errors.As(err, &maxBytesErr) {
			utils.SendError(w, http.StatusRequestEntityTooLarge, "REQUEST_TOO_LARGE", "Payload is too large")
			return err
		}

		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request payload")
		return err
	}

	if decoder.More() {
		utils.SendError(w, http.StatusBadRequest, "BAD_REQUEST", "Invalid request payload")
		return errors.New("unexpected trailing data")
	}

	return nil
}
