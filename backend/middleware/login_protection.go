package middleware

import (
	"context"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"backend/config"
	"backend/utils"
)

const (
	loginFailureWindow = 5 * time.Minute
)

type loginFailureState struct {
	failures      int
	lastSeen      time.Time
	cooldownUntil time.Time
}

var (
	loginFailureThreshold      = getEnvInt("LOGIN_IDENTIFIER_FAILURE_THRESHOLD", 5)
	loginFailureCooldown       = time.Duration(getEnvInt("LOGIN_IDENTIFIER_COOLDOWN_SECONDS", 10)) * time.Second
	loginFailureStateMu        sync.Mutex
	loginFailureStateByAccount = make(map[string]*loginFailureState)
	registerFailureThreshold      = getEnvInt("REGISTER_IDENTIFIER_FAILURE_THRESHOLD", 3)
	registerFailureCooldown       = time.Duration(getEnvInt("REGISTER_IDENTIFIER_COOLDOWN_SECONDS", 15)) * time.Second
	registerFailureStateMu        sync.Mutex
	registerFailureStateByAccount = make(map[string]*loginFailureState)
)

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}

func CheckLoginIdentifierAccess(ctx context.Context, identifier string) (bool, string) {
	normalized := normalizeLoginIdentifier(identifier)
	if normalized == "" {
		return true, ""
	}

	if isLoginIdentifierCoolingDown(ctx, normalized) {
		utils.RecordLoginCooldown()
		utils.RecordLoginRateLimitedIdentifier()
		return false, "cooldown"
	}

	if allowed, err := loginIdentifierRedisLimiter.allow(ctx, normalized); err == nil && config.RedisEnabled && config.RedisClient != nil {
		if !allowed {
			utils.RecordLoginRateLimitedIdentifier()
			return false, "identifier_rate_limit"
		}
		return true, ""
	}

	if !loginIdentifierLimiter.allow(normalized) {
		utils.RecordLoginRateLimitedIdentifier()
		return false, "identifier_rate_limit"
	}

	return true, ""
}

func RegisterLoginAttemptFailure(ctx context.Context, identifier string) {
	normalized := normalizeLoginIdentifier(identifier)
	if normalized == "" {
		return
	}

	if config.RedisEnabled && config.RedisClient != nil {
		registerLoginAttemptFailureRedis(ctx, normalized)
		return
	}

	registerLoginAttemptFailureLocal(normalized)
}

func ClearLoginAttemptFailures(ctx context.Context, identifier string) {
	normalized := normalizeLoginIdentifier(identifier)
	if normalized == "" {
		return
	}

	if config.RedisEnabled && config.RedisClient != nil {
		clearLoginAttemptFailuresRedis(ctx, normalized)
		return
	}

	clearLoginAttemptFailuresLocal(normalized)
}

func isLoginIdentifierCoolingDown(ctx context.Context, normalized string) bool {
	if config.RedisEnabled && config.RedisClient != nil {
		return isLoginIdentifierCoolingDownRedis(ctx, normalized)
	}

	return isLoginIdentifierCoolingDownLocal(normalized)
}

func registerLoginAttemptFailureRedis(ctx context.Context, normalized string) {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	failKey := "login-failures:" + normalized
	count, err := config.RedisClient.Incr(redisCtx, failKey).Result()
	if err != nil {
		return
	}

	if count == 1 {
		_ = config.RedisClient.Expire(redisCtx, failKey, loginFailureWindow).Err()
	}

	if int(count) < loginFailureThreshold {
		return
	}

	cooldownKey := "login-cooldown:" + normalized
	_ = config.RedisClient.Set(redisCtx, cooldownKey, 1, loginFailureCooldown).Err()
	_ = config.RedisClient.Del(redisCtx, failKey).Err()
}

func clearLoginAttemptFailuresRedis(ctx context.Context, normalized string) {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Del(redisCtx, "login-failures:"+normalized, "login-cooldown:"+normalized).Err()
}

