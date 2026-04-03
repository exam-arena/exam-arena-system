"use client";

import { ReactNode, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { startAttempt } from "@/lib/api/attempts/api";
import { ApiError } from "@/lib/api/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type ExamStartDialogMode = "ready" | "not_started" | "ended";

interface StartExamDialogProps {
  examId: string | number;
  examType: string;
  startTime?: string;
  durationSeconds: number;
  duration?: string;
  children: ReactNode;
}

function usesExamWindow(examType: string): boolean {
  const normalized = examType.trim().toLowerCase();
  return normalized === "mock_test" || normalized === "official";
}

function resolveDialogMode(
  examType: string,
  startTime: string | undefined,
  durationSeconds: number
): ExamStartDialogMode {
  if (!usesExamWindow(examType) || !startTime) {
    return "ready";
  }

  const startAtMs = new Date(startTime).getTime();
  if (Number.isNaN(startAtMs)) {
    return "ready";
  }

  const nowMs = Date.now();
  const endAtMs = startAtMs + Math.max(durationSeconds, 0) * 1000;

  if (nowMs < startAtMs) {
    return "not_started";
  }

  if (nowMs >= endAtMs) {
    return "ended";
  }

  return "ready";
}

export default function StartExamDialog({
  examId,
  examType,
  startTime,
  durationSeconds,
  duration = "90 ph\u00fat",
  children,
}: StartExamDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [dialogMode, setDialogMode] = useState<ExamStartDialogMode>("ready");

  const resolvedMode = useMemo(
    () => resolveDialogMode(examType, startTime, durationSeconds),
    [durationSeconds, examType, startTime]
  );

  const openDialog = () => {
    setDialogMode(resolvedMode);
    setOpen(true);
  };

  const handleStart = async () => {
    if (isStarting || dialogMode !== "ready") return;

    setIsStarting(true);
    try {
      const attempt = await startAttempt(String(examId));

      if (
        typeof document !== "undefined" &&
        document.documentElement.requestFullscreen
      ) {
        try {
          await document.documentElement.requestFullscreen();
        } catch {
          // Browser may reject fullscreen; keep the attempt flow alive.
        }
      }

      setOpen(false);
      router.replace(`/attempts/${attempt.attempt_id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EXAM_NOT_STARTED") {
          setDialogMode("not_started");
          return;
        }

        if (error.code === "EXAM_ENDED") {
          setDialogMode("ended");
          return;
        }
      }

      throw error;
    } finally {
      setIsStarting(false);
    }
  };

  const title =
    dialogMode === "not_started"
      ? "Chưa tới thời gian thi"
      : dialogMode === "ended"
        ? "Kết thúc thi"
        : "Thông báo bắt đầu bài thi";

  const description =
    dialogMode === "not_started"
      ? "Bài thi chưa mở. Vui lòng quay lại khi đến giờ thi."
      : dialogMode === "ended"
        ? "Thời gian làm bài đã kết thúc. Bạn không thể bắt đầu bài thi này nữa."
        : "Bài thi sẽ bắt đầu ngay sau khi bạn xác nhận.";

  return (
    <>
      <span className="contents" onClick={openDialog}>
        {children}
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg rounded-num-30 border-none bg-white p-8 text-center shadow-[0px_2px_8px_rgba(146,184,255,0.2)] outline-none sm:p-12">
          <DialogHeader className="w-full flex flex-col items-center">
            <DialogTitle className="text-[1.25rem] font-bold leading-6 text-[#004EDC] sm:text-2xl">
              {title}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-2 flex flex-col items-center justify-center gap-1 text-[1rem] leading-6 text-[#004EDC] opacity-80">
            <span>{description}</span>
            {dialogMode === "ready" ? (
              <>
                <span>Thời gian làm bài: {duration}.</span>
                <span>Hệ thống sẽ tự động nộp bài khi hết thời gian.</span>
                <i className="mt-2 font-bold">
                  Bài thi hiển thị dưới dạng toàn màn hình.
                </i>
              </>
            ) : null}
          </div>

          <div className="mt-4 flex items-center justify-center">
            {dialogMode === "ready" ? (
              <button
                onClick={handleStart}
                disabled={isStarting}
                className="rounded-num-30 bg-[#004EDC] px-6 py-2 text-white transition-colors hover:bg-blue-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:px-8 sm:py-3"
              >
                <b className="relative text-[1rem] leading-6">
                  {isStarting
                    ? "Đang vào bài thi..."
                    : "Bắt đầu làm bài thi"}
                </b>
              </button>
            ) : (
              <button
                onClick={() => setOpen(false)}
                className="rounded-num-30 bg-[#004EDC] px-6 py-2 text-white transition-colors hover:bg-blue-800 focus:outline-none sm:px-8 sm:py-3"
              >
                <b className="relative text-[1rem] leading-6">Quay lại</b>
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
