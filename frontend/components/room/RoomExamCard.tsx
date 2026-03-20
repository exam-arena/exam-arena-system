import Link from "next/link";

type RoomExamCardProps = {
    id: string | number;
    title: string;
    subject: string;
    duration: string;
};

export default function RoomExamCard({ id, title, subject, duration }: RoomExamCardProps) {
    return (
        <div className="shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white overflow-hidden flex flex-col items-start p-4 lg:p-6 gap-6 border border-blue-50">
            <div className="w-full flex flex-col items-start gap-4 flex-grow">
                {/* Badges */}
                <div className="flex items-start gap-2">
                    <div className="rounded-full bg-[#EAF2FF] text-[#004EDC] text-xs font-semibold py-1 px-3">
                        {subject}
                    </div>
                    <div className="rounded-full bg-[#EAF2FF] text-[#004EDC] text-xs font-semibold py-1 px-3">
                        Đề thi thử
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
                    <span>Môn học: {subject}</span>
                    <div className="h-3 w-px bg-[#92B8FF] opacity-50 block" />
                    <span>Thời lượng: {duration}</span>
                </div>
            </div>

            {/* Action */}
            <div className="w-full mt-auto">
                <Link href={`/exams/${id}`} className="w-full flex justify-center items-center rounded-full bg-white border border-[#EAF2FF] hover:border-[#004EDC] hover:bg-[#F6FBFF] text-[#004EDC] font-bold py-2 px-4 transition-colors">
                    Làm bài
                </Link>
            </div>
        </div>
    );
}
