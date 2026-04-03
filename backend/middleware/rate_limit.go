package middleware

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/utils"
)

type rateLimitVisitor struct {
	tokens   float64
	lastSeen time.Time
}

type IPRateLimiter struct {
	mu     sync.Mutex
	rate   float64
	burst  float64
	ttl    time.Duration
	now    func() time.Time
	visits map[string]*rateLimitVisitor
}

func getEnvFloat(key string, fallback float64) float64 {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.ParseFloat(raw, 64)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func newIPRateLimiter(ratePerSecond float64, burst int, ttl time.Duration) *IPRateLimiter {
	return &IPRateLimiter{
		rate:   ratePerSecond,
		burst:  float64(burst),
		ttl:    ttl,
		now:    time.Now,
		visits: make(map[string]*rateLimitVisitor),
	}
}

func (l *IPRateLimiter) allow(key string) bool {
	now := l.now()

	l.mu.Lock()
	defer l.mu.Unlock()

	l.cleanupLocked(now)

	visitor, ok := l.visits[key]
	if !ok {
		l.visits[key] = &rateLimitVisitor{
			tokens:   l.burst - 1,
			lastSeen: now,
		}
		return true
	}

	elapsed := now.Sub(visitor.lastSeen).Seconds()
	visitor.tokens = minFloat(l.burst, visitor.tokens+(elapsed*l.rate))
	visitor.lastSeen = now

	if visitor.tokens < 1 {
		return false
	}

	visitor.tokens--
	return true
}

func (l *IPRateLimiter) cleanupLocked(now time.Time) {
	for key, visitor := range l.visits {
		if now.Sub(visitor.lastSeen) > l.ttl {
			delete(l.visits, key)
		}
	}
}

func minFloat(a, b float64) float64 {
	if a < b {
		return a
	}
	return b
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	if realIP := strings.TrimSpace(r.Header.Get("X-Real-IP")); realIP != "" {
		return realIP
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}

	return strings.TrimSpace(r.RemoteAddr)
}

var loginLimiter = newIPRateLimiter(
	getEnvFloat("LOGIN_RATE_LIMIT_RPS", 3),
	int(getEnvFloat("LOGIN_RATE_LIMIT_BURST", 10)),
	5*time.Minute,
)

var startAttemptLimiter = newIPRateLimiter(
	getEnvFloat("START_ATTEMPT_RATE_LIMIT_RPS", 1.5),
	int(getEnvFloat("START_ATTEMPT_RATE_LIMIT_BURST", 5)),
	2*time.Minute,
)

var submitAttemptLimiter = newIPRateLimiter(
	getEnvFloat("SUBMIT_ATTEMPT_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("SUBMIT_ATTEMPT_RATE_LIMIT_BURST", 3)),
	2*time.Minute,
)

var getAttemptLimiter = newIPRateLimiter(
	getEnvFloat("GET_ATTEMPT_RATE_LIMIT_RPS", 4),
	int(getEnvFloat("GET_ATTEMPT_RATE_LIMIT_BURST", 12)),
	2*time.Minute,
)

var reviewAttemptLimiter = newIPRateLimiter(
	getEnvFloat("REVIEW_ATTEMPT_RATE_LIMIT_RPS", 2),
	int(getEnvFloat("REVIEW_ATTEMPT_RATE_LIMIT_BURST", 6)),
	2*time.Minute,
)

var resultAttemptLimiter = newIPRateLimiter(
	getEnvFloat("RESULT_ATTEMPT_RATE_LIMIT_RPS", 3),
	int(getEnvFloat("RESULT_ATTEMPT_RATE_LIMIT_BURST", 8)),
	2*time.Minute,
)

var saveAnswersLimiter = newIPRateLimiter(
	getEnvFloat("SAVE_ANSWERS_RATE_LIMIT_RPS", 8),
	int(getEnvFloat("SAVE_ANSWERS_RATE_LIMIT_BURST", 20)),
	2*time.Minute,
)

var getExamLimiter = newIPRateLimiter(
	getEnvFloat("GET_EXAM_RATE_LIMIT_RPS", 10),
	int(getEnvFloat("GET_EXAM_RATE_LIMIT_BURST", 30)),
	2*time.Minute,
)

var getExamsLimiter = newIPRateLimiter(
	getEnvFloat("GET_EXAMS_RATE_LIMIT_RPS", 20),
	int(getEnvFloat("GET_EXAMS_RATE_LIMIT_BURST", 80)),
	2*time.Minute,
)

var getLatestExamsLimiter = newIPRateLimiter(
	getEnvFloat("GET_LATEST_EXAMS_RATE_LIMIT_RPS", 20),
	int(getEnvFloat("GET_LATEST_EXAMS_RATE_LIMIT_BURST", 80)),
	2*time.Minute,
)

var getRoomsLimiter = newIPRateLimiter(
	getEnvFloat("GET_ROOMS_RATE_LIMIT_RPS", 20),
	int(getEnvFloat("GET_ROOMS_RATE_LIMIT_BURST", 80)),
	2*time.Minute,
)

var getHotRoomsLimiter = newIPRateLimiter(
	getEnvFloat("GET_HOT_ROOMS_RATE_LIMIT_RPS", 20),
	int(getEnvFloat("GET_HOT_ROOMS_RATE_LIMIT_BURST", 80)),
	2*time.Minute,
)

var getRoomExamsLimiter = newIPRateLimiter(
	getEnvFloat("GET_ROOM_EXAMS_RATE_LIMIT_RPS", 20),
	int(getEnvFloat("GET_ROOM_EXAMS_RATE_LIMIT_BURST", 80)),
	2*time.Minute,
)

func LoginRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !loginLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many login attempts")
			return
		}

		next(w, r)
	}
}

func StartAttemptRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !startAttemptLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many start attempt requests")
			return
		}

		next(w, r)
	}
}

func SubmitAttemptRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !submitAttemptLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many submit attempt requests")
			return
		}

		next(w, r)
	}
}

func GetAttemptRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !getAttemptLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get attempt requests")
			return
		}

		next(w, r)
	}
}

func ReviewAttemptRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !reviewAttemptLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many review attempt requests")
			return
		}

		next(w, r)
	}
}

func ResultAttemptRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !resultAttemptLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many result attempt requests")
			return
		}

		next(w, r)
	}
}

func SaveAttemptAnswersRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !saveAnswersLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many save answers requests")
			return
		}

		next(w, r)
	}
}

func GetExamRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getExamLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get exam requests")
			return
		}

		next(w, r)
	}
}

func GetExamsRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getExamsLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get exams requests")
			return
		}

		next(w, r)
	}
}

func GetLatestExamsRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getLatestExamsLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get latest exams requests")
			return
		}

		next(w, r)
	}
}

func GetRoomsRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getRoomsLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get rooms requests")
			return
		}

		next(w, r)
	}
}

func GetHotRoomsRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getHotRoomsLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get hot rooms requests")
			return
		}

		next(w, r)
	}
}

func GetRoomExamsRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !getRoomExamsLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get room exams requests")
			return
		}

		next(w, r)
	}
}
