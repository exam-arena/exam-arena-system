package repositories

import (
	"context"
	"encoding/json"
	"time"

	"backend/config"

	"github.com/google/uuid"
)

type AttemptRow struct {
	AttemptID string
	UserID    string
	ExamID    string
	Status    string
	StartedAt time.Time
	ExamTitle string
	ExamType  string
	Duration  int
	StartTime *time.Time
	Username  string
	Fullname  string
	Email     string
	Role      string
}

type AttemptWriteGuardRow struct {
	AttemptID string
	UserID    string
	Status    string
	EndAt     *time.Time
}

type AttemptQuestionOptionRow struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type AttemptQuestionRow struct {
	QuestionID   string
	ParentID     *string
	Content      string
	ImageURL     *string
	OptionsRaw   []byte
	Type         string
	QuestionType string
	Options      []AttemptQuestionOptionRow `gorm:"-"`
}

type AttemptReviewQuestionRow struct {
	QuestionID    string
	ParentID      *string
	Content       string
	ImageURL      *string
	OptionsRaw    []byte
	Type          string
	QuestionType  string
	CorrectAnswer *string
	Explanation   *string
	SelectedAns   *string
	Options       []AttemptQuestionOptionRow `gorm:"-"`
}

type SaveAttemptAnswerInput struct {
	QuestionID  string `json:"question_id"`
	SelectedAns string `json:"selected_ans"`
}

type SaveAttemptAnswerRow struct {
	QuestionID  string `json:"question_id"`
	SelectedAns string `json:"selected_ans"`
}

type ResolvedAttemptAnswerRow struct {
	LogID               string `json:"log_id"`
	QuestionID          string `json:"question_id"`
	SelectedAns         string `json:"selected_ans"`
	ExistingSelectedAns string `json:"existing_selected_ans"`
}

type SaveAttemptAnswersResult struct {
	AttemptExists bool
	IsOwner       bool
	CanWrite      bool
	Rows          []SaveAttemptAnswerRow
}

type ResolveAttemptAnswersResult struct {
	AttemptExists bool
	IsOwner       bool
	CanWrite      bool
	Rows          []ResolvedAttemptAnswerRow
}

type AttemptSubmissionRow struct {
	AttemptID   string
	Status      string
	SubmittedAt *time.Time
}

type SubmitAttemptResult struct {
	AttemptExists bool
	IsOwner       bool
	Status        string
	Summary       *AttemptSubmissionRow
}

type AutoSubmittedAttemptRow struct {
	AttemptID string
	UserID    string
}

type AttemptResultBaseRow struct {
	AttemptID string
	UserID    string
	Status    string
	ExamTitle string
	ExamType  string
	RoomID    string
	RoomName  string
	Username  string
	Fullname  string
	Email     string
	Role      string
}

type AttemptResultQuestionRow struct {
	QuestionID    string
	ParentID      *string
	Type          string
	CorrectAnswer *string
	SelectedAns   *string
}

type AttemptAnswerRow struct {
	QuestionID  string
	SelectedAns string
}

type ExamAttemptPolicyRow struct {
	ExamID    string
	Type      string
	Duration  int
	StartTime *time.Time
}

const effectiveAttemptDeadlineSQL = `
CASE
	WHEN LOWER(COALESCE(e.type, '')) IN ('mock_test', 'official') AND e.start_time IS NOT NULL
	THEN LEAST(
		ea.started_at + (e.duration * INTERVAL '1 second'),
		e.start_time + (e.duration * INTERVAL '1 second')
	)
	ELSE ea.started_at + (e.duration * INTERVAL '1 second')
END
`

