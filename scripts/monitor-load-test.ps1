# Monitor Load Test - Real-time and Final Verification
# Usage:
#   .\monitor-load-test.ps1 -Mode live     # During test
#   .\monitor-load-test.ps1 -Mode final    # After test
#   .\monitor-load-test.ps1                # Default: live

param(
  [string]$Mode = "live",
  [int]$RefreshInterval = 2
)

function Get-RedisStats {
  $stream = docker exec -it exam-arena-system-redis-1 redis-cli XLEN exam_submit_stream 2>$null
  $buffered = docker exec -it exam-arena-system-redis-1 redis-cli SCARD dirty_attempts 2>$null
  $memory = docker exec -it exam-arena-system-redis-1 redis-cli INFO memory 2>$null | Select-String "used_memory_human" | ForEach-Object { $_.ToString().Split(':')[1] }
  
  return @{
    Stream = $stream -as [int]
    Buffered = $buffered -as [int]
    Memory = $memory.Trim()
  }
}

function Get-BackendStats {
  $stats = docker stats --no-stream exam-arena-system-backend-1 2>$null | Select-Object -Skip 1
  return $stats
}

function Get-DatabaseStats {
  $result = psql "$env:DATABASE_URL" -t -c "SELECT COUNT(*) as total, COUNT(CASE WHEN status='in_progress' THEN 1 END) as in_progress, COUNT(CASE WHEN status='submitted' THEN 1 END) as submitted, COUNT(CASE WHEN status='completed' THEN 1 END) as completed, COUNT(CASE WHEN status='abandoned' THEN 1 END) as abandoned FROM exam_attempt ea JOIN users u ON u.user_id = ea.user_id WHERE u.username LIKE 'load_student_%' AND ea.exam_id = '30000000-0000-0000-0000-000000010101';" 2>$null
  return $result
}

function Show-LiveMonitor {
  $iteration = 0
  
  while ($true) {
    $iteration++
    Clear-Host
    $timestamp = Get-Date -Format "HH:mm:ss"
    
    Write-Host "====================================================================" -ForegroundColor Cyan
    Write-Host "  LOAD TEST LIVE MONITOR (Iteration: $iteration)" -ForegroundColor Cyan
    Write-Host "  [$timestamp]" -ForegroundColor Cyan
    Write-Host "====================================================================" -ForegroundColor Cyan
    
    # Redis Stats
    Write-Host "`n[REDIS HEALTH]" -ForegroundColor Green
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
    
    try {
      $redis = Get-RedisStats
      Write-Host "  Submit Stream Queue: $($redis.Stream) items" -ForegroundColor Yellow
      Write-Host "  Buffered Answers: $($redis.Buffered) items" -ForegroundColor Yellow
      Write-Host "  Memory Usage: $($redis.Memory)" -ForegroundColor Yellow
      
      if ($redis.Stream -gt 100) {
        Write-Host "  WARNING: Submit queue backlog detected!" -ForegroundColor Red
      }
    }
    catch {
      Write-Host "  ERROR: Redis not reachable" -ForegroundColor Red
    }
    
    # Backend Stats
    Write-Host "`n[BACKEND CONTAINER]" -ForegroundColor Green
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
    
    try {
      $backend = Get-BackendStats
      Write-Host $backend -ForegroundColor Yellow
    }
    catch {
      Write-Host "  ERROR: Backend stats not available" -ForegroundColor Red
    }
    
    # Database Stats
    Write-Host "`n[DATABASE ATTEMPT STATUS]" -ForegroundColor Green
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
    
    try {
      $db = Get-DatabaseStats
      if ($db) {
        $parts = $db.Trim() -split '\|'
        Write-Host "  Total Attempts: $($parts[0].Trim())" -ForegroundColor Yellow
        Write-Host "  In Progress: $($parts[1].Trim())" -ForegroundColor Yellow
        Write-Host "  Submitted: $($parts[2].Trim())" -ForegroundColor Yellow
        Write-Host "  Completed: $($parts[3].Trim())" -ForegroundColor Yellow
        Write-Host "  Abandoned: $($parts[4].Trim())" -ForegroundColor Yellow
      }
    }
    catch {
      Write-Host "  ERROR: Database not reachable" -ForegroundColor Red
    }
    
    Write-Host "`nTIP: Press Ctrl+C to stop monitoring" -ForegroundColor Magenta
    Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
    
    Start-Sleep -Seconds $RefreshInterval
  }
}

