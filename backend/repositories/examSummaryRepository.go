package repositories

import (
	"backend/config"
	"context"
	"time"
)

type ExamSummaryRow struct {
	ExamID           string
	RoomID           string
	RoomName         string
	Title            string
	Type             string
	Capacity         int
	Duration         int
	StartTime        *time.Time
	TotalQuestions   int
	ParticipantCount int
}

type ExamListRow struct {
	ExamID         string
	RoomID         string
	Title          string
	Type           string
	Capacity       int
	Duration       int
	StartTime      *time.Time
	TotalQuestions int
	TotalCount     int64
}

func GetExamSummaryByID(ctx context.Context, examID string) (*ExamSummaryRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var row ExamSummaryRow

	err := config.DB.WithContext(ctx).Raw(`
		SELECT
			e.exam_id,
			e.room_id,
			r.name AS room_name,
			e.title,
			e.type,
			e.capacity,
			e.duration,
			e.start_time,
			COUNT(DISTINCT q.question_id) FILTER (
				WHERE q.parent_id IS NULL
				  AND q.deleted_at IS NULL
			) AS total_questions,
			COUNT(DISTINCT a.user_id) AS participant_count
		FROM exam e
		LEFT JOIN exam_room r ON r.room_id = e.room_id
		LEFT JOIN exam_section s ON s.exam_id = e.exam_id
		LEFT JOIN question q ON q.section_id = s.section_id
		LEFT JOIN exam_attempt a ON a.exam_id = e.exam_id
		WHERE e.exam_id = ?
		  AND e.deleted_at IS NULL
		GROUP BY e.exam_id, e.room_id, r.name, e.title, e.type, e.capacity, e.duration, e.start_time
	`, examID).Scan(&row).Error
	if err != nil {
		return nil, err
	}

	if row.ExamID == "" {
		return nil, nil
	}

	return &row, nil
}

func ListExamSummaries(ctx context.Context, page, limit int) ([]ExamListRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	offset := (page - 1) * limit
	rows := make([]ExamListRow, 0)

	err := config.DB.WithContext(ctx).Raw(`
		WITH filtered AS (
			SELECT
				e.exam_id,
				e.room_id,
				e.title,
				e.type,
				e.capacity,
				e.duration,
				e.start_time
			FROM exam e
			WHERE e.deleted_at IS NULL
		),
		paged AS (
			SELECT
				f.exam_id,
				f.room_id,
				f.title,
				f.type,
				f.capacity,
				f.duration,
				f.start_time,
				COUNT(*) OVER() AS total_count
			FROM filtered f
			ORDER BY f.start_time DESC NULLS LAST, f.exam_id DESC
			LIMIT ? OFFSET ?
		),
		question_counts AS (
			SELECT
				s.exam_id,
				COUNT(DISTINCT q.question_id) FILTER (
					WHERE q.parent_id IS NULL
					  AND q.deleted_at IS NULL
				) AS total_questions
			FROM exam_section s
			LEFT JOIN question q ON q.section_id = s.section_id
			WHERE s.exam_id IN (SELECT exam_id FROM paged)
			GROUP BY s.exam_id
		)
		SELECT
			p.exam_id,
			p.room_id,
			p.title,
			p.type,
			p.capacity,
			p.duration,
			p.start_time,
			COALESCE(qc.total_questions, 0) AS total_questions,
			p.total_count
		FROM paged p
		LEFT JOIN question_counts qc ON qc.exam_id = p.exam_id
		ORDER BY p.start_time DESC NULLS LAST, p.exam_id DESC
	`, limit, offset).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}

func CountExamSummaries(ctx context.Context) (int64, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	var total int64
	err := config.DB.WithContext(ctx).Raw(`
		SELECT COUNT(*)
		FROM exam e
		WHERE e.deleted_at IS NULL
	`).Scan(&total).Error
	if err != nil {
		return 0, err
	}

	return total, nil
}

func ListLatestExamSummaries(ctx context.Context, limit int) ([]ExamListRow, error) {
	if ctx == nil {
		ctx = context.Background()
	}

	rows := make([]ExamListRow, 0)

	err := config.DB.WithContext(ctx).Raw(`
		WITH latest AS (
			SELECT
				e.exam_id,
				e.room_id,
				e.title,
				e.type,
				e.capacity,
				e.duration,
				e.start_time
			FROM exam e
			WHERE e.deleted_at IS NULL
			ORDER BY e.start_time DESC NULLS LAST, e.exam_id DESC
			LIMIT ?
		),
		question_counts AS (
			SELECT
				s.exam_id,
				COUNT(DISTINCT q.question_id) FILTER (
					WHERE q.parent_id IS NULL
					  AND q.deleted_at IS NULL
				) AS total_questions
			FROM exam_section s
			LEFT JOIN question q ON q.section_id = s.section_id
			WHERE s.exam_id IN (SELECT exam_id FROM latest)
			GROUP BY s.exam_id
		)
		SELECT
			l.exam_id,
			l.room_id,
			l.title,
			l.type,
			l.capacity,
			l.duration,
			l.start_time,
			COALESCE(qc.total_questions, 0) AS total_questions,
			0 AS total_count
		FROM latest l
		LEFT JOIN question_counts qc ON qc.exam_id = l.exam_id
		ORDER BY l.start_time DESC NULLS LAST, l.exam_id DESC
	`, limit).Scan(&rows).Error
	if err != nil {
		return nil, err
	}

	return rows, nil
}
