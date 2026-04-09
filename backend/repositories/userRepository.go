package repositories

import (
	"context"
	"errors"
	"strings"

	"backend/config"
	"backend/models"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

var (
	ErrUserEmailConflict    = errors.New("user email conflict")
	ErrUserUsernameConflict = errors.New("user username conflict")
	ErrUserNotFound         = errors.New("user not found")
)

func CreateUser(user *models.User) error {
	return CreateUserWithContext(context.Background(), user)
}

func CreateUserWithContext(ctx context.Context, user *models.User) error {
	if ctx == nil {
		ctx = context.Background()
	}

	err := config.DB.WithContext(ctx).Create(user).Error
	if err == nil {
		return nil
	}

	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		detail := strings.ToLower(pgErr.Detail)
		constraint := strings.ToLower(pgErr.ConstraintName)

		switch {
		case strings.Contains(constraint, "email") || strings.Contains(detail, "(email)"):
			return ErrUserEmailConflict
		case strings.Contains(constraint, "username") || strings.Contains(detail, "(username)"):
			return ErrUserUsernameConflict
		}
	}

	return err
}

func GetUserByEmail(email string) (*models.User, error) {
	var user models.User

	err := config.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetUserByUsername(username string) (*models.User, error) {
	var user models.User

	err := config.DB.Where("username = ?", username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetUserByIdentifier(identifier string) (*models.User, error) {
	return GetUserByIdentifierWithContext(context.Background(), identifier)
}

func GetUserByIdentifierWithContext(ctx context.Context, identifier string) (*models.User, error) {
	var user models.User

	if ctx == nil {
		ctx = context.Background()
	}

	query := config.DB.WithContext(ctx).
		Select("user_id", "username", "password", "fullname", "email", "role")

	normalizedIdentifier := strings.TrimSpace(identifier)
	if strings.Contains(normalizedIdentifier, "@") {
		normalizedIdentifier = strings.ToLower(normalizedIdentifier)
		err := query.Where("email = ?", normalizedIdentifier).First(&user).Error
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return nil, nil
			}
			return nil, err
		}

		return &user, nil
	}

	err := query.Where("username = ?", normalizedIdentifier).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

func GetUserSessionByIDWithContext(ctx context.Context, userID string) (*models.User, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var user models.User

	err := config.DB.WithContext(ctx).
		Select("user_id", "username", "fullname", "email", "avatar_url", "role").
		Where("user_id = ?", userID).
		First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func IsEmailExists(email string) (bool, error) {
	var count int64

	err := config.DB.Model(&models.User{}).
		Where("email = ?", email).
		Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func IsUsernameExists(username string) (bool, error) {
	var count int64

	err := config.DB.Model(&models.User{}).
		Where("username = ?", username).
		Count(&count).Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func GetUserProfileByIDWithContext(ctx context.Context, userID string) (*models.User, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var user models.User

	err := config.DB.WithContext(ctx).
		Select(
			"user_id",
			"username",
			"fullname",
			"email",
			"avatar_url",
			"gender",
			"date_of_birth",
			"phone",
			"province_code",
			"province_name",
			"ward_code",
			"ward_name",
			"address_detail",
			"role",
			"updated_at",
		).
		Where("user_id = ?", userID).
		First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrUserNotFound
		}
		return nil, err
	}

	return &user, nil
}

func UpdateUserProfileByIDWithContext(ctx context.Context, userID string, updates map[string]interface{}) (*models.User, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	if len(updates) == 0 {
		return GetUserProfileByIDWithContext(ctx, userID)
	}

	var user models.User

	err := config.DB.WithContext(ctx).
		Model(&models.User{}).
		Clauses(clause.Returning{
			Columns: []clause.Column{
				{Name: "user_id"},
				{Name: "username"},
				{Name: "fullname"},
				{Name: "email"},
				{Name: "avatar_url"},
				{Name: "gender"},
				{Name: "date_of_birth"},
				{Name: "phone"},
				{Name: "province_code"},
				{Name: "province_name"},
				{Name: "ward_code"},
				{Name: "ward_name"},
				{Name: "address_detail"},
				{Name: "role"},
				{Name: "updated_at"},
			},
		}).
		Where("user_id = ?", userID).
		Updates(updates).
		Scan(&user).Error
	if err != nil {
		return nil, err
	}

	if strings.TrimSpace(user.UserID) == "" {
		return nil, ErrUserNotFound
	}

	return &user, nil
}
