package utils

import (
    "encoding/json"
    "log"
    "net/http"
)

// SuccessResponse — Format chuẩn cho response thành công.
type SuccessResponse struct {
    Status string      `json:"status"`
    Data   interface{} `json:"data"`
}

// ErrorBody — Phần error bên trong ErrorResponse.
type ErrorBody struct {
    Code    string            `json:"code"`
    Message string            `json:"message"`
    Details []ValidationError `json:"details,omitempty"`
}

// ErrorResponse — Format chuẩn cho response lỗi.
type ErrorResponse struct {
    Status string    `json:"status"`
    Error  ErrorBody `json:"error"`
}

// ValidationError — Chi tiết lỗi từng field.
type ValidationError struct {
    Field   string `json:"field"`
    Message string `json:"message"`
}

// PaginatedResponse — Response có phân trang.
type PaginatedResponse struct {
    Status string      `json:"status"`
    Data   interface{} `json:"data"`
    Meta   PaginationMeta `json:"meta"`
}

// PaginationMeta — Metadata phân trang.
type PaginationMeta struct {
    Page  int `json:"page"`
    Limit int `json:"limit"`
    Total int `json:"total"`
}

// SendSuccess ghi response thành công (HTTP 200).
func SendSuccess(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    if err := json.NewEncoder(w).Encode(SuccessResponse{
        Status: "success",
        Data:   data,
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendCreated ghi response tạo mới thành công (HTTP 201).
func SendCreated(w http.ResponseWriter, data interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    if err := json.NewEncoder(w).Encode(SuccessResponse{
        Status: "success",
        Data:   data,
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendError ghi response lỗi với HTTP status code tương ứng.
func SendError(w http.ResponseWriter, statusCode int, code, message string) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    if err := json.NewEncoder(w).Encode(ErrorResponse{
        Status: "error",
        Error: ErrorBody{
            Code:    code,
            Message: message,
        },
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendValidationError ghi response lỗi validation (HTTP 422).
func SendValidationError(w http.ResponseWriter, details []ValidationError) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusUnprocessableEntity)
    if err := json.NewEncoder(w).Encode(ErrorResponse{
        Status: "error",
        Error: ErrorBody{
            Code:    "VALIDATION_FAILED",
            Message: "Input validation failed",
            Details: details,
        },
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}

// SendPaginated ghi response có phân trang (HTTP 200).
func SendPaginated(w http.ResponseWriter, data interface{}, page, limit, total int) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    if err := json.NewEncoder(w).Encode(PaginatedResponse{
        Status: "success",
        Data:   data,
        Meta:   PaginationMeta{Page: page, Limit: limit, Total: total},
    }); err != nil {
        log.Printf("response: encode error: %v", err)
    }
}