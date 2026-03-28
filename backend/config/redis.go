package config

import (
	"context"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

var (
	RedisClient  *redis.Client
	RedisEnabled bool
)

func ConnectRedis() {
	redisURL := os.Getenv("REDIS_URL")
	if redisURL == "" {
		log.Println("Redis is disabled: REDIS_URL is not set")
		return
	}

	opts, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Printf("Redis is disabled: invalid REDIS_URL: %v", err)
		return
	}

	client := redis.NewClient(opts)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	if err := client.Ping(ctx).Err(); err != nil {
		log.Printf("Redis is disabled: ping failed: %v", err)
		_ = client.Close()
		return
	}

	RedisClient = client
	RedisEnabled = true
	log.Println("Connected to Redis")
}
