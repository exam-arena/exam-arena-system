package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"backend/config"
	"backend/middleware"
	"backend/routes"
	"backend/utils"
)

func main() {
	// ===== Init =====
	utils.InitJWT()
	config.ConnectDatabase()
	config.ConnectRedis()
	routes.SetupRoutes()

	// ===== Tạo server =====
	server := &http.Server{
		Addr:              ":8080",
		Handler:           middleware.CORS(http.DefaultServeMux),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	// ===== Run server (goroutine) =====
	go func() {
		fmt.Println("🚀 Server Golang started on port 8080...")
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal("❌ Listen error:", err)
		}
	}()

	// ===== Lắng nghe signal từ OS (Docker, Ctrl+C) =====
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	<-quit // ⏳ chờ tín hiệu
	fmt.Println("🛑 Shutting down server...")

	// ===== Cho phép xử lý request còn lại trong 10s =====
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		log.Fatal("❌ Forced shutdown:", err)
	}

	fmt.Println("✅ Server exited gracefully")
}