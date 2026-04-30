
import ExamCardGrid from "@/components/exam/ExamCardGrid";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getLatestExams } from '@/lib/api/exams/api';
import type { ExamRaw } from "@/lib/api/exams/types";

export default async function NewExam() {
    let exams: ExamRaw[] = [];
    try {
        exams = await getLatestExams();
    } catch {
        exams = [];
    }
    const displayExams = exams.slice(0, 8);

    return (
        <section className="w-full bg-[#F6FBFF] py-8 sm:py-9 md:py-9">
            <div className="max-w-360 mx-auto px-4 sm:px-6 md:px-12 lg:px-24">

                {/* Title block */}
                <div className="flex flex-col items-center gap-1 mb-5 sm:mb-6 md:mb-6">
                    <h2 className="text-xl sm:text-2xl md:text-[28px] lg:text-[32px] font-bold text-[#004EDC] text-center leading-tight">
                        ĐỀ ÔN LUYỆN MỚI NHẤT
                    </h2>

                    <p className="text-xs sm:text-sm md:text-base text-[#92B8FF] text-center">
                        Đầy đủ các chuyên đề trọng tâm ôn thi THPTQG
                    </p>
                </div>

                {/* Grid wrapper */}
                <div className="max-w-312 mx-auto">
                    <ExamCardGrid
                        exams={displayExams}
                        gridClassName="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 md:gap-6 lg:gap-8"
                        visibilityMode="latest"
                    />
                </div>

                {/* Button */}
                <div className="mt-5 sm:mt-6 md:mt-6 flex justify-center">
                    <Link href="/exams">
                        <Button className="rounded-full bg-[#FFE96F] text-[#004EDC] font-bold text-sm sm:text-base px-6 py-2 sm:px-8 sm:py-5.5 hover:bg-[#FFD600] transition-colors">
                            Xem tất cả
                        </Button>
                    </Link>
                </div>

            </div>
        </section>
    );
}
