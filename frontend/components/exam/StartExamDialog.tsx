"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { startAttempt } from "@/lib/api/attempts/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StartExamDialogProps {
  examId: string | number;
  duration?: string;
  children: ReactNode;
}

export default function StartExamDialog({
  examId,
  duration = "90 phút",
  children,
}: StartExamDialogProps) {
  const router = useRouter();
  const [isStarting, setIsStarting] = useState(false);

  const handleStart = async () => {
    if (isStarting) return;

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

      // Replace the exam detail entry so browser back does not bounce the user
      // out of an active attempt and back into the pre-start screen.
      router.replace(`/attempts/${attempt.attempt_id}`);
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-[30px] border-none bg-white p-8 text-center shadow-[0px_2px_8px_rgba(146,184,255,0.2)] outline-none sm:p-12">
        <DialogHeader className="w-full flex flex-col items-center">
          <DialogTitle className="text-[1.25rem] font-bold leading-[1.5rem] text-[#004EDC] sm:text-2xl">
            Thông báo bắt đầu bài thi
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center justify-center gap-1 text-[1rem] leading-[1.5rem] text-[#004EDC] opacity-80">
          <span>Bài thi sẽ bắt đầu ngay sau khi bạn xác nhận.</span>
          <span>Thời gian làm bài: {duration}.</span>
          <span>Hệ thống sẽ tự động nộp bài khi hết thời gian.</span>
          <i className="mt-2 font-bold">Bài thi hiển thị dưới dạng toàn màn hình.</i>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={handleStart}
            disabled={isStarting}
            className="rounded-[30px] bg-[#004EDC] px-6 py-2 text-white transition-colors hover:bg-blue-800 focus:outline-none disabled:cursor-not-allowed disabled:opacity-70 sm:px-8 sm:py-3"
          >
            <b className="relative text-[1rem] leading-[1.5rem]">
              {isStarting ? "Đang vào bài thi..." : "Bắt đầu làm bài"}
            </b>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
