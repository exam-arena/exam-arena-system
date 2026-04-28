"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ExamCard from "@/components/exam/ExamCard";
import { ApiError } from "@/lib/api/client";
import { getExamCompletion, type ExamCompletionMap } from "@/lib/api/exams/completion";
import type { ExamRaw } from "@/lib/api/exams/types";

type ExamCardGridProps = {
    exams: ExamRaw[];
    gridClassName: string;
    emptyMessage?: string;
    emptyClassName?: string;
    image?: string;
    visibilityMode?: "latest";
};

export default function ExamCardGrid({
    exams,
    gridClassName,
    emptyMessage,
    emptyClassName,
    image,
    visibilityMode,
}: ExamCardGridProps) {
    const [completion, setCompletion] = useState<ExamCompletionMap>({});

    const examIds = useMemo(() => exams.map((exam) => exam.exam_id), [exams]);
    const completionKey = useMemo(() => examIds.join(","), [examIds]);

    const fetchCompletion = useCallback(async () => {
        if (examIds.length === 0) {
            return {};
        }

        return getExamCompletion(examIds);
    }, [examIds]);

    useEffect(() => {
        let cancelled = false;

        fetchCompletion()
            .then((nextCompletion) => {
                if (!cancelled) {
                    setCompletion(nextCompletion);
                }
            })
            .catch((error) => {
                if (!cancelled && error instanceof ApiError && error.status === 401) {
                    setCompletion({});
                }
            });

        return () => {
            cancelled = true;
        };
    }, [completionKey, fetchCompletion]);

    useEffect(() => {
        const handleFocus = () => {
            fetchCompletion()
                .then(setCompletion)
                .catch((error) => {
                    if (error instanceof ApiError && error.status === 401) {
                        setCompletion({});
                    }
                });
        };

        window.addEventListener("focus", handleFocus);
        return () => window.removeEventListener("focus", handleFocus);
    }, [fetchCompletion]);

    if (exams.length === 0) {
        return (
            <div className={emptyClassName}>
                {emptyMessage || "Chưa có đề thi nào."}
            </div>
        );
    }

    return (
        <div className={gridClassName}>
            {exams.map((exam, index) => (
                <div
                    key={exam.exam_id}
                    className={
                        visibilityMode === "latest"
                            ? index >= 6
                                ? "hidden lg:block"
                                : index >= 4
                                    ? "hidden md:block"
                                    : ""
                            : ""
                    }
                >
                    <ExamCard
                        {...exam}
                        image={image}
                        hasCompleted={completion[exam.exam_id] === true}
                    />
                </div>
            ))}
        </div>
    );
}
