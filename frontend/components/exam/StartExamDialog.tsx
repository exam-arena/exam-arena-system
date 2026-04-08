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

type ExamStartDialogMode = "not_started" | "ended" | "max_attempts";

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
): ExamStartDialogMode | null {
  if (!usesExamWindow(examType) || !startTime) {
    return null;
  }

  const startAtMs = new Date(startTime).getTime();
  if (Number.isNaN(startAtMs)) {
    return null;
  }

  const nowMs = Date.now();
  const endAtMs = startAtMs + Math.max(durationSeconds, 0) * 1000;

  if (nowMs < startAtMs) {
    return "not_started";
  }

  if (nowMs >= endAtMs) {
    return "ended";
  }

  return null;
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
  const [dialogMode, setDialogMode] = useState<ExamStartDialogMode | null>(null);

  const resolvedMode = useMemo(
    () => resolveDialogMode(examType, startTime, durationSeconds),
    [durationSeconds, examType, startTime]
  );

  const handleWrapperClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (isStarting) return;

    if (resolvedMode !== null) {
      setDialogMode(resolvedMode);
      setOpen(true);
      return;
    }

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
          // Browser may reject fullscreen
        }
      }

      router.replace(`/attempts/${attempt.attempt_id}`);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.code === "EXAM_NOT_STARTED") {
          setDialogMode("not_started");
          setOpen(true);
          return;
        }

        if (error.code === "EXAM_ENDED") {
          setDialogMode("ended");
          setOpen(true);
          return;
        }

        if (error.code === "MAX_ATTEMPTS_REACHED") {
          setDialogMode("max_attempts");
          setOpen(true);
          return;
        }
      }
      setIsStarting(false);
      throw error;
    }
  };

  const title =
    dialogMode === "not_started"
      ? "Chưa tới thời gian thi"
      : dialogMode === "ended"
        ? "Kết thúc thi"
        : dialogMode === "max_attempts"
          ? "Đã nộp bài"
          : "Thông báo bắt đầu bài thi";

  const description =
    dialogMode === "not_started"
      ? "Bài thi chưa mở. Vui lòng quay lại khi đến giờ thi."
      : dialogMode === "ended"
        ? "Thời gian làm bài đã kết thúc. Bạn không thể bắt đầu bài thi này nữa."
        : dialogMode === "max_attempts"
          ? "Bài thi này chỉ được phép làm 1 lần. Bạn đã nộp bài trước đó nên không thể làm lại."
          : "Bài thi sẽ bắt đầu ngay sau khi bạn xác nhận.";

  return (
    <>
      <span
        className={`contents ${isStarting ? "pointer-events-none opacity-70" : ""}`}
        onClick={handleWrapperClick}
      >
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
          </div>

          <div className="mt-6 flex items-center justify-center">
            <button
              onClick={() => setOpen(false)}
              className="rounded-num-30 bg-[#004EDC] px-6 py-2 text-white transition-colors hover:bg-blue-800 focus:outline-none sm:px-8 sm:py-3"
            >
              <b className="relative text-[1rem] leading-6">Quay lại</b>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
