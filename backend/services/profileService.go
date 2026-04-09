package services

import (
	"context"
	"errors"
	"net/url"
	"regexp"
	"strings"
	"time"

	"backend/models"
	"backend/repositories"
	"backend/utils"
)

const defaultGetProfileDBTimeout = 800 * time.Millisecond
const defaultUpdateProfileDBTimeout = 1200 * time.Millisecond

var (
	ErrProfileNotFound          = errors.New("profile not found")
	ErrInvalidGender            = errors.New("giới tính không hợp lệ")
	ErrInvalidDateOfBirth       = errors.New("ngày sinh không hợp lệ")
	ErrInvalidPhone             = errors.New("số điện thoại không hợp lệ")
	ErrInvalidAvatarURL         = errors.New("avatar url không hợp lệ")
	ErrProvincePairRequired     = errors.New("tỉnh/thành phải có đủ mã và tên")
	ErrWardPairRequired         = errors.New("xã/phường phải có đủ mã và tên")
	ErrWardRequiresProvince     = errors.New("xã/phường yêu cầu tỉnh/thành")
	ErrProfileAddressTooLong    = errors.New("địa chỉ cụ thể quá dài")
	ErrProfileLocationTooLong   = errors.New("thông tin địa giới hành chính quá dài")
	ErrProfileDateOfBirthFuture = errors.New("ngày sinh không được ở tương lai")
)

var profilePhoneSanitizer = regexp.MustCompile(`[\s().-]`)

type GetProfileInput struct {
	UserID string
}

type UpdateProfileInput struct {
	UserID        string
	Fullname      string
	AvatarURL     string
	Gender        string
	DateOfBirth   string
	Phone         string
	ProvinceCode  string
	ProvinceName  string
	WardCode      string
	WardName      string
	AddressDetail string
}

type UserProfileResponse struct {
	UserID        string `json:"user_id"`
	Username      string `json:"username"`
	Fullname      string `json:"fullname"`
	Email         string `json:"email"`
	AvatarURL     string `json:"avatar_url"`
	Gender        string `json:"gender"`
	DateOfBirth   string `json:"date_of_birth"`
	Phone         string `json:"phone"`
	ProvinceCode  string `json:"province_code"`
	ProvinceName  string `json:"province_name"`
	WardCode      string `json:"ward_code"`
	WardName      string `json:"ward_name"`
	AddressDetail string `json:"address_detail"`
	Role          string `json:"role"`
	UpdatedAt     string `json:"updated_at"`
}

func GetProfile(ctx context.Context, input GetProfileInput) (*UserProfileResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		return nil, ErrProfileNotFound
	}

	dbCtx, cancel := context.WithTimeout(ctx, defaultGetProfileDBTimeout)
	defer cancel()

	user, err := repositories.GetUserProfileByIDWithContext(dbCtx, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrProfileNotFound
		}
		return nil, ErrInternal
	}

	return mapUserProfileResponse(user), nil
}

func UpdateProfile(ctx context.Context, input UpdateProfileInput) (*UserProfileResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	userID := strings.TrimSpace(input.UserID)
	if userID == "" {
		return nil, ErrProfileNotFound
	}

	normalized, err := normalizeProfileInput(input)
	if err != nil {
		return nil, err
	}

	dbCtx, cancel := context.WithTimeout(ctx, defaultUpdateProfileDBTimeout)
	defer cancel()

	updatedUser, err := repositories.UpdateUserProfileByIDWithContext(dbCtx, userID, normalized.updates)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrProfileNotFound
		}
		return nil, ErrInternal
	}

	return mapUserProfileResponse(updatedUser), nil
}

type normalizedProfileUpdate struct {
	updates map[string]interface{}
}

