# AWS EC2 Production Runbook

Purpose: prepare the AWS EC2 production host for the 2026-05-17 beta exam. This runbook keeps the beta architecture intentionally simple:

```text
DNS examarena.id.vn / api.examarena.id.vn
-> AWS EC2 + Elastic IP
-> Caddy HTTPS reverse proxy
-> Docker Compose
   -> frontend container
   -> backend container
   -> redis container
-> Neon PostgreSQL
-> S3 media
-> CloudFront optional when AWS verification is complete
```

This step does not migrate to RDS, ElastiCache, ALB, ECS, or Fargate.

## 1. AWS Resource Choices

Recommended settings for the beta:

```text
Region: ap-southeast-1 if available
AMI: Amazon Linux 2023
Instance type: c7i-flex.large, or m7i-flex.large if it has more RAM and the price is acceptable
Root disk: gp3, 30-50 GB
Public IP: Elastic IP
```

Security group:

```text
SSH 22: your current IP only if possible
HTTP 80: 0.0.0.0/0
HTTPS 443: 0.0.0.0/0
3000: do not open publicly
8080: do not open publicly
6379: do not open publicly
```

## 2. DNS

Create these records at the DNS provider:

```text
A examarena.id.vn     -> EC2 Elastic IP
A api.examarena.id.vn -> EC2 Elastic IP
```

Wait until both records resolve before starting Caddy certificate issuance.

Check from your machine:

```powershell
nslookup examarena.id.vn
nslookup api.examarena.id.vn
```

## 3. Install Docker On Amazon Linux 2023

SSH into the EC2 host, then run:

```bash
sudo dnf update -y
sudo dnf install -y docker git
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
```

Log out and SSH back in so the Docker group change applies.

Verify:

```bash
docker --version
docker compose version
```

If `docker compose` is not available, install the Compose plugin:

```bash
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.27.0/docker-compose-linux-x86_64 -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
docker compose version
```

## 4. Install Caddy

For Amazon Linux 2023:

```bash
sudo dnf install -y 'dnf-command(copr)'
sudo dnf copr enable @caddy/caddy -y
sudo dnf install -y caddy
sudo systemctl enable --now caddy
```

If the Caddy package is not available in your region/mirror, use Nginx + Certbot as a fallback. Do not continue with public production traffic over plain HTTP.

## 5. Put The App On The Server

Clone the repository or copy the release source to the server:

```bash
git clone <your-repo-url> exam-arena-system
cd exam-arena-system
git checkout <known-good-commit>
```

Record the deployed commit:

```bash
git rev-parse --short HEAD
```

## 6. Create `.env.production`

Create `.env.production` on the EC2 host. Do not commit this file.

Critical values:

```env
DATABASE_URL=<Neon production database URL>
JWT_SECRET=<strong random production secret>
REDIS_URL=redis://redis:6379/0
ALLOWED_ORIGINS=https://examarena.id.vn
COOKIE_SECURE=true
NEXT_PUBLIC_API_URL=https://api.examarena.id.vn
API_INTERNAL_URL=http://backend:8080
```

Do not use these values in production:

```env
NEXT_PUBLIC_API_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
```

## 7. Configure Caddy

Copy the example:

```bash
sudo cp deploy/Caddyfile.example /etc/caddy/Caddyfile
sudo caddy fmt --overwrite /etc/caddy/Caddyfile
sudo systemctl reload caddy
sudo systemctl status caddy --no-pager
```

Caddy should obtain HTTPS certificates automatically after DNS points to the EC2 Elastic IP and ports 80/443 are open.

## 8. Render And Start Docker Compose

Use the EC2 override so containers bind only to localhost:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml config
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml build backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
```

Pass criteria:

```text
backend is healthy
frontend is running
redis is running if included by the final compose stack
3000 and 8080 are not open directly from the internet
```

## 9. Health And Readiness Checks

Local checks on EC2:

```bash
curl -i http://127.0.0.1:8080/healthz
curl -i http://127.0.0.1:8080/readyz
```

Public checks:

```bash
curl -i https://api.examarena.id.vn/healthz
curl -i https://api.examarena.id.vn/readyz
```

Pass criteria:

```text
/healthz returns HTTP 200
/readyz returns HTTP 200
no repeated backend restarts
no Caddy certificate errors
```

If `/readyz` fails, inspect DB and Redis before admitting users.

## 10. Smoke Test

Run from your local machine against the real API domain:

```powershell
$env:SMOKE_API_URL="https://api.examarena.id.vn"
$env:SMOKE_IDENTIFIER="mock_student_0101"
$env:SMOKE_PASSWORD="Password@123"
$env:SMOKE_EXAM_ID="30000000-0000-0000-0000-000000010101"
node scripts/smoke-beta-flow.js
```

Pass criteria:

```text
healthz pass
readyz pass
login pass
auth/me pass
list room/exam pass
start attempt pass
save answer pass
submit pass
result/review pass
```

Do not run destructive seed/reset scripts against the real production database unless this is a disposable rehearsal database.

## 11. Logs And Runtime Checks

Useful commands:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml logs --tail=100 backend
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml logs --tail=100 frontend
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
docker stats --no-stream
sudo journalctl -u caddy --no-pager -n 100
```

During rehearsal and exam, watch for:

```text
repeated 5xx
backend restarts
high memory usage
DB connection exhaustion
Redis backlog growth
Caddy TLS errors
broken image URLs
```

## 12. Stop And Start EC2 To Save Cost

Before stopping EC2:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml logs --tail=50 backend
```

Use AWS Console to Stop the instance. Do not Terminate it.

After starting EC2 again:

```bash
cd exam-arena-system
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
curl -i https://api.examarena.id.vn/healthz
curl -i https://api.examarena.id.vn/readyz
```

If containers are not running:

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml up -d
```

From 2026-05-16 evening through the 2026-05-17 exam window, keep EC2 running continuously.

## 13. Minimal Rollback

Before every deploy, record:

```text
current git commit
previous known-good git commit
time of deploy
operator
database target
media mode: CloudFront / S3 direct fallback
```

Rollback to a previous commit:

```bash
git fetch
git checkout <previous-known-good-commit>
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml build backend frontend
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml up -d
docker compose --env-file .env.production -f docker-compose.prod.yml -f docker-compose.ec2.yml ps
curl -i https://api.examarena.id.vn/readyz
```

Do not run database rollback commands during the exam unless the issue is understood and approved.

## 14. Go / No-Go For This Step

This EC2 host setup is Go only if:

```text
EC2 has Elastic IP
DNS records resolve to Elastic IP
Caddy serves HTTPS for both domains
Docker Compose config renders with the EC2 override
backend /healthz and /readyz pass locally and publicly
frontend loads from https://examarena.id.vn
smoke test passes against https://api.examarena.id.vn
rollback command path is known
operator knows how to stop/start EC2 without terminating it
```