func GetExamAttemptPolicyByID(ctx context.Context, examID string) (*ExamAttemptPolicyRow, error) {
	if _, err := uuid.Parse(examID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row ExamAttemptPolicyRow
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			e.exam_id,
			e.type,
			e.duration,
			e.start_time
		FROM exam e
		WHERE e.exam_id = ?::uuid
		  AND e.deleted_at IS NULL
		LIMIT 1
	`, examID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.ExamID == "" {
		return nil, nil
	}

	return &row, nil
}

func GetOrCreateInProgressAttempt(ctx context.Context, userID, examID string) (*AttemptRow, error) {
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(examID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row AttemptRow
	err := config.DB.WithContext(ctx).Raw(`
		WITH inserted AS (
			INSERT INTO exam_attempt (
				attempt_id,
				user_id,
				exam_id,
				attempt_type,
				marks,
				status,
				started_at,
				updated_at
			)
			SELECT
				gen_random_uuid(),
				?::uuid,
				e.exam_id,
				e.type,
				0,
				'in_progress',
				CURRENT_TIMESTAMP,
				CURRENT_TIMESTAMP
			FROM exam e
			WHERE e.exam_id = ?::uuid
			  AND e.deleted_at IS NULL
			ON CONFLICT (user_id, exam_id)
			WHERE status = 'in_progress'
			DO NOTHING
			RETURNING
				attempt_id,
				user_id,
				exam_id,
				status,
				started_at
		)
		SELECT
			attempt_id,
			user_id,
			exam_id,
			status,
			started_at
		FROM inserted
		UNION ALL
		SELECT
			attempt_id,
			user_id,
			exam_id,
			status,
			started_at
		FROM exam_attempt
		WHERE user_id = ?::uuid
		  AND exam_id = ?::uuid
		  AND status = 'in_progress'
		  AND NOT EXISTS (SELECT 1 FROM inserted)
		LIMIT 1
	`, userID, examID, userID, examID).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	if row.AttemptID == "" {
		return nil, nil
	}

	return &row, nil
}

func GetAttemptByID(ctx context.Context, attemptID string) (*AttemptRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row AttemptRow
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			a.attempt_id,
			a.user_id,
			a.exam_id,
			a.status,
			a.started_at,
			e.title AS exam_title,
			e.type AS exam_type,
			e.duration,
			e.start_time,
			u.username,
			u.fullname,
			u.email,
			u.role
		FROM exam_attempt a
		JOIN exam e ON e.exam_id = a.exam_id
		JOIN users u ON u.user_id = a.user_id
		WHERE a.attempt_id = ?
		  AND e.deleted_at IS NULL
		  AND u.deleted_at IS NULL
		LIMIT 1
	`, attemptID).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	if row.AttemptID == "" {
		return nil, nil
	}

	return &row, nil
}

