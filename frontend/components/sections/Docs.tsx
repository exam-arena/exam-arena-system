"use client";

import ExamCard from "@/components/exam/ExamCard";
import { Button } from "@/components/ui/button";

const exams = Array(4).fill({
    title: "ĐỀ ÔN LUYỆN SỐ 1",
    subject: "Toán học",
    duration: "90 phút",
    image: "/carddethi.png",
});

export default function NewExam() {
    return (
        <section className="w-full bg-[#F6FBFF] py-9 md:py-[36px]">

            {/* Container*/}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                {/* Title block */}
                <div className="flex flex-col items-center gap-1 mb-6 md:mb-[24px]">

                    <h2 className="text-xl sm:text-2xl md:text-[32px] font-bold text-[#004EDC] text-center leading-tight">
                        ĐỀ ÔN LUYỆN MỚI NHẤT
                    </h2>

                    <p className="text-sm md:text-base text-[#92B8FF] text-center">
                        Đầy đủ các chuyên đề trọng tâm ôn thi THPTQG
                    </p>

                </div>

                {/* Grid wrapper */}
                <div className="max-w-[1248px] mx-auto">

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-8 gap-x-8 md:gap-x-10">

                        {exams.map((exam, index) => (
                            <div key={index} className={index >= 4 ? "hidden md:block" : ""}>
                                <ExamCard {...exam} />
                            </div>
                        ))}

                    </div>

                </div>

                {/* Button */}
                <div className="mt-6 md:mt-[24px] flex justify-center">

                    <Button className="rounded-full bg-[#FFE96F] text-[#004EDC] font-bold px-4 py-2 text-sm md:text-base hover:bg-[#FFD600]">
                        Xem tất cả
                    </Button>

                </div>

            </div>
        </section>
    );
}