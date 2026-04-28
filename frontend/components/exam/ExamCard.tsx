import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export type ExamCardProps = {
    exam_id: string;
    title: string;
    type?: string;
    duration: number;
    image?: string;
};

export default function ExamCard({
    exam_id,
    title,
    type = "practice",
    duration,
    image = "/carddethi.png",
}: ExamCardProps) {
    const durationInMinutes = Math.floor(duration / 60);

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

                <Link href={`/exams/${exam_id}`} className="mt-auto inline-flex justify-center">
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
                        Làm bài
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}
