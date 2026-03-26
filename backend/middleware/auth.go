package middleware

import (
	"context"
	"net/http"
	"os"
	"sync"

	"backend/utils"
	"github.com/google/uuid"
)

type ctxKey int

const userIDCtxKey ctxKey = iota

var (
	jwtSecretOnce sync.Once
	jwtSecret     string
)

func getJWTSecret() string {
	jwtSecretOnce.Do(func() {
		jwtSecret = os.Getenv("JWT_SECRET")
	})
	return jwtSecret
}

// UserID returns the authenticated user id set by RequireAuth.
func UserID(r *http.Request) (uuid.UUID, bool) {
	id, ok := r.Context().Value(userIDCtxKey).(uuid.UUID)
	return id, ok
}

// RequireAuth validates the JWT, stores the user id on the request context, then calls next.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		userID, err := userIDFromRequest(r, getJWTSecret())
		if err != nil {
			utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}
		ctx := context.WithValue(r.Context(), userIDCtxKey, userID)
		next(w, r.WithContext(ctx))
	}
}
