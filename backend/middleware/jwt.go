package middleware

import (
	"errors"
	"net/http"
	"strings"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

var errInvalidToken = errors.New("invalid token")

// Claims mirrors what login should issue: sub = user UUID, optional role.
type Claims struct {
	UserID   string `json:"user_id,omitempty"`
	Username string `json:"username,omitempty"`
	Fullname string `json:"fullname,omitempty"`
	Email    string `json:"email,omitempty"`
	Role     string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

func claimsFromRequest(r *http.Request, secret string) (*Claims, error) {
	if secret == "" {
		return nil, errInvalidToken
	}
	tokenStr := ""
	if cookie, err := r.Cookie("access_token"); err == nil {
		tokenStr = strings.TrimSpace(cookie.Value)
	}
	if tokenStr == "" {
		raw := strings.TrimSpace(r.Header.Get("Authorization"))
		if raw == "" {
			return nil, errInvalidToken
		}
		tokenStr = strings.TrimPrefix(raw, "Bearer")
		tokenStr = strings.TrimSpace(tokenStr)
	}
	if tokenStr == "" {
		return nil, errInvalidToken
	}

	var claims Claims
	_, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, errInvalidToken
	}

	return &claims, nil
}

func userIDFromRequest(r *http.Request, secret string) (uuid.UUID, error) {
	claims, err := claimsFromRequest(r, secret)
	if err != nil {
		return uuid.Nil, err
	}

	subject := claims.Subject
	if subject == "" {
		subject = claims.UserID
	}
	if subject == "" {
		return uuid.Nil, errInvalidToken
	}
	id, err := uuid.Parse(subject)
	if err != nil {
		return uuid.Nil, errInvalidToken
	}
	return id, nil
}
