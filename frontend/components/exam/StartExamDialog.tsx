"use client";

import { ReactNode } from "react";
import { useRouter } from "next/navigation";
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
  children: ReactNode; // Đóng vai trò là Trigger (nút bấm)
}

export default function StartExamDialog({
  examId,
  duration = "90 phút",
  children,
}: StartExamDialogProps) {
  const router = useRouter();

  const handleStart = () => {
    // Chuyển hướng tới trang làm bài thi (hoặc chi tiết)
    router.push(`/exams/${examId}`);
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg rounded-[30px] border-none shadow-[0px_2px_8px_rgba(146,184,255,0.2)] p-8 sm:p-12 flex flex-col items-center text-center gap-4 sm:gap-6 bg-white outline-none">
        
        <DialogHeader className="w-full flex flex-col items-center">
          <DialogTitle className="text-[1.25rem] sm:text-2xl font-bold text-[#004EDC] leading-[1.5rem]">
            Thông báo bắt đầu bài thi
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center text-[1rem] leading-[1.5rem] text-[#004EDC] opacity-80 gap-1 mt-2">
          <span>Bài thi sẽ bắt đầu ngay sau khi bạn xác nhận.</span>
          <span>Thời gian làm bài: {duration}.</span>
          <span>Hệ thống sẽ tự động nộp bài khi hết thời gian.</span>
          <i className="font-bold mt-2">Bài thi hiển thị dưới dạng toàn màn hình.</i>
        </div>

        <div className="flex items-center justify-center mt-4">
          <button 
            onClick={handleStart}
            className="rounded-[30px] bg-[#004EDC] hover:bg-blue-800 transition-colors flex items-center justify-center py-2 sm:py-3 px-6 sm:px-8 text-white focus:outline-none"
          >
            <b className="relative leading-[1.5rem] text-[1rem]">Bắt đầu làm bài</b>
          </button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
