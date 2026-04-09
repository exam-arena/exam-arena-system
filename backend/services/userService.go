package services

import (
	"context"
	"errors"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"backend/models"
	"backend/repositories"
	"backend/utils"
)

const defaultRegisterDBTimeout = 1200 * time.Millisecond
const defaultRegisterHashWaitTimeout = 2 * time.Second
const defaultLoginDBTimeout = 800 * time.Millisecond
const defaultLoginPasswordWaitTimeout = 2 * time.Second

// Precomputed bcrypt hash for "not_the_real_password".
const dummyLoginPasswordHash = "$2a$10$TeGxO.HiAGd3ujM2s62gW.zj.gSCkJvvrqdouiuwvUQY6SkpQsOOG"

type RegisterInput struct {
	Username string
	Email    string
	Password string
	Fullname string
}

type LoginInput struct {
	Identifier string
	Password   string
}

type LoginResponse struct {
	Token string       `json:"-"`
	User  UserResponse `json:"user"`
}

type UserResponse struct {
	UserID         string `json:"user_id"`
	Username       string `json:"username"`
	Fullname       string `json:"fullname"`
	Email          string `json:"email"`
	AvatarProvider string `json:"avatar_provider"`
	AvatarKey      string `json:"avatar_key"`
	AvatarURL      string `json:"avatar_url"`
	Role           string `json:"role"`
}

var (
	ErrMissingFields      = errors.New("Vui lòng điền đầy đủ thông tin")
	ErrInvalidEmail       = errors.New("Định dạng email không hợp lệ")
	ErrInvalidPassword    = errors.New("Mật khẩu phải có ít nhất 8 ký tự, bao gồm chữ hoa, chữ thường và số")
	ErrInvalidUsername    = errors.New("Tên tài khoản không hợp lệ")
	ErrInvalidFullname    = errors.New("Họ và tên không hợp lệ")
	ErrEmailExists        = errors.New("Email đã được sử dụng")
	ErrUsernameExists     = errors.New("Tên tài khoản đã tồn tại")
	ErrInvalidCredentials = errors.New("Tài khoản hoặc mật khẩu không đúng")
	ErrInternal           = errors.New("Đã xảy ra lỗi, vui lòng thử lại")
)

var authPasswordWorkTokens = make(chan struct{}, resolveAuthPasswordWorkConcurrency())
var loginPasswordCheckTokens = authPasswordWorkTokens
var registerHashTokens = authPasswordWorkTokens

func RegisterUser(ctx context.Context, input RegisterInput) error {
	if ctx == nil {
		ctx = context.Background()
	}

	input.Email = strings.TrimSpace(strings.ToLower(input.Email))
	input.Username = strings.TrimSpace(input.Username)
	input.Fullname = strings.TrimSpace(input.Fullname)

	if input.Email == "" || input.Password == "" || input.Username == "" || input.Fullname == "" {
		return ErrMissingFields
	}

	if !utils.IsValidEmail(input.Email) {
		return ErrInvalidEmail
	}

	if !utils.IsValidPassword(input.Password) {
		return ErrInvalidPassword
	}

	if !utils.IsValidUsername(input.Username) {
		return ErrInvalidUsername
	}

	if !utils.IsValidFullname(input.Fullname) {
		return ErrInvalidFullname
	}

	hashedPassword, err := hashRegisterPassword(ctx, input.Password)
	if err != nil {
		return ErrInternal
	}

	user := models.User{
		Username: input.Username,
		Email:    input.Email,
		Password: hashedPassword,
		Fullname: input.Fullname,
		Role:     "student",
	}

	if err := createUserWithTimeout(ctx, &user); err != nil {
		switch {
		case errors.Is(err, repositories.ErrUserEmailConflict):
			utils.RecordRegisterConflict()
			return ErrEmailExists
		case errors.Is(err, repositories.ErrUserUsernameConflict):
			utils.RecordRegisterConflict()
			return ErrUsernameExists
		default:
			return ErrInternal
		}
	}

	utils.RecordRegisterSuccess()
	return nil
}

func LoginUser(ctx context.Context, input LoginInput) (*LoginResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	identifier := strings.TrimSpace(input.Identifier)
	password := input.Password
	if strings.Contains(identifier, "@") {
		identifier = strings.ToLower(identifier)
	}

	if identifier == "" || password == "" {
		return nil, ErrMissingFields
	}

	user, err := getLoginUserWithTimeout(ctx, identifier)
	if err != nil {
		return nil, ErrInternal
	}

	hashToCheck := dummyLoginPasswordHash
	if user != nil && strings.TrimSpace(user.Password) != "" {
		hashToCheck = user.Password
	}

	if err := checkLoginPassword(ctx, password, hashToCheck); err != nil {
		if errors.Is(err, context.DeadlineExceeded) || errors.Is(err, context.Canceled) {
			return nil, ErrInternal
		}

		utils.RecordLoginFailure()
		return nil, ErrInvalidCredentials
	}

	if user == nil {
		utils.RecordLoginFailure()
		return nil, ErrInvalidCredentials
	}

	token, err := utils.GenerateJWT(user)
	if err != nil {
		return nil, ErrInternal
	}

	utils.RecordLoginSuccess()

	return &LoginResponse{
		Token: token,
		User: UserResponse{
			UserID:         user.UserID,
			Username:       user.Username,
			Fullname:       user.Fullname,
			Email:          user.Email,
			AvatarProvider: user.AvatarProvider,
			AvatarKey:      user.AvatarKey,
			AvatarURL:      user.AvatarURL,
			Role:           user.Role,
		},
	}, nil
}

