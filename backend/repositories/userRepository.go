package repositories

import (
	"errors"

	"backend/config"
	"backend/models"

	"gorm.io/gorm"
)

// ✅ Tạo user mới
func CreateUser(user *models.User) error {
	return config.DB.Create(user).Error
}

// ✅ Tìm user theo email
func GetUserByEmail(email string) (*models.User, error) {
	var user models.User

	err := config.DB.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // không tìm thấy
		}
		return nil, err
	}

	return &user, nil
}

// ✅ Tìm user theo username
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

// ✅ Tìm user bằng email HOẶC username
func GetUserByIdentifier(identifier string) (*models.User, error) {
	var user models.User

	err := config.DB.
		Where("email = ? OR username = ?", identifier, identifier).
		First(&user).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}

	return &user, nil
}

// ✅ Check email đã tồn tại chưa
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

// ✅ Check username đã tồn tại chưa
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