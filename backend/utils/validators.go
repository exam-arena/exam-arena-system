package utils

import (
	"regexp"
	"unicode"
)

//  Validate email
func IsValidEmail(email string) bool {
	// regex đơn giản (đủ dùng)
	re := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return re.MatchString(email)
}

//  Validate password
func IsValidPassword(password string) bool {
	if len(password) < 8 {
		return false
	}

	var hasUpper, hasLower, hasDigit bool

	for _, c := range password {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		}
	}
	return hasUpper && hasLower && hasDigit
}

//  Validate username
func IsValidUsername(username string) bool {
	return len(username) >= 3 && len(username) <= 50
}

//  Validate fullname
func IsValidFullname(fullname string) bool {
	return len(fullname) >= 2
}