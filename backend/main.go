// file: main.go
package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/config" // LƯU Ý: Thay chữ "backend" bằng tên module trong file go.mod của team bạn
)

func main() {
	// Kích hoạt kết nối Database Neon
	// Lưu ý: Biến môi trường DATABASE_URL do Docker load qua env_file trong docker-compose.yml
	config.ConnectDatabase()

	// API Health check
	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Backend Golang is running in Docker! _ You are apple of my eyes")
	})

	// Khởi động server
	fmt.Println("🚀 Server Golang started on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
