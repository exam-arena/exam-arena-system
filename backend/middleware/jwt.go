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
	UserID string `json:"user_id,omitempty"`
	Role   string `json:"role,omitempty"`
	jwt.RegisteredClaims
}

func userIDFromRequest(r *http.Request, secret string) (uuid.UUID, error) {
	if secret == "" {
		return uuid.Nil, errInvalidToken
	}
	raw := strings.TrimSpace(r.Header.Get("Authorization"))
	if raw == "" {
		return uuid.Nil, errInvalidToken
	}
	tokenStr := strings.TrimPrefix(raw, "Bearer")
	tokenStr = strings.TrimSpace(tokenStr)
	if tokenStr == "" {
		return uuid.Nil, errInvalidToken
	}

	var claims Claims
	_, err := jwt.ParseWithClaims(tokenStr, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errInvalidToken
		}
		return []byte(secret), nil
	})
	if err != nil {
		return uuid.Nil, errInvalidToken
	}

	subject := claims.Subject
	if subject == "" {
		// Backward compatibility for tokens issued before switching to standard JWT sub.
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
