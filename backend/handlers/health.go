package handlers

import (
	"context"
	"errors"
	"net/http"
	"time"

	"backend/config"
	"backend/utils"
)

func Health(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	utils.SendSuccess(w, map[string]string{
		"status": "ok",
	})
}

func Readiness(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		utils.SendError(w, http.StatusMethodNotAllowed, "METHOD_NOT_ALLOWED", "Method not allowed")
		return
	}

	checks := map[string]string{
		"database": "ok",
		"redis":    "ok",
	}

	if err := checkDatabase(r.Context()); err != nil {
		checks["database"] = "unavailable"
		utils.SendError(w, http.StatusServiceUnavailable, "NOT_READY", "Database is not ready")
		return
	}

	if err := checkRedis(r.Context()); err != nil {
		checks["redis"] = "unavailable"
		utils.SendError(w, http.StatusServiceUnavailable, "NOT_READY", "Redis is not ready")
		return
	}

	utils.SendSuccess(w, map[string]interface{}{
		"status": "ready",
		"checks": checks,
	})
}

func checkDatabase(parent context.Context) error {
	if config.DB == nil {
		return errors.New("database is not initialized")
	}

	sqlDB, err := config.DB.DB()
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()

	return sqlDB.PingContext(ctx)
}

func checkRedis(parent context.Context) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return errors.New("redis is not initialized")
	}

	ctx, cancel := context.WithTimeout(parent, 2*time.Second)
	defer cancel()

	return config.RedisClient.Ping(ctx).Err()
}
