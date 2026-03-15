FROM golang:1.26-alpine
WORKDIR /app
# Cài tool Air để hot-reload code Go
ARG AIR_VERSION=v1.64.5
# Use Go 1.26 so we can install the latest Air comfortably
RUN go install github.com/air-verse/air@${AIR_VERSION}
COPY go.mod ./
# Dùng touch để tạo go.sum giả nếu chưa có thư viện ngoài
RUN touch go.sum && go mod download
COPY . .
CMD ["air"]