func GetAttemptWriteGuard(ctx context.Context, attemptID string) (*AttemptWriteGuardRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row AttemptWriteGuardRow
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			attempt_id,
			user_id,
			status,
			end_at
		FROM exam_attempt
		WHERE attempt_id = ?
		LIMIT 1
	`, attemptID).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	if row.AttemptID == "" {
		return nil, nil
	}

	return &row, nil
}

func ResolveAttemptAnswersAuthorized(ctx context.Context, attemptID, userID string, answers []SaveAttemptAnswerInput) (*ResolveAttemptAnswersResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}
	if len(answers) == 0 {
		return &ResolveAttemptAnswersResult{Rows: make([]ResolvedAttemptAnswerRow, 0)}, nil
	}

	payload, err := json.Marshal(answers)
	if err != nil {
		return nil, err
	}

	var queryResult struct {
		AttemptExists bool
		IsOwner       bool
		CanWrite      bool
		RowsRaw       []byte
	}
	err = config.DB.WithContext(ctx).Raw(`
		WITH attempt_guard AS (
			SELECT
				attempt_id,
				user_id,
				status,
`+effectiveAttemptDeadlineSQL+` AS expires_at
			FROM exam_attempt ea
			JOIN exam e ON e.exam_id = ea.exam_id
			WHERE ea.attempt_id = ?::uuid
			LIMIT 1
		),
		write_guard AS (
			SELECT attempt_id
			FROM attempt_guard
			WHERE user_id = ?::uuid
			  AND status = 'in_progress'
			  AND CURRENT_TIMESTAMP < expires_at
		),
		payload AS (
			SELECT
				question_id::uuid AS question_id,
				selected_ans::text AS selected_ans
			FROM jsonb_to_recordset(?::jsonb) AS p(question_id text, selected_ans text)
		),
		question_sections AS (
			SELECT DISTINCT
				q.section_id
			FROM payload p
			JOIN question q
			  ON q.question_id = p.question_id
			 AND q.deleted_at IS NULL
		),
		ensured_logs AS (
			INSERT INTO attempt_section_log (
				log_id,
				attempt_id,
				section_id,
				status,
				started_at
			)
			SELECT
				gen_random_uuid(),
				wg.attempt_id,
				qs.section_id,
				'in_progress',
				CURRENT_TIMESTAMP
			FROM question_sections qs
			CROSS JOIN write_guard wg
			ON CONFLICT (attempt_id, section_id) DO NOTHING
		),
		resolved AS (
			SELECT
				asl.log_id,
				p.question_id,
				p.selected_ans,
				COALESCE(ad.selected_ans, '') AS existing_selected_ans
			FROM payload p
			JOIN question q
			  ON q.question_id = p.question_id
			 AND q.deleted_at IS NULL
			CROSS JOIN write_guard wg
			JOIN attempt_section_log asl
			  ON asl.attempt_id = wg.attempt_id
			 AND asl.section_id = q.section_id
			LEFT JOIN attempt_detail ad
			  ON ad.log_id = asl.log_id
			 AND ad.question_id = p.question_id
		)
		SELECT
			EXISTS(SELECT 1 FROM attempt_guard) AS attempt_exists,
			COALESCE((SELECT user_id = ?::uuid FROM attempt_guard), FALSE) AS is_owner,
			COALESCE((SELECT status = 'in_progress' AND user_id = ?::uuid AND CURRENT_TIMESTAMP < expires_at FROM attempt_guard), FALSE) AS can_write,
			COALESCE(
				json_agg(
					json_build_object(
						'log_id', log_id,
						'question_id', question_id,
						'selected_ans', selected_ans,
						'existing_selected_ans', existing_selected_ans
					)
					ORDER BY question_id
				) FILTER (WHERE question_id IS NOT NULL),
				'[]'::json
			)::text::bytea AS rows_raw
		FROM resolved
	`, attemptID, userID, string(payload), userID, userID).Scan(&queryResult).Error
	if err != nil {
		return nil, err
	}

	rows := make([]ResolvedAttemptAnswerRow, 0, len(answers))
	if len(queryResult.RowsRaw) > 0 {
		if err := json.Unmarshal(queryResult.RowsRaw, &rows); err != nil {
			return nil, err
		}
	}

	return &ResolveAttemptAnswersResult{
		AttemptExists: queryResult.AttemptExists,
		IsOwner:       queryResult.IsOwner,
		CanWrite:      queryResult.CanWrite,
		Rows:          rows,
	}, nil
}

func ApplyAttemptAnswerChangesAuthorized(ctx context.Context, attemptID, userID string, rows []ResolvedAttemptAnswerRow) (*SaveAttemptAnswersResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}
	if len(rows) == 0 {
		return &SaveAttemptAnswersResult{Rows: make([]SaveAttemptAnswerRow, 0)}, nil
	}

	payload, err := json.Marshal(rows)
	if err != nil {
		return nil, err
	}

	var queryResult struct {
		AttemptExists bool
		IsOwner       bool
		CanWrite      bool
		SavedRowsRaw  []byte
	}
	err = config.DB.WithContext(ctx).Raw(`
		WITH attempt_guard AS (
			SELECT
				attempt_id,
				user_id,
				status,
`+effectiveAttemptDeadlineSQL+` AS expires_at
			FROM exam_attempt ea
			JOIN exam e ON e.exam_id = ea.exam_id
			WHERE ea.attempt_id = ?::uuid
			LIMIT 1
		),
		write_guard AS (
			SELECT attempt_id
			FROM attempt_guard
			WHERE user_id = ?::uuid
			  AND status = 'in_progress'
			  AND CURRENT_TIMESTAMP < expires_at
		),
		payload AS (
			SELECT
				log_id::uuid AS log_id,
				question_id::uuid AS question_id,
				selected_ans::text AS selected_ans
			FROM jsonb_to_recordset(?::jsonb) AS p(log_id text, question_id text, selected_ans text, existing_selected_ans text)
		),
		validated AS (
			SELECT
				p.log_id,
				p.question_id,
				p.selected_ans
			FROM payload p
			JOIN attempt_section_log asl
			  ON asl.log_id = p.log_id
			JOIN write_guard wg
			  ON wg.attempt_id = asl.attempt_id
		),
		upserted AS (
			INSERT INTO attempt_detail (
				detail_id,
				log_id,
				question_id,
				selected_ans,
				is_correct
			)
			SELECT
				gen_random_uuid(),
				v.log_id,
				v.question_id,
				v.selected_ans,
				NULL
			FROM validated v
			ON CONFLICT (log_id, question_id)
			DO UPDATE SET
				selected_ans = EXCLUDED.selected_ans,
				is_correct = NULL
			WHERE attempt_detail.selected_ans IS DISTINCT FROM EXCLUDED.selected_ans
			RETURNING
				question_id,
				selected_ans
		)
		SELECT
			EXISTS(SELECT 1 FROM attempt_guard) AS attempt_exists,
			COALESCE((SELECT user_id = ?::uuid FROM attempt_guard), FALSE) AS is_owner,
			COALESCE((SELECT status = 'in_progress' AND user_id = ?::uuid AND CURRENT_TIMESTAMP < expires_at FROM attempt_guard), FALSE) AS can_write,
			COALESCE(
				json_agg(
					json_build_object(
						'question_id', question_id,
						'selected_ans', selected_ans
					)
					ORDER BY question_id
				) FILTER (WHERE question_id IS NOT NULL),
				'[]'::json
			)::text::bytea AS saved_rows_raw
		FROM upserted
	`, attemptID, userID, string(payload), userID, userID).Scan(&queryResult).Error
	if err != nil {
		return nil, err
	}

	savedRows := make([]SaveAttemptAnswerRow, 0, len(rows))
	if len(queryResult.SavedRowsRaw) > 0 {
		if err := json.Unmarshal(queryResult.SavedRowsRaw, &savedRows); err != nil {
			return nil, err
		}
	}

	return &SaveAttemptAnswersResult{
		AttemptExists: queryResult.AttemptExists,
		IsOwner:       queryResult.IsOwner,
		CanWrite:      queryResult.CanWrite,
		Rows:          savedRows,
	}, nil
}

func ListQuestionsByExamID(ctx context.Context, examID string) ([]AttemptQuestionRow, error) {
	rows := make([]AttemptQuestionRow, 0)
	if _, err := uuid.Parse(examID); err != nil {
		return rows, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			q.question_id,
			q.parent_id,
			q.content,
			q.image_url,
			COALESCE(q.options, '[]'::jsonb)::text::bytea AS options_raw,
			q.type,
			q.question_type
		FROM exam_section s
		JOIN question q ON q.section_id = s.section_id
		WHERE s.exam_id = ?::uuid
		  AND q.deleted_at IS NULL
		ORDER BY s.section_id, q.parent_id NULLS FIRST, q.question_id
	`, examID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for i := range rows {
		if len(rows[i].OptionsRaw) == 0 {
			rows[i].Options = make([]AttemptQuestionOptionRow, 0)
			continue
		}

		if err := json.Unmarshal(rows[i].OptionsRaw, &rows[i].Options); err != nil {
			return nil, err
		}
		if rows[i].Options == nil {
			rows[i].Options = make([]AttemptQuestionOptionRow, 0)
		}
	}

	return rows, nil
}