func isLoginIdentifierCoolingDownRedis(ctx context.Context, normalized string) bool {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	exists, err := config.RedisClient.Exists(redisCtx, "login-cooldown:"+normalized).Result()
	if err != nil {
		return false
	}

	return exists > 0
}

func registerLoginAttemptFailureLocal(normalized string) {
	now := time.Now()

	loginFailureStateMu.Lock()
	defer loginFailureStateMu.Unlock()

	state, ok := loginFailureStateByAccount[normalized]
	if !ok || now.Sub(state.lastSeen) > loginFailureWindow {
		state = &loginFailureState{}
		loginFailureStateByAccount[normalized] = state
	}

	state.failures++
	state.lastSeen = now
	if state.failures >= loginFailureThreshold {
		state.cooldownUntil = now.Add(loginFailureCooldown)
		state.failures = 0
	}
}

func clearLoginAttemptFailuresLocal(normalized string) {
	loginFailureStateMu.Lock()
	defer loginFailureStateMu.Unlock()

	delete(loginFailureStateByAccount, normalized)
}

func isLoginIdentifierCoolingDownLocal(normalized string) bool {
	now := time.Now()

	loginFailureStateMu.Lock()
	defer loginFailureStateMu.Unlock()

	for key, state := range loginFailureStateByAccount {
		if now.Sub(state.lastSeen) > loginFailureWindow && state.cooldownUntil.Before(now) {
			delete(loginFailureStateByAccount, key)
		}
	}

	state, ok := loginFailureStateByAccount[normalized]
	if !ok {
		return false
	}

	return state.cooldownUntil.After(now)
}

func normalizeLoginIdentifier(identifier string) string {
	normalized := strings.TrimSpace(identifier)
	if strings.Contains(normalized, "@") {
		normalized = strings.ToLower(normalized)
	}

	return normalized
}

func CheckRegisterIdentifiersAccess(ctx context.Context, email, username string) (bool, string) {
	normalizedEmail := normalizeLoginIdentifier(email)
	if normalizedEmail != "" {
		if blocked, reason := checkRegisterKeyAccess(ctx, "email", normalizedEmail); blocked {
			return false, reason
		}
	}

	normalizedUsername := normalizeLoginIdentifier(username)
	if normalizedUsername != "" {
		if blocked, reason := checkRegisterKeyAccess(ctx, "username", normalizedUsername); blocked {
			return false, reason
		}
	}

	return true, ""
}

func RegisterRegisterAttemptFailure(ctx context.Context, email, username string) {
	registerIdentifierFailure(ctx, "email", normalizeLoginIdentifier(email))
	registerIdentifierFailure(ctx, "username", normalizeLoginIdentifier(username))
}

func ClearRegisterAttemptFailures(ctx context.Context, email, username string) {
	clearRegisterIdentifierFailure(ctx, "email", normalizeLoginIdentifier(email))
	clearRegisterIdentifierFailure(ctx, "username", normalizeLoginIdentifier(username))
}

func checkRegisterKeyAccess(ctx context.Context, kind, key string) (bool, string) {
	if key == "" {
		return false, ""
	}

	if isRegisterIdentifierCoolingDown(ctx, kind, key) {
		utils.RecordRegisterRateLimited()
		return true, "cooldown"
	}

	var (
		allowed bool
		err     error
	)

	switch kind {
	case "email":
		allowed, err = registerEmailRedisLimiter.allow(ctx, key)
		if err == nil && config.RedisEnabled && config.RedisClient != nil {
			if !allowed {
				utils.RecordRegisterRateLimited()
				return true, "identifier_rate_limit"
			}
			return false, ""
		}
		if !registerEmailLimiter.allow(key) {
			utils.RecordRegisterRateLimited()
			return true, "identifier_rate_limit"
		}
	case "username":
		allowed, err = registerUsernameRedisLimiter.allow(ctx, key)
		if err == nil && config.RedisEnabled && config.RedisClient != nil {
			if !allowed {
				utils.RecordRegisterRateLimited()
				return true, "identifier_rate_limit"
			}
			return false, ""
		}
		if !registerUsernameLimiter.allow(key) {
			utils.RecordRegisterRateLimited()
			return true, "identifier_rate_limit"
		}
	}

	return false, ""
}

