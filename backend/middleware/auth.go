package middleware

import (
	"context"
	"net/http"
	"os"

	"github.com/google/uuid"
)

type ctxKey int

const userIDCtxKey ctxKey = iota

// UserID returns the authenticated user id set by RequireAuth.
func UserID(r *http.Request) (uuid.UUID, bool) {
	id, ok := r.Context().Value(userIDCtxKey).(uuid.UUID)
	return id, ok
}

// RequireAuth validates the JWT, stores the user id on the request context, then calls next.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		secret := os.Getenv("JWT_SECRET")
		userID, err := userIDFromRequest(r, secret)
		if err != nil {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		ctx := context.WithValue(r.Context(), userIDCtxKey, userID)
		next(w, r.WithContext(ctx))
	}
}