func GetCurrentUser(ctx context.Context, userID string) (*UserResponse, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	userID = strings.TrimSpace(userID)
	if userID == "" {
		return nil, ErrInvalidCredentials
	}

	dbCtx, cancel := context.WithTimeout(ctx, getEnvDurationMs("GET_ME_DB_TIMEOUT_MS", defaultLoginDBTimeout))
	defer cancel()

	user, err := repositories.GetUserSessionByIDWithContext(dbCtx, userID)
	if err != nil {
		if errors.Is(err, repositories.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, ErrInternal
	}

	return &UserResponse{
		UserID:         user.UserID,
		Username:       user.Username,
		Fullname:       user.Fullname,
		Email:          user.Email,
		AvatarProvider: user.AvatarProvider,
		AvatarKey:      user.AvatarKey,
		AvatarURL:      user.AvatarURL,
		Role:           user.Role,
	}, nil
}

func createUserWithTimeout(ctx context.Context, user *models.User) error {
	dbCtx, cancel := context.WithTimeout(ctx, getEnvDurationMs("REGISTER_DB_TIMEOUT_MS", defaultRegisterDBTimeout))
	defer cancel()

	startedAt := time.Now()
	err := repositories.CreateUserWithContext(dbCtx, user)
	utils.RecordRegisterDBLatency(time.Since(startedAt).Milliseconds())

	return err
}

func hashRegisterPassword(ctx context.Context, password string) (string, error) {
	waitStartedAt := time.Now()

	utils.IncRegisterHashWaiters()
	acquireCtx, cancel := context.WithTimeout(ctx, getEnvDurationMs("REGISTER_HASH_WAIT_TIMEOUT_MS", defaultRegisterHashWaitTimeout))
	defer cancel()

	select {
	case registerHashTokens <- struct{}{}:
		utils.DecRegisterHashWaiters()
		utils.RecordRegisterHashWait(time.Since(waitStartedAt).Milliseconds())
		defer func() {
			<-registerHashTokens
			utils.DecRegisterHashInFlight()
		}()
		utils.IncRegisterHashInFlight()
	case <-acquireCtx.Done():
		utils.DecRegisterHashWaiters()
		utils.RecordRegisterHashWait(time.Since(waitStartedAt).Milliseconds())
		return "", acquireCtx.Err()
	}

	hashStartedAt := time.Now()
	hashedPassword, err := utils.HashPassword(password)
	utils.RecordRegisterHashLatency(time.Since(hashStartedAt).Milliseconds())

	return hashedPassword, err
}

func getLoginUserWithTimeout(ctx context.Context, identifier string) (*models.User, error) {
	dbCtx, cancel := context.WithTimeout(ctx, getEnvDurationMs("LOGIN_DB_TIMEOUT_MS", defaultLoginDBTimeout))
	defer cancel()

	startedAt := time.Now()
	user, err := repositories.GetUserByIdentifierWithContext(dbCtx, identifier)
	utils.RecordLoginDBLatency(time.Since(startedAt).Milliseconds())

	if err != nil {
		return nil, err
	}

	return user, nil
}

func checkLoginPassword(ctx context.Context, password, hashedPassword string) error {
	waitStartedAt := time.Now()

	utils.IncLoginPasswordWaiters()
	acquireCtx, cancel := context.WithTimeout(ctx, getEnvDurationMs("LOGIN_PASSWORD_WAIT_TIMEOUT_MS", defaultLoginPasswordWaitTimeout))
	defer cancel()

	select {
	case loginPasswordCheckTokens <- struct{}{}:
		utils.DecLoginPasswordWaiters()
		utils.RecordLoginPasswordWait(time.Since(waitStartedAt).Milliseconds())
		defer func() {
			<-loginPasswordCheckTokens
			utils.DecLoginPasswordInFlight()
		}()
		utils.IncLoginPasswordInFlight()
	case <-acquireCtx.Done():
		utils.DecLoginPasswordWaiters()
		utils.RecordLoginPasswordWait(time.Since(waitStartedAt).Milliseconds())
		return acquireCtx.Err()
	}

	checkStartedAt := time.Now()
	err := utils.CheckPassword(password, hashedPassword)
	utils.RecordLoginPasswordLatency(time.Since(checkStartedAt).Milliseconds())

	return err
}

func getEnvInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return value
}

func getEnvDurationMs(key string, fallback time.Duration) time.Duration {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}

	value, err := strconv.Atoi(raw)
	if err != nil || value <= 0 {
		return fallback
	}

	return time.Duration(value) * time.Millisecond
}

func resolveAuthPasswordWorkConcurrency() int {
	if configured := getEnvInt("AUTH_PASSWORD_WORK_MAX_CONCURRENCY", 0); configured > 0 {
		return configured
	}

	// bcrypt is CPU-bound, so auth should only consume part of the host.
	// This keeps login/register bursts from starving exam-serving handlers that
	// still run in the same process.
	gomaxprocs := runtime.GOMAXPROCS(0)
	if gomaxprocs <= 1 {
		return 1
	}

	sharedBudget := gomaxprocs / 2
	if sharedBudget < 2 {
		sharedBudget = 2
	}

	return sharedBudget
}
