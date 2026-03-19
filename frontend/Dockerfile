FROM node:20-bookworm-slim
WORKDIR /app

# Bật cơ chế lắng nghe thay đổi file liên tục (Dành cho Windows/Docker)
ENV WATCHPACK_POLLING=true

COPY package*.json ./
RUN npm install
COPY . .
# Next.js 16 cần --hostname 0.0.0.0 để bind ra ngoài mạng Docker
CMD ["npx", "next", "dev", "--hostname", "0.0.0.0", "-p", "3000"]