package workers

import (
	"context"
	"errors"
	"log"
	"os"
	"strconv"
	"strings"
	"time"

	"backend/config"
	"backend/services"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

const (
	submitStreamGroup           = "exam_submit_workers"
	submitStreamBatch           = 50
	submitStreamBlock           = 5 * time.Second
	submitPendingMinIdle        = 15 * time.Second
	submitPendingReclaimStart   = "0-0"
	submitPendingReclaimBatches = 4
	defaultSubmitWorkerTimeout  = 5 * time.Second
)

func StartSubmitWorker(ctx context.Context) {
	if !config.RedisEnabled || config.RedisClient == nil {
		log.Println("submit worker disabled: Redis not enabled")
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	consumer := buildConsumerName()
	if err := ensureSubmitStreamGroup(ctx); err != nil {
		log.Printf("submit worker: failed to ensure consumer group: %v", err)
		return
	}

	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			default:
			}

			if err := reclaimPendingSubmitMessages(ctx, consumer); err != nil {
				log.Printf("submit worker: reclaim pending failed: %v", err)
			}

			streams, err := config.RedisClient.XReadGroup(ctx, &redis.XReadGroupArgs{
				Group:    submitStreamGroup,
				Consumer: consumer,
				Streams:  []string{services.SubmitAttemptStreamName(), ">"},
				Count:    submitStreamBatch,
				Block:    submitStreamBlock,
			}).Result()
			if err != nil && !errors.Is(err, redis.Nil) {
				log.Printf("submit worker: read failed: %v", err)
				continue
			}

			for _, stream := range streams {
				for _, msg := range stream.Messages {
					processSubmitMessage(ctx, msg)
				}
			}
		}
	}()
}

func reclaimPendingSubmitMessages(ctx context.Context, consumer string) error {
	if !config.RedisEnabled || config.RedisClient == nil {
		return nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	start := submitPendingReclaimStart
	for batch := 0; batch < submitPendingReclaimBatches; batch++ {
		redisCtx, cancel := context.WithTimeout(ctx, time.Second)
		messages, nextStart, err := config.RedisClient.XAutoClaim(redisCtx, &redis.XAutoClaimArgs{
			Stream:   services.SubmitAttemptStreamName(),
			Group:    submitStreamGroup,
			Consumer: consumer,
			MinIdle:  submitPendingMinIdle,
			Start:    start,
			Count:    submitStreamBatch,
		}).Result()
		cancel()
		if err != nil && !errors.Is(err, redis.Nil) {
			return err
		}

		for _, msg := range messages {
			processSubmitMessage(ctx, msg)
		}

		if len(messages) < submitStreamBatch || nextStart == "" || nextStart == submitPendingReclaimStart {
			break
		}
		start = nextStart
	}

	return nil
}

func processSubmitMessage(ctx context.Context, msg redis.XMessage) {
	attemptID := getStreamString(msg.Values, "attempt_id")
	userID := getStreamString(msg.Values, "user_id")
	if attemptID == "" || userID == "" {
		ackAndDelete(ctx, msg.ID)
		return
	}

	workerCtx, cancel := context.WithTimeout(ctx, getSubmitWorkerTimeout())
	err := services.FinalizeQueuedSubmitAttempt(workerCtx, userID, attemptID)
	cancel()
	if err == nil {
		ackAndDelete(ctx, msg.ID)
		return
	}

	if isPermanentSubmitError(err) {
		services.ClearAttemptSubmitStatus(ctx, attemptID)
		ackAndDelete(ctx, msg.ID)
		return
	}

	log.Printf("submit worker: transient process failed for %s: %v", attemptID, err)
}

func isPermanentSubmitError(err error) bool {
	return errors.Is(err, services.ErrAttemptNotFound) ||
		errors.Is(err, services.ErrAttemptForbidden) ||
		errors.Is(err, services.ErrAttemptClosed)
}

func ensureSubmitStreamGroup(ctx context.Context) error {
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	err := config.RedisClient.XGroupCreateMkStream(redisCtx, services.SubmitAttemptStreamName(), submitStreamGroup, "0").Err()
	if err != nil && !strings.Contains(err.Error(), "BUSYGROUP") {
		return err
	}

	return nil
}

func ackAndDelete(ctx context.Context, id string) {
	if !config.RedisEnabled || config.RedisClient == nil {
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	redisCtx, cancel := context.WithTimeout(ctx, time.Second)
	defer cancel()

	_ = config.RedisClient.XAck(redisCtx, services.SubmitAttemptStreamName(), submitStreamGroup, id).Err()
	_ = config.RedisClient.XDel(redisCtx, services.SubmitAttemptStreamName(), id).Err()
}

func getStreamString(values map[string]interface{}, key string) string {
	raw, ok := values[key]
	if !ok || raw == nil {
		return ""
	}
	switch value := raw.(type) {
	case string:
		return value
	case []byte:
		return string(value)
	default:
		return ""
	}
}

func buildConsumerName() string {
	host, err := os.Hostname()
	if err != nil || host == "" {
		host = "worker"
	}
	return host + "-" + strconv.Itoa(os.Getpid()) + "-" + uuid.NewString()
}

func getSubmitWorkerTimeout() time.Duration {
	raw := strings.TrimSpace(os.Getenv("SUBMIT_WORKER_TIMEOUT_MS"))
	if raw == "" {
		return defaultSubmitWorkerTimeout
	}

	ms, err := strconv.Atoi(raw)
	if err != nil || ms <= 0 {
		return defaultSubmitWorkerTimeout
	}

	return time.Duration(ms) * time.Millisecond
}
