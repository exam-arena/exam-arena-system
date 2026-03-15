FROM node:20-alpine
WORKDIR /app

# Bật cơ chế lắng nghe thay đổi file liên tục (Dành cho Windows/Docker)
ENV WATCHPACK_POLLING=true
# Ép Next.js mở cổng ra ngoài mạng Docker
ENV HOST=0.0.0.0

COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev"]