package middleware

import (
	"context"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/config"
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

type RedisRateLimiter struct {
	namespace string
	rate      float64
	burst     float64
	ttl       time.Duration
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

func newRedisRateLimiter(namespace string, ratePerSecond float64, burst int, ttl time.Duration) *RedisRateLimiter {
	return &RedisRateLimiter{
		namespace: namespace,
		rate:      ratePerSecond,
		burst:     float64(burst),
		ttl:       ttl,
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

var redisTokenBucketScript = `
local now = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local burst = tonumber(ARGV[3])
local ttl = tonumber(ARGV[4])

local values = redis.call("HMGET", KEYS[1], "tokens", "ts")
local tokens = tonumber(values[1])
local ts = tonumber(values[2])

if tokens == nil then
	tokens = burst
end

if ts == nil then
	ts = now
end

local delta = now - ts
if delta < 0 then
	delta = 0
end

tokens = math.min(burst, tokens + (delta * rate / 1000.0))

local allowed = 0
if tokens >= 1 then
	allowed = 1
	tokens = tokens - 1
end

redis.call("HMSET", KEYS[1], "tokens", tokens, "ts", now)
redis.call("PEXPIRE", KEYS[1], ttl)

return allowed
`

func (l *RedisRateLimiter) allow(ctx context.Context, key string) (bool, error) {
	if l == nil || !config.RedisEnabled || config.RedisClient == nil {
		return false, nil
	}

	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	result, err := config.RedisClient.Eval(
		redisCtx,
		redisTokenBucketScript,
		[]string{l.redisKey(key)},
		time.Now().UnixMilli(),
		l.rate,
		l.burst,
		l.ttl.Milliseconds(),
	).Int64()
	if err != nil {
		return false, err
	}

	return result == 1, nil
}

func (l *RedisRateLimiter) redisKey(key string) string {
	return "rate-limit:" + l.namespace + ":" + key
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

var registerLimiter = newIPRateLimiter(
	getEnvFloat("REGISTER_RATE_LIMIT_RPS", 2),
	int(getEnvFloat("REGISTER_RATE_LIMIT_BURST", 6)),
	5*time.Minute,
)

var loginRedisLimiter = newRedisRateLimiter(
	"login",
	getEnvFloat("LOGIN_RATE_LIMIT_RPS", 3),
	int(getEnvFloat("LOGIN_RATE_LIMIT_BURST", 10)),
	5*time.Minute,
)

var registerRedisLimiter = newRedisRateLimiter(
	"register",
	getEnvFloat("REGISTER_RATE_LIMIT_RPS", 2),
	int(getEnvFloat("REGISTER_RATE_LIMIT_BURST", 6)),
	5*time.Minute,
)

var registerEmailLimiter = newIPRateLimiter(
	getEnvFloat("REGISTER_EMAIL_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("REGISTER_EMAIL_RATE_LIMIT_BURST", 4)),
	5*time.Minute,
)

var registerEmailRedisLimiter = newRedisRateLimiter(
	"register-email",
	getEnvFloat("REGISTER_EMAIL_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("REGISTER_EMAIL_RATE_LIMIT_BURST", 4)),
	5*time.Minute,
)

var registerUsernameLimiter = newIPRateLimiter(
	getEnvFloat("REGISTER_USERNAME_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("REGISTER_USERNAME_RATE_LIMIT_BURST", 4)),
	5*time.Minute,
)

var registerUsernameRedisLimiter = newRedisRateLimiter(
	"register-username",
	getEnvFloat("REGISTER_USERNAME_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("REGISTER_USERNAME_RATE_LIMIT_BURST", 4)),
	5*time.Minute,
)

var loginIdentifierLimiter = newIPRateLimiter(
	getEnvFloat("LOGIN_IDENTIFIER_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("LOGIN_IDENTIFIER_RATE_LIMIT_BURST", 5)),
	5*time.Minute,
)

var loginIdentifierRedisLimiter = newRedisRateLimiter(
	"login-identifier",
	getEnvFloat("LOGIN_IDENTIFIER_RATE_LIMIT_RPS", 1),
	int(getEnvFloat("LOGIN_IDENTIFIER_RATE_LIMIT_BURST", 5)),
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

var getAttemptHistoryLimiter = newIPRateLimiter(
	getEnvFloat("GET_ATTEMPT_HISTORY_RATE_LIMIT_RPS", 6),
	int(getEnvFloat("GET_ATTEMPT_HISTORY_RATE_LIMIT_BURST", 18)),
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

var getProfileLimiter = newIPRateLimiter(
	getEnvFloat("GET_PROFILE_RATE_LIMIT_RPS", 10),
	int(getEnvFloat("GET_PROFILE_RATE_LIMIT_BURST", 30)),
	2*time.Minute,
)

var updateProfileLimiter = newIPRateLimiter(
	getEnvFloat("UPDATE_PROFILE_RATE_LIMIT_RPS", 3),
	int(getEnvFloat("UPDATE_PROFILE_RATE_LIMIT_BURST", 10)),
	2*time.Minute,
)

func LoginRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if allowed, err := loginRedisLimiter.allow(r.Context(), key); err == nil && config.RedisEnabled && config.RedisClient != nil {
			if !allowed {
				utils.RecordLoginRateLimitedIP()
				utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many login attempts")
				return
			}

			next(w, r)
			return
		}

		if !loginLimiter.allow(key) {
			utils.RecordLoginRateLimitedIP()
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many login attempts")
			return
		}

		next(w, r)
	}
}

func RegisterRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if allowed, err := registerRedisLimiter.allow(r.Context(), key); err == nil && config.RedisEnabled && config.RedisClient != nil {
			if !allowed {
				utils.RecordRegisterRateLimited()
				utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many register attempts")
				return
			}

			next(w, r)
			return
		}

		if !registerLimiter.allow(key) {
			utils.RecordRegisterRateLimited()
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many register attempts")
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

func GetAttemptHistoryRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !getAttemptHistoryLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get attempt history requests")
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

func GetProfileRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !getProfileLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many get profile requests")
			return
		}

		next(w, r)
	}
}

func UpdateProfileRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		key := clientIP(r)
		if userID, ok := UserID(r); ok {
			key = "user:" + userID.String()
		}

		if !updateProfileLimiter.allow(key) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many update profile requests")
			return
		}

		next(w, r)
	}
}