func UpsertAttemptAnswersAuthorized(ctx context.Context, attemptID, userID string, answers []SaveAttemptAnswerInput, allowPostSubmitFlush bool) (*SaveAttemptAnswersResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}
	if len(answers) == 0 {
		return &SaveAttemptAnswersResult{Rows: make([]SaveAttemptAnswerRow, 0)}, nil
	}

	payload, err := json.Marshal(answers)
	if err != nil {
		return nil, err
	}

	var queryResult struct {
		AttemptExists bool
		IsOwner       bool
		CanWrite      bool
		SavedRowsRaw  []byte
	}
	err = config.DB.WithContext(ctx).Raw(`
		WITH attempt_guard AS (
			SELECT
				attempt_id,
				user_id,
				status,
`+effectiveAttemptDeadlineSQL+` AS expires_at
			FROM exam_attempt ea
			JOIN exam e ON e.exam_id = ea.exam_id
			WHERE ea.attempt_id = ?::uuid
			LIMIT 1
		),
		write_guard AS (
			SELECT attempt_id
			FROM attempt_guard
			WHERE user_id = ?::uuid
			  AND (
				(status = 'in_progress' AND CURRENT_TIMESTAMP < expires_at)
				OR (?::boolean AND status = 'submitted')
			  )
		),
		payload AS (
			SELECT
				question_id::uuid AS question_id,
				selected_ans::text AS selected_ans
			FROM jsonb_to_recordset(?::jsonb) AS p(question_id text, selected_ans text)
		),
		question_sections AS (
			SELECT DISTINCT
				q.section_id
			FROM payload p
			JOIN question q
			  ON q.question_id = p.question_id
			 AND q.deleted_at IS NULL
		),
		ensured_logs AS (
			INSERT INTO attempt_section_log (
				log_id,
				attempt_id,
				section_id,
				status,
				started_at
			)
			SELECT
				gen_random_uuid(),
				wg.attempt_id,
				qs.section_id,
				'in_progress',
				CURRENT_TIMESTAMP
			FROM question_sections qs
			CROSS JOIN write_guard wg
			ON CONFLICT (attempt_id, section_id) DO NOTHING
		),
		resolved AS (
			SELECT
				asl.log_id,
				p.question_id,
				p.selected_ans
			FROM payload p
			JOIN question q
			  ON q.question_id = p.question_id
			 AND q.deleted_at IS NULL
			CROSS JOIN write_guard wg
			JOIN attempt_section_log asl
			  ON asl.attempt_id = wg.attempt_id
			 AND asl.section_id = q.section_id
		),
		resolved_with_existing AS (
			SELECT
				r.log_id,
				r.question_id,
				r.selected_ans,
				ad.selected_ans AS existing_selected_ans
			FROM resolved r
			LEFT JOIN attempt_detail ad
			  ON ad.log_id = r.log_id
			 AND ad.question_id = r.question_id
		),
		changed AS (
			SELECT
				log_id,
				question_id,
				selected_ans
			FROM resolved_with_existing
			WHERE existing_selected_ans IS DISTINCT FROM selected_ans
		),
		upserted AS (
			INSERT INTO attempt_detail (
				detail_id,
				log_id,
				question_id,
				selected_ans,
				is_correct
			)
			SELECT
				gen_random_uuid(),
				c.log_id,
				c.question_id,
				c.selected_ans,
				NULL
			FROM changed c
			ON CONFLICT (log_id, question_id)
			DO UPDATE SET
				selected_ans = EXCLUDED.selected_ans,
				is_correct = NULL
			WHERE attempt_detail.selected_ans IS DISTINCT FROM EXCLUDED.selected_ans
			RETURNING
				question_id,
				selected_ans
		),
		result_rows AS (
			SELECT
				question_id,
				selected_ans
			FROM resolved
		)
		SELECT
			EXISTS(SELECT 1 FROM attempt_guard) AS attempt_exists,
			COALESCE((SELECT user_id = ?::uuid FROM attempt_guard), FALSE) AS is_owner,
			COALESCE(
				(
					SELECT
						(
							(status = 'in_progress' AND CURRENT_TIMESTAMP < expires_at)
							OR (?::boolean AND status = 'submitted')
						)
						AND user_id = ?::uuid
					FROM attempt_guard
				),
				FALSE
			) AS can_write,
			COALESCE(
				json_agg(
					json_build_object(
						'question_id', question_id,
						'selected_ans', selected_ans
					)
				) FILTER (WHERE question_id IS NOT NULL),
				'[]'::json
			)::text::bytea AS saved_rows_raw
		FROM result_rows
	`, attemptID, userID, allowPostSubmitFlush, string(payload), userID, allowPostSubmitFlush, userID).Scan(&queryResult).Error
	if err != nil {
		return nil, err
	}

	rows := make([]SaveAttemptAnswerRow, 0, len(answers))
	if len(queryResult.SavedRowsRaw) > 0 {
		if err := json.Unmarshal(queryResult.SavedRowsRaw, &rows); err != nil {
			return nil, err
		}
	}

	return &SaveAttemptAnswersResult{
		AttemptExists: queryResult.AttemptExists,
		IsOwner:       queryResult.IsOwner,
		CanWrite:      queryResult.CanWrite,
		Rows:          rows,
	}, nil
}