function Show-FinalVerification {
  Clear-Host
  
  Write-Host "====================================================================" -ForegroundColor Cyan
  Write-Host "  LOAD TEST FINAL VERIFICATION" -ForegroundColor Cyan
  Write-Host "====================================================================" -ForegroundColor Cyan
  
  # Redis Final State
  Write-Host "`n[REDIS FINAL STATE - Should be 0]" -ForegroundColor Green
  Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
  
  try {
    $redis = Get-RedisStats
    $streamStatus = if ($redis.Stream -eq 0) { "OK" } else { "FAIL" }
    $bufferedStatus = if ($redis.Buffered -eq 0) { "OK" } else { "FAIL" }
    
    Write-Host "  [$streamStatus] Submit Stream: $($redis.Stream) items" -ForegroundColor Yellow
    Write-Host "  [$bufferedStatus] Buffered Answers: $($redis.Buffered) items" -ForegroundColor Yellow
    Write-Host "  Memory Usage: $($redis.Memory)" -ForegroundColor Yellow
  }
  catch {
    Write-Host "  ERROR: Redis not reachable" -ForegroundColor Red
  }
  
  # Backend Final State
  Write-Host "`n[BACKEND FINAL STATE]" -ForegroundColor Green
  Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
  
  try {
    $backend = Get-BackendStats
    Write-Host $backend -ForegroundColor Yellow
  }
  catch {
    Write-Host "  ERROR: Backend stats not available" -ForegroundColor Red
  }
  
  # Database Final State
  Write-Host "`n[DATABASE FINAL STATE]" -ForegroundColor Green
  Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
  
  try {
    $db = Get-DatabaseStats
    if ($db) {
      $parts = $db.Trim() -split '\|'
      Write-Host "  Total Attempts: $($parts[0].Trim())" -ForegroundColor Yellow
      Write-Host "  In Progress: $($parts[1].Trim())" -ForegroundColor Cyan
      Write-Host "  Submitted: $($parts[2].Trim())" -ForegroundColor Green
      Write-Host "  Completed: $($parts[3].Trim())" -ForegroundColor Green
      Write-Host "  Abandoned: $($parts[4].Trim())" -ForegroundColor Yellow
      
      $total = [int]$parts[0].Trim()
      $inProgress = [int]$parts[1].Trim()
      $completed = [int]$parts[3].Trim()
      
      Write-Host "`n[VALIDATION CHECKS]" -ForegroundColor Green
      Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
      
      if ($inProgress -eq 0) {
        Write-Host "  OK: No attempts in progress" -ForegroundColor Green
      }
      else {
        Write-Host "  WARNING: $inProgress attempts still in progress" -ForegroundColor Yellow
      }
      
      if ($completed -eq $total) {
        Write-Host "  OK: All $total attempts completed" -ForegroundColor Green
      }
      else {
        Write-Host "  WARNING: Only $completed/$total completed" -ForegroundColor Yellow
      }
    }
  }
  catch {
    Write-Host "  ERROR: Database not reachable" -ForegroundColor Red
  }
  
  # Backend Logs
  Write-Host "`n[BACKEND LOGS - Last 10 lines]" -ForegroundColor Green
  Write-Host "-------------------------------------------------------------------" -ForegroundColor Gray
  
  try {
    docker compose -f docker-compose.prod.yml -f docker-compose.staging.yml logs --tail=10 backend 2>$null | ForEach-Object {
      Write-Host "  $_" -ForegroundColor Gray
    }
  }
  catch {
    Write-Host "  ERROR: Logs not available" -ForegroundColor Red
  }
  
  Write-Host ""
}

# Main execution
if ($Mode -eq "live") {
  Write-Host "Starting LIVE monitoring... (Press Ctrl+C to stop)" -ForegroundColor Green
  Start-Sleep -Seconds 1
  Show-LiveMonitor
}
elseif ($Mode -eq "final") {
  Show-FinalVerification
}
else {
  Write-Host "ERROR: Invalid mode. Use: -Mode live or -Mode final" -ForegroundColor Red
  exit 1
}
