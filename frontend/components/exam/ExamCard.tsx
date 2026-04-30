import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type ExamCardProps = {
    exam_id: string;
    title: string;
    type?: string;
    duration: number;
    start_time?: string;
    hasCompleted?: boolean;
    showStatus?: boolean;
    image?: string;
};

function usesExamWindow(examType: string): boolean {
    const normalized = examType.trim().toLowerCase();
    return normalized === "mock_test" || normalized === "official";
}

function isExamEnded(
    examType: string,
    startTime: string | undefined,
    durationSeconds: number
) {
    if (!usesExamWindow(examType) || !startTime) {
        return false;
    }

    const startAtMs = new Date(startTime).getTime();
    if (Number.isNaN(startAtMs)) {
        return false;
    }

    const endAtMs = startAtMs + Math.max(durationSeconds, 0) * 1000;
    return Date.now() >= endAtMs;
}

export default function ExamCard({
    exam_id,
    title,
    type = "practice",
    duration,
    start_time,
    hasCompleted = false,
    showStatus = true,
    image = "/carddethi.png",
}: ExamCardProps) {
    const durationInMinutes = Math.floor(duration / 60);
    const hasExamWindow = showStatus && usesExamWindow(type);
    const isCompleted = hasExamWindow && hasCompleted;
    const isEnded = hasExamWindow && !isCompleted && isExamEnded(type, start_time, duration);
    const isActionDisabled = isCompleted || isEnded;
    const actionLabel = isCompleted
        ? "Đã hoàn thành"
        : isEnded
            ? "Đã kết thúc"
            : "Làm bài";

    return (
        <Card
            className="
                rounded-2xl sm:rounded-3xl overflow-hidden
                border-none shadow-md p-0 group h-full
                flex flex-col
                transition-shadow hover:shadow-lg
            "
        >
            {/* Image — aspect-ratio keeps proportion on all screens */}
            <div className="relative w-full aspect-4/3">
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Content */}
            <CardContent className="flex flex-1 flex-col px-3 py-3 sm:px-4 sm:py-4 md:p-5 bg-white text-center">
                <h3 className="min-h-10 text-sm sm:text-base font-bold text-[#004EDC] mb-1 sm:mb-2 line-clamp-2 leading-tight">
                    {title}
                </h3>

                <p className="min-h-4 text-[11px] sm:text-xs text-[#92B8FF] mb-2 sm:mb-3 whitespace-nowrap">
                    {type === "practice" ? "Luyện tập" : "Thi thật"} | Thời gian: {durationInMinutes} phút
                </p>

                <div className="mt-auto inline-flex justify-center">
                    {isActionDisabled ? (
                        <Button
                            variant="outline"
                            disabled
                            className="
                                h-8 min-w-[5.75rem]
                                rounded-full border-[#004EDC] text-[#004EDC]
                                text-xs sm:text-sm
                                px-3 sm:px-5
                                disabled:cursor-not-allowed disabled:border-[#EAF2FF]
                                disabled:text-[#92B8FF] disabled:opacity-100
                            "
                        >
                            {actionLabel}
                        </Button>
                    ) : (
                        <Link href={`/exams/${exam_id}`}>
                            <Button
                                variant="outline"
                                className="
                                    h-8 min-w-[5.75rem]
                                    rounded-full border-[#004EDC] text-[#004EDC]
                                    text-xs sm:text-sm
                                    px-3 sm:px-5
                                    hover:bg-[#004EDC] hover:text-white
                                    transition-colors
                                "
                            >
                                {actionLabel}
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