func SubmitAttemptAuthorized(ctx context.Context, attemptID, userID string) (*SubmitAttemptResult, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if _, err := uuid.Parse(userID); err != nil {
		return nil, nil
	}

	var queryResult struct {
		AttemptExists bool
		IsOwner       bool
		Status        string
		AttemptID     string
		SubmittedAt   *time.Time
	}

	err := config.DB.WithContext(ctx).Raw(`
		WITH attempt_guard AS (
			SELECT
				ea.attempt_id,
				ea.user_id,
				ea.exam_id,
				ea.status,
				ea.started_at,
				ea.end_at,
`+effectiveAttemptDeadlineSQL+` AS expires_at
			FROM exam_attempt ea
			JOIN exam e ON e.exam_id = ea.exam_id
			WHERE ea.attempt_id = ?::uuid
			LIMIT 1
		),
		authorized AS (
			SELECT *
			FROM attempt_guard
			WHERE user_id = ?::uuid
		),
		updated_sections AS (
			UPDATE attempt_section_log asl
			SET
				status = 'completed',
				end_at = COALESCE(asl.end_at, LEAST(CURRENT_TIMESTAMP, a.expires_at))
			FROM authorized a
			WHERE asl.attempt_id = a.attempt_id
			  AND a.status = 'in_progress'
			  AND asl.status <> 'completed'
		),
		updated_attempt AS (
			UPDATE exam_attempt ea
			SET
				status = 'submitted',
				end_at = COALESCE(ea.end_at, LEAST(CURRENT_TIMESTAMP, a.expires_at)),
				updated_at = CURRENT_TIMESTAMP
			FROM authorized a
			WHERE ea.attempt_id = a.attempt_id
			  AND a.status = 'in_progress'
			RETURNING
				ea.attempt_id,
				ea.status,
				ea.end_at
		),
		final_summary AS (
			SELECT
				ua.attempt_id,
				ua.status,
				ua.end_at AS submitted_at
			FROM updated_attempt ua
			UNION ALL
			SELECT
				a.attempt_id,
				a.status,
				a.end_at AS submitted_at
			FROM authorized a
			WHERE a.status = 'submitted'
		)
		SELECT
			EXISTS(SELECT 1 FROM attempt_guard) AS attempt_exists,
			EXISTS(SELECT 1 FROM authorized) AS is_owner,
			COALESCE((SELECT status FROM authorized LIMIT 1), '') AS status,
			fs.attempt_id,
			fs.submitted_at
		FROM final_summary fs
		RIGHT JOIN (SELECT 1) anchor ON TRUE
		LIMIT 1
	`, attemptID, userID).Scan(&queryResult).Error
	if err != nil {
		return nil, err
	}

	var summary *AttemptSubmissionRow
	if queryResult.AttemptID != "" {
		summary = &AttemptSubmissionRow{
			AttemptID:   queryResult.AttemptID,
			Status:      "submitted",
			SubmittedAt: queryResult.SubmittedAt,
		}
	}

	return &SubmitAttemptResult{
		AttemptExists: queryResult.AttemptExists,
		IsOwner:       queryResult.IsOwner,
		Status:        queryResult.Status,
		Summary:       summary,
	}, nil
}

