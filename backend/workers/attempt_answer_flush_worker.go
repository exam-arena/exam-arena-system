package workers

import (
	"context"
	"log"
	"time"

	"backend/config"
	"backend/services"
)

func StartAttemptAnswerFlushWorker(ctx context.Context) {
	if !config.RedisEnabled || config.RedisClient == nil {
		log.Println("attempt answer flush worker disabled: Redis not enabled")
		return
	}
	if ctx == nil {
		ctx = context.Background()
	}

	interval := services.GetAttemptAnswerFlushInterval()
	if interval <= 0 {
		log.Println("attempt answer flush worker disabled by config")
		return
	}

	batchSize := services.GetAttemptAnswerFlushBatchSize()

	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		runAttemptAnswerFlush(ctx, batchSize)

		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				runAttemptAnswerFlush(ctx, batchSize)
			}
		}
	}()
}

func runAttemptAnswerFlush(ctx context.Context, batchSize int) {
	for {
		flushed, err := services.FlushDirtyAttemptAnswers(ctx, batchSize)
		if err != nil {
			log.Printf("attempt answer flush worker failed: %v", err)
			return
		}
		if flushed == 0 {
			return
		}
		if flushed < batchSize {
			return
		}
	}
}
