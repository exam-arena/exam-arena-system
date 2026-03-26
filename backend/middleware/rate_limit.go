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

func LoginRateLimit(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if !loginLimiter.allow(clientIP(r)) {
			utils.SendError(w, http.StatusTooManyRequests, "TOO_MANY_REQUESTS", "Too many login attempts")
			return
		}

		next(w, r)
	}
}