func AutoSubmitExpiredAttempts(ctx context.Context, limit int) ([]AutoSubmittedAttemptRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}
	if limit <= 0 {
		limit = 100
	}

	rows := make([]AutoSubmittedAttemptRow, 0)
	err := config.DB.WithContext(ctx).Raw(`
		WITH expired_attempts AS (
			SELECT
				ea.attempt_id,
				ea.user_id,
`+effectiveAttemptDeadlineSQL+` AS expires_at
			FROM exam_attempt ea
			JOIN exam e ON e.exam_id = ea.exam_id
			WHERE ea.status = 'in_progress'
			  AND CURRENT_TIMESTAMP >= `+effectiveAttemptDeadlineSQL+`
			ORDER BY expires_at, ea.started_at
			LIMIT ?
		),
		updated_sections AS (
			UPDATE attempt_section_log asl
			SET
				status = 'completed',
				end_at = COALESCE(asl.end_at, exp.expires_at)
			FROM expired_attempts exp
			WHERE asl.attempt_id = exp.attempt_id
			  AND asl.status <> 'completed'
		),
		updated_attempts AS (
			UPDATE exam_attempt ea
			SET
				status = 'submitted',
				end_at = COALESCE(ea.end_at, exp.expires_at),
				updated_at = CURRENT_TIMESTAMP
			FROM expired_attempts exp
			WHERE ea.attempt_id = exp.attempt_id
			  AND ea.status = 'in_progress'
			RETURNING
				ea.attempt_id,
				ea.user_id
		)
		SELECT
			attempt_id,
			user_id
		FROM updated_attempts
	`, limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func GetAttemptResultBase(ctx context.Context, attemptID string) (*AttemptResultBaseRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	var row AttemptResultBaseRow
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			a.attempt_id,
			a.user_id,
			a.status,
			e.title AS exam_title,
			e.type AS exam_type,
			r.room_id,
			r.name AS room_name,
			u.username,
			u.fullname,
			u.email,
			u.role
		FROM exam_attempt a
		JOIN exam e ON e.exam_id = a.exam_id
		JOIN exam_room r ON r.room_id = e.room_id
		JOIN users u ON u.user_id = a.user_id
		WHERE a.attempt_id = ?::uuid
		  AND e.deleted_at IS NULL
		  AND r.deleted_at IS NULL
		  AND u.deleted_at IS NULL
		LIMIT 1
	`, attemptID).Scan(&row).Error
	if err != nil {
		return nil, err
	}
	if row.AttemptID == "" {
		return nil, nil
	}

	return &row, nil
}

func ListAttemptResultQuestions(ctx context.Context, attemptID string) ([]AttemptResultQuestionRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]AttemptResultQuestionRow, 0)
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			q.question_id,
			q.parent_id,
			q.type,
			q.correct_answer,
			ad.selected_ans
		FROM exam_attempt a
		JOIN exam_section s
		  ON s.exam_id = a.exam_id
		JOIN question q
		  ON q.section_id = s.section_id
		 AND q.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT
				ad.selected_ans
			FROM attempt_section_log asl
			JOIN attempt_detail ad
			  ON ad.log_id = asl.log_id
			 AND ad.question_id = q.question_id
			WHERE asl.attempt_id = a.attempt_id
			  AND asl.section_id = s.section_id
			ORDER BY asl.started_at DESC NULLS LAST, asl.log_id DESC
			LIMIT 1
		) ad ON TRUE
		WHERE a.attempt_id = ?::uuid
		ORDER BY s.section_id, q.parent_id NULLS FIRST, q.question_id
	`, attemptID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func ListAttemptReviewQuestions(ctx context.Context, attemptID string) ([]AttemptReviewQuestionRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]AttemptReviewQuestionRow, 0)
	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			q.question_id,
			q.parent_id,
			q.content,
			q.image_url,
			COALESCE(q.options, '[]'::jsonb)::text::bytea AS options_raw,
			q.type,
			q.question_type,
			q.correct_answer,
			q.explanation,
			ad.selected_ans
		FROM exam_attempt a
		JOIN exam_section s
		  ON s.exam_id = a.exam_id
		JOIN question q
		  ON q.section_id = s.section_id
		 AND q.deleted_at IS NULL
		LEFT JOIN LATERAL (
			SELECT
				ad.selected_ans
			FROM attempt_section_log asl
			JOIN attempt_detail ad
			  ON ad.log_id = asl.log_id
			 AND ad.question_id = q.question_id
			WHERE asl.attempt_id = a.attempt_id
			  AND asl.section_id = s.section_id
			ORDER BY asl.started_at DESC NULLS LAST, asl.log_id DESC
			LIMIT 1
		) ad ON TRUE
		WHERE a.attempt_id = ?::uuid
		ORDER BY s.section_id, q.parent_id NULLS FIRST, q.question_id
	`, attemptID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	for i := range rows {
		if len(rows[i].OptionsRaw) == 0 {
			rows[i].Options = make([]AttemptQuestionOptionRow, 0)
			continue
		}

		if err := json.Unmarshal(rows[i].OptionsRaw, &rows[i].Options); err != nil {
			return nil, err
		}
		if rows[i].Options == nil {
			rows[i].Options = make([]AttemptQuestionOptionRow, 0)
		}
	}

	return rows, nil
}

func ListAttemptAnswers(ctx context.Context, attemptID string) ([]AttemptAnswerRow, error) {
	if _, err := uuid.Parse(attemptID); err != nil {
		return nil, nil
	}
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]AttemptAnswerRow, 0)
	err := config.DB.WithContext(ctx).Raw(`
		SELECT DISTINCT ON (ad.question_id)
			ad.question_id,
			ad.selected_ans
		FROM attempt_section_log asl
		JOIN attempt_detail ad
		  ON ad.log_id = asl.log_id
		WHERE asl.attempt_id = ?::uuid
		  AND COALESCE(TRIM(ad.selected_ans), '') <> ''
		ORDER BY
			ad.question_id,
			asl.started_at DESC NULLS LAST,
			asl.log_id DESC
	`, attemptID).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}
