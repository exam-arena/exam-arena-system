"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    resolveDialogMode,
    type ExamStartDialogMode,
} from "@/components/exam/StartExamDialog";

export type RoomExamCardProps = {
    exam_id: string;
    title: string;
    type?: string;
    duration: number;
    start_time?: string;
    has_completed?: boolean;
};

function getDialogCopy(mode: ExamStartDialogMode) {
    switch (mode) {
        case "not_started":
            return {
                title: "Chưa tới thời gian thi",
                description: "Bài thi chưa mở. Vui lòng quay lại khi đến giờ thi.",
            };
        case "ended":
            return {
                title: "Kết thúc thi",
                description:
                    "Thời gian làm bài đã kết thúc. Bạn không thể bắt đầu bài thi này nữa.",
            };
        case "completed":
            return {
                title: "Bạn đã hoàn thành bài thi",
                description:
                    "Bạn đã nộp bài thi này rồi. Mỗi học sinh chỉ được làm một lần đối với bài thi thử hoặc chính thức.",
            };
        default:
            return {
                title: "",
                description: "",
            };
    }
}

export default function RoomExamCard({
    exam_id,
    title,
    type = "practice",
    duration,
    start_time,
    has_completed = false,
}: RoomExamCardProps) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [dialogMode, setDialogMode] = useState<ExamStartDialogMode>("ready");

    const durationInMinutes = Math.floor(duration / 60);
    const typeLabel = type === "practice" ? "Luyện tập" : "Thi thật";
    const { title: dialogTitle, description } = getDialogCopy(dialogMode);

    const handleActionClick = () => {
        if (has_completed && type !== "practice") {
            setDialogMode("completed");
            setOpen(true);
            return;
        }

        const mode = resolveDialogMode(type, start_time, duration);

        if (mode === "ready") {
            router.push(`/exams/${exam_id}`);
            return;
        }

        setDialogMode(mode);
        setOpen(true);
    };

    return (
        <>
            <div className="shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white overflow-hidden flex flex-col items-start p-4 lg:p-6 gap-6 border border-blue-50">
                <div className="w-full flex flex-col items-start gap-4 grow">
                    <div className="flex items-start gap-2">
                        <div className="rounded-full bg-[#EAF2FF] text-[#004EDC] text-xs font-semibold py-1 px-3">
                            {typeLabel}
                        </div>
                    </div>

                    <div className="w-full flex justify-start text-left">
                        <b className="text-base sm:text-lg text-[#004EDC] leading-tight line-clamp-2 min-h-11">
                            {title}
                        </b>
                    </div>

                    <div className="flex items-center gap-2 text-xs sm:text-sm text-[#92B8FF] flex-wrap">
                        <span>Thời lượng: {durationInMinutes} phút</span>
                    </div>
                </div>

                <div className="w-full mt-auto">
                    <button
                        type="button"
                        onClick={handleActionClick}
                        className="w-full flex justify-center items-center rounded-full bg-white border border-[#EAF2FF] hover:border-[#004EDC] hover:bg-[#F6FBFF] text-[#004EDC] font-bold py-2 px-4 transition-colors"
                    >
                        Làm bài
                    </button>
                </div>
            </div>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-lg rounded-num-30 border-none bg-white p-8 text-center shadow-[0px_2px_8px_rgba(146,184,255,0.2)] outline-none sm:p-12">
                    <DialogHeader className="w-full flex flex-col items-center">
                        <DialogTitle className="text-[1.25rem] font-bold leading-6 text-[#004EDC] sm:text-2xl">
                            {dialogTitle}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="mt-2 flex flex-col items-center justify-center gap-1 text-[1rem] leading-6 text-[#004EDC] opacity-80">
                        <span>{description}</span>
                    </div>

                    <div className="mt-4 flex items-center justify-center">
                        <button
                            type="button"
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
