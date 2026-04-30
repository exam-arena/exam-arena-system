package utils

import "expvar"

var (
	loginSuccessTotal               = expvar.NewInt("login_success_total")
	loginFailureTotal               = expvar.NewInt("login_failure_total")
	loginRateLimitedIPTotal         = expvar.NewInt("login_rate_limited_ip_total")
	loginRateLimitedIdentifierTotal = expvar.NewInt("login_rate_limited_identifier_total")
	loginCooldownTotal              = expvar.NewInt("login_identifier_cooldown_total")
	loginDBLatencyMsTotal           = expvar.NewInt("login_db_latency_ms_total")
	loginDBLatencyCount             = expvar.NewInt("login_db_latency_count")
	loginPasswordLatencyMsTotal     = expvar.NewInt("login_password_check_latency_ms_total")
	loginPasswordLatencyCount       = expvar.NewInt("login_password_check_latency_count")
	loginPasswordWaitMsTotal        = expvar.NewInt("login_password_check_wait_ms_total")
	loginPasswordWaitCount          = expvar.NewInt("login_password_check_wait_count")
	loginPasswordWaitersCurrent     = expvar.NewInt("login_password_check_waiters_current")
	loginPasswordInFlightCurrent    = expvar.NewInt("login_password_check_in_flight_current")
	registerSuccessTotal            = expvar.NewInt("register_success_total")
	registerConflictTotal           = expvar.NewInt("register_conflict_total")
	registerRateLimitedTotal        = expvar.NewInt("register_rate_limited_total")
	registerDBLatencyMsTotal        = expvar.NewInt("register_db_latency_ms_total")
	registerDBLatencyCount          = expvar.NewInt("register_db_latency_count")
	registerHashLatencyMsTotal      = expvar.NewInt("register_hash_latency_ms_total")
	registerHashLatencyCount        = expvar.NewInt("register_hash_latency_count")
	registerHashWaitMsTotal         = expvar.NewInt("register_hash_wait_ms_total")
	registerHashWaitCount           = expvar.NewInt("register_hash_wait_count")
	registerHashWaitersCurrent      = expvar.NewInt("register_hash_waiters_current")
	registerHashInFlightCurrent     = expvar.NewInt("register_hash_in_flight_current")
)

func RecordLoginSuccess() {
	loginSuccessTotal.Add(1)
}

func RecordLoginFailure() {
	loginFailureTotal.Add(1)
}

func RecordLoginRateLimitedIP() {
	loginRateLimitedIPTotal.Add(1)
}

func RecordLoginRateLimitedIdentifier() {
	loginRateLimitedIdentifierTotal.Add(1)
}

func RecordLoginCooldown() {
	loginCooldownTotal.Add(1)
}

func RecordLoginDBLatency(ms int64) {
	loginDBLatencyMsTotal.Add(ms)
	loginDBLatencyCount.Add(1)
}

func RecordLoginPasswordLatency(ms int64) {
	loginPasswordLatencyMsTotal.Add(ms)
	loginPasswordLatencyCount.Add(1)
}

func RecordLoginPasswordWait(ms int64) {
	loginPasswordWaitMsTotal.Add(ms)
	loginPasswordWaitCount.Add(1)
}

func IncLoginPasswordWaiters() {
	loginPasswordWaitersCurrent.Add(1)
}

func DecLoginPasswordWaiters() {
	loginPasswordWaitersCurrent.Add(-1)
}

func IncLoginPasswordInFlight() {
	loginPasswordInFlightCurrent.Add(1)
}

func DecLoginPasswordInFlight() {
	loginPasswordInFlightCurrent.Add(-1)
}

func RecordRegisterSuccess() {
	registerSuccessTotal.Add(1)
}

func RecordRegisterConflict() {
	registerConflictTotal.Add(1)
}

func RecordRegisterRateLimited() {
	registerRateLimitedTotal.Add(1)
}

func RecordRegisterDBLatency(ms int64) {
	registerDBLatencyMsTotal.Add(ms)
	registerDBLatencyCount.Add(1)
}

func RecordRegisterHashLatency(ms int64) {
	registerHashLatencyMsTotal.Add(ms)
	registerHashLatencyCount.Add(1)
}

func RecordRegisterHashWait(ms int64) {
	registerHashWaitMsTotal.Add(ms)
	registerHashWaitCount.Add(1)
}

func IncRegisterHashWaiters() {
	registerHashWaitersCurrent.Add(1)
}

func DecRegisterHashWaiters() {
	registerHashWaitersCurrent.Add(-1)
}

func IncRegisterHashInFlight() {
	registerHashInFlightCurrent.Add(1)
}

func DecRegisterHashInFlight() {
	registerHashInFlightCurrent.Add(-1)
}
