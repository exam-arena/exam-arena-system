package services

import (
	"context"
	"crypto/rand"
	"crypto/sha1"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"os"
	"strings"
	"time"

	"backend/repositories"
)

const (
	defaultAvatarFolder       = "exam-arena/avatars"
	defaultAvatarMaxFileBytes = 2 << 20
)

var ErrAvatarUploadUnavailable = errors.New("avatar upload is unavailable")

type AvatarUploadSignatureResponse struct {
	CloudName     string   `json:"cloud_name"`
	APIKey        string   `json:"api_key"`
	Timestamp     int64    `json:"timestamp"`
	Folder        string   `json:"folder"`
	PublicID      string   `json:"public_id"`
	Provider      string   `json:"provider"`
	Signature     string   `json:"signature"`
	UploadURL     string   `json:"upload_url"`
	MaxFileBytes  int64    `json:"max_file_bytes"`
	AllowedFormat []string `json:"allowed_formats"`
}

func CreateAvatarUploadSignature(_ context.Context, userID string) (*AvatarUploadSignatureResponse, error) {
	cloudName := strings.TrimSpace(os.Getenv("CLOUDINARY_CLOUD_NAME"))
	apiKey := strings.TrimSpace(os.Getenv("CLOUDINARY_API_KEY"))
	apiSecret := strings.TrimSpace(os.Getenv("CLOUDINARY_API_SECRET"))
	folder := strings.Trim(strings.TrimSpace(os.Getenv("CLOUDINARY_AVATAR_FOLDER")), "/")
	if folder == "" {
		folder = defaultAvatarFolder
	}

	if cloudName == "" || apiKey == "" || apiSecret == "" {
		log.Printf(
			"[avatar-sign] unavailable pid=%d user_id=%s missing=%s folder=%s",
			os.Getpid(),
			userID,
			strings.Join(missingAvatarEnvNames(cloudName, apiKey, apiSecret), ","),
			folder,
		)
		return nil, ErrAvatarUploadUnavailable
	}

	normalizedUserID := strings.ReplaceAll(strings.TrimSpace(userID), "-", "")
	if normalizedUserID == "" {
		return nil, ErrProfileNotFound
	}

	timestamp := time.Now().Unix()
	publicID := fmt.Sprintf(
		"%s/avatar-%d-%s",
		normalizedUserID,
		time.Now().UnixMilli(),
		randomHex(4),
	)
	signaturePayload := fmt.Sprintf(
		"folder=%s&public_id=%s&timestamp=%d%s",
		folder,
		publicID,
		timestamp,
		apiSecret,
	)

	hash := sha1.Sum([]byte(signaturePayload))
	signature := hex.EncodeToString(hash[:])

	log.Printf(
		"[avatar-sign] ready pid=%d user_id=%s folder=%s public_id=%s",
		os.Getpid(),
		userID,
		folder,
		publicID,
	)

	return &AvatarUploadSignatureResponse{
		CloudName:     cloudName,
		APIKey:        apiKey,
		Timestamp:     timestamp,
		Folder:        folder,
		PublicID:      publicID,
		Provider:      "cloudinary",
		Signature:     signature,
		UploadURL:     fmt.Sprintf("https://api.cloudinary.com/v1_1/%s/image/upload", cloudName),
		MaxFileBytes:  defaultAvatarMaxFileBytes,
		AllowedFormat: []string{"jpg", "jpeg", "png", "webp"},
	}, nil
}

func missingAvatarEnvNames(cloudName, apiKey, apiSecret string) []string {
	missing := make([]string, 0, 3)
	if cloudName == "" {
		missing = append(missing, "CLOUDINARY_CLOUD_NAME")
	}
	if apiKey == "" {
		missing = append(missing, "CLOUDINARY_API_KEY")
	}
	if apiSecret == "" {
		missing = append(missing, "CLOUDINARY_API_SECRET")
	}
	return missing
}

func randomHex(size int) string {
	if size <= 0 {
		return "seed"
	}

	buffer := make([]byte, size)
	if _, err := rand.Read(buffer); err != nil {
		return "seed"
	}

	return hex.EncodeToString(buffer)
}

func UpdateAvatar(ctx context.Context, userID, avatarProvider, avatarKey, avatarURL string) (*UserProfileResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, ErrProfileNotFound
	}

	avatarProvider = strings.ToLower(strings.TrimSpace(avatarProvider))
	avatarKey = strings.TrimSpace(avatarKey)
	avatarURL = strings.TrimSpace(avatarURL)
	if avatarProvider == "" || avatarKey == "" || avatarURL == "" {
		return nil, ErrInvalidAvatarURL
	}
	if len(avatarProvider) > 50 || len(avatarKey) > 255 {
		return nil, ErrInvalidAvatarURL
	}
	if avatarProvider != "cloudinary" {
		return nil, ErrInvalidAvatarURL
	}

	if err := validateAvatarURL(avatarURL); err != nil {
		return nil, err
	}

	dbCtx, cancel := context.WithTimeout(ctx, defaultUpdateProfileDBTimeout)
	defer cancel()

	updatedUser, err := repositories.UpdateUserProfileByIDWithContext(dbCtx, userID, map[string]interface{}{
		"avatar_provider": avatarProvider,
		"avatar_key":      avatarKey,
		"avatar_url":      avatarURL,
	})
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrProfileNotFound
		}
		return nil, ErrInternal
	}

	return mapUserProfileResponse(updatedUser), nil
}
