import Link from "next/link";

export type RoomExamCardProps = {
    exam_id: string;
    title: string;
    type?: string;
    duration: number;
};

export default function RoomExamCard({ exam_id, title, type = "practice", duration }: RoomExamCardProps) {
    const durationInMinutes = Math.floor(duration / 60);

    return (
        <div className="shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white overflow-hidden flex flex-col items-start p-4 lg:p-6 gap-6 border border-blue-50">
            <div className="w-full flex flex-col items-start gap-4 flex-grow">
                {/* Badges */}
                <div className="flex items-start gap-2">
                    <div className="rounded-full bg-[#EAF2FF] text-[#004EDC] text-xs font-semibold py-1 px-3">
                        {type === "practice" ? "Luyện tập" : "Thi thật"}
                    </div>
                </div>

                {/* Title */}
                <div className="w-full flex justify-start text-left">
                    <b className="text-base sm:text-lg text-[#004EDC] leading-tight line-clamp-2 min-h-[44px]">
                        {title}
                    </b>
                </div>

                {/* Meta */}
                <div className="flex items-center gap-2 text-xs sm:text-sm text-[#92B8FF] flex-wrap">
                    <span>Thời lượng: {durationInMinutes} phút</span>
                </div>
            </div>

            {/* Action */}
            <div className="w-full mt-auto">
                <Link href={`/exams/${exam_id}`} className="w-full flex justify-center items-center rounded-full bg-white border border-[#EAF2FF] hover:border-[#004EDC] hover:bg-[#F6FBFF] text-[#004EDC] font-bold py-2 px-4 transition-colors">
                    Làm bài
                </Link>
            </div>
        </div>
    );
}
