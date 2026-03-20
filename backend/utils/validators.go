package utils

import "regexp"

// ✅ Validate email
func IsValidEmail(email string) bool {
	// regex đơn giản (đủ dùng)
	re := regexp.MustCompile(`^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$`)
	return re.MatchString(email)
}

// ✅ Validate password
func IsValidPassword(password string) bool {
	return len(password) >= 6
}

// ✅ Validate username
func IsValidUsername(username string) bool {
	return len(username) >= 3 && len(username) <= 50
}

// ✅ Validate fullname
func IsValidFullname(fullname string) bool {
	return len(fullname) >= 2
}