func normalizeProfileInput(input UpdateProfileInput) (*normalizedProfileUpdate, error) {
	fullname := strings.TrimSpace(input.Fullname)
	if fullname == "" {
		return nil, ErrMissingFields
	}
	if !utils.IsValidFullname(fullname) {
		return nil, ErrInvalidFullname
	}

	avatarURL := strings.TrimSpace(input.AvatarURL)
	if avatarURL != "" {
		if len(avatarURL) > 2048 {
			return nil, ErrInvalidAvatarURL
		}
		parsed, err := url.ParseRequestURI(avatarURL)
		if err != nil || parsed.Scheme == "" || parsed.Host == "" {
			return nil, ErrInvalidAvatarURL
		}
		if parsed.Scheme != "http" && parsed.Scheme != "https" {
			return nil, ErrInvalidAvatarURL
		}
	}

	gender := strings.TrimSpace(strings.ToLower(input.Gender))
	switch gender {
	case "", "male", "female", "other":
	default:
		return nil, ErrInvalidGender
	}

	var dateOfBirth *time.Time
	rawDateOfBirth := strings.TrimSpace(input.DateOfBirth)
	if rawDateOfBirth != "" {
		parsed, err := time.Parse("2006-01-02", rawDateOfBirth)
		if err != nil {
			return nil, ErrInvalidDateOfBirth
		}
		if parsed.After(time.Now()) {
			return nil, ErrProfileDateOfBirthFuture
		}
		date := parsed.UTC()
		dateOfBirth = &date
	}

	phone := strings.TrimSpace(input.Phone)
	if phone != "" {
		sanitized := profilePhoneSanitizer.ReplaceAllString(phone, "")
		sanitized = strings.TrimPrefix(sanitized, "+")
		if len(sanitized) < 9 || len(sanitized) > 15 {
			return nil, ErrInvalidPhone
		}
		for _, r := range sanitized {
			if r < '0' || r > '9' {
				return nil, ErrInvalidPhone
			}
		}
	}

	provinceCode := strings.TrimSpace(input.ProvinceCode)
	provinceName := strings.TrimSpace(input.ProvinceName)
	wardCode := strings.TrimSpace(input.WardCode)
	wardName := strings.TrimSpace(input.WardName)
	addressDetail := strings.TrimSpace(input.AddressDetail)

	if len(provinceCode) > 20 || len(wardCode) > 20 || len(provinceName) > 100 || len(wardName) > 100 {
		return nil, ErrProfileLocationTooLong
	}
	if len(addressDetail) > 255 {
		return nil, ErrProfileAddressTooLong
	}

	if (provinceCode == "") != (provinceName == "") {
		return nil, ErrProvincePairRequired
	}
	if (wardCode == "") != (wardName == "") {
		return nil, ErrWardPairRequired
	}
	if wardCode != "" && provinceCode == "" {
		return nil, ErrWardRequiresProvince
	}

	updates := map[string]interface{}{
		"fullname":       fullname,
		"avatar_url":     avatarURL,
		"gender":         gender,
		"date_of_birth":  dateOfBirth,
		"phone":          phone,
		"province_code":  provinceCode,
		"province_name":  provinceName,
		"ward_code":      wardCode,
		"ward_name":      wardName,
		"address_detail": addressDetail,
	}

	return &normalizedProfileUpdate{updates: updates}, nil
}

func mapUserProfileResponse(user *models.User) *UserProfileResponse {
	if user == nil {
		return nil
	}

	response := &UserProfileResponse{
		UserID:        user.UserID,
		Username:      user.Username,
		Fullname:      user.Fullname,
		Email:         user.Email,
		AvatarURL:     user.AvatarURL,
		Gender:        user.Gender,
		Phone:         user.Phone,
		ProvinceCode:  user.ProvinceCode,
		ProvinceName:  user.ProvinceName,
		WardCode:      user.WardCode,
		WardName:      user.WardName,
		AddressDetail: user.AddressDetail,
		Role:          user.Role,
		UpdatedAt:     user.UpdatedAt.UTC().Format(time.RFC3339),
	}

	if user.DateOfBirth != nil && !user.DateOfBirth.IsZero() {
		response.DateOfBirth = user.DateOfBirth.Format("2006-01-02")
	}

	return response
}
