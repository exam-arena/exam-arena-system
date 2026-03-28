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
const claimsCtxKey ctxKey = iota + 1

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

// AuthClaims returns the authenticated JWT claims set by RequireAuth.
func AuthClaims(r *http.Request) (*Claims, bool) {
	claims, ok := r.Context().Value(claimsCtxKey).(*Claims)
	return claims, ok
}

// RequireAuth validates the JWT, stores the user id on the request context, then calls next.
func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		claims, err := claimsFromRequest(r, getJWTSecret())
		if err != nil {
			utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		subject := claims.Subject
		if subject == "" {
			subject = claims.UserID
		}
		userID, err := uuid.Parse(subject)
		if err != nil {
			utils.SendError(w, http.StatusUnauthorized, "UNAUTHORIZED", "Unauthorized")
			return
		}

		ctx := context.WithValue(r.Context(), userIDCtxKey, userID)
		ctx = context.WithValue(ctx, claimsCtxKey, claims)
		next(w, r.WithContext(ctx))
	}
}
