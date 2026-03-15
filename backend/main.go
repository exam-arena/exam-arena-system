package main
import (
	"fmt"
	"net/http"
)
func main() {
	http.HandleFunc("/api/health", func(w http.ResponseWriter, r *http.Request) {
		fmt.Fprintf(w, "Backend Golang is running in Docker! _ You are apple of my ss")
	})
	fmt.Println("Server Golang started on port 8080...")
	http.ListenAndServe(":8080", nil)
}