func registerIdentifierFailure(ctx context.Context, kind, key string) {
	if key == "" {
		return
	}

	if config.RedisEnabled && config.RedisClient != nil {
		registerIdentifierFailureRedis(ctx, kind, key)
		return
	}

	registerIdentifierFailureLocal(kind, key)
}

func clearRegisterIdentifierFailure(ctx context.Context, kind, key string) {
	if key == "" {
		return
	}

	if config.RedisEnabled && config.RedisClient != nil {
		clearRegisterIdentifierFailureRedis(ctx, kind, key)
		return
	}

	clearRegisterIdentifierFailureLocal(kind, key)
}

func isRegisterIdentifierCoolingDown(ctx context.Context, kind, key string) bool {
	if config.RedisEnabled && config.RedisClient != nil {
		return isRegisterIdentifierCoolingDownRedis(ctx, kind, key)
	}

	return isRegisterIdentifierCoolingDownLocal(kind, key)
}

func registerIdentifierFailureRedis(ctx context.Context, kind, key string) {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	failKey := "register-failures:" + kind + ":" + key
	count, err := config.RedisClient.Incr(redisCtx, failKey).Result()
	if err != nil {
		return
	}
	if count == 1 {
		_ = config.RedisClient.Expire(redisCtx, failKey, loginFailureWindow).Err()
	}
	if int(count) < registerFailureThreshold {
		return
	}

	cooldownKey := "register-cooldown:" + kind + ":" + key
	_ = config.RedisClient.Set(redisCtx, cooldownKey, 1, registerFailureCooldown).Err()
	_ = config.RedisClient.Del(redisCtx, failKey).Err()
}

func clearRegisterIdentifierFailureRedis(ctx context.Context, kind, key string) {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.Del(
		redisCtx,
		"register-failures:"+kind+":"+key,
		"register-cooldown:"+kind+":"+key,
	).Err()
}

func isRegisterIdentifierCoolingDownRedis(ctx context.Context, kind, key string) bool {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, 500*time.Millisecond)
	defer cancel()

	exists, err := config.RedisClient.Exists(redisCtx, "register-cooldown:"+kind+":"+key).Result()
	if err != nil {
		return false
	}

	return exists > 0
}

func registerIdentifierFailureLocal(kind, key string) {
	now := time.Now()
	scopedKey := kind + ":" + key

	registerFailureStateMu.Lock()
	defer registerFailureStateMu.Unlock()

	state, ok := registerFailureStateByAccount[scopedKey]
	if !ok || now.Sub(state.lastSeen) > loginFailureWindow {
		state = &loginFailureState{}
		registerFailureStateByAccount[scopedKey] = state
	}

	state.failures++
	state.lastSeen = now
	if state.failures >= registerFailureThreshold {
		state.cooldownUntil = now.Add(registerFailureCooldown)
		state.failures = 0
	}
}

func clearRegisterIdentifierFailureLocal(kind, key string) {
	registerFailureStateMu.Lock()
	defer registerFailureStateMu.Unlock()

	delete(registerFailureStateByAccount, kind+":"+key)
}

func isRegisterIdentifierCoolingDownLocal(kind, key string) bool {
	now := time.Now()
	scopedKey := kind + ":" + key

	registerFailureStateMu.Lock()
	defer registerFailureStateMu.Unlock()

	for stateKey, state := range registerFailureStateByAccount {
		if now.Sub(state.lastSeen) > loginFailureWindow && state.cooldownUntil.Before(now) {
			delete(registerFailureStateByAccount, stateKey)
		}
	}

	state, ok := registerFailureStateByAccount[scopedKey]
	if !ok {
		return false
	}

	return state.cooldownUntil.After(now)
}
