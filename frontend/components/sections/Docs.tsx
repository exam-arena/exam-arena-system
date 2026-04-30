"use client";

import DocsCard from "@/components/document/DocsCard";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const docs = Array(4).fill({
    title: "TỔNG HỢP CÔNG THỨC TOÁN",
    subject: "Toán học",
    description: "Tài liệu sát với đề thi, đầy đủ chi tiết.",
    image: "/carddethi.png",
}).map((doc, index) => ({ ...doc, id: index + 1 }));

export default function DocsSection() {
    return (
        <section className="w-full bg-[#F6FBFF] py-9 md:py-[36px]">

            {/* Container*/}
            <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                {/* Title block */}
                <div className="flex flex-col items-center gap-1 mb-6 md:mb-[24px]">

                    <h2 className="text-xl sm:text-2xl md:text-[32px] font-bold text-[#004EDC] text-center leading-tight">
                        TÀI LIỆU THAM KHẢO
                    </h2>

                    <p className="text-sm md:text-base text-[#92B8FF] text-center">
                        Kho tàng tài liệu đầy đủ, sát với đề thi thật
                    </p>

                </div>

                {/* Grid wrapper */}
                <div className="max-w-[1248px] mx-auto">

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-y-6 md:gap-y-8 gap-x-8 md:gap-x-10">

                        {docs.map((doc, index) => (
                            <div key={doc.id} className={index >= 4 ? "hidden md:block" : ""}>
                                <DocsCard {...doc} />
                            </div>
                        ))}

                    </div>

                </div>

                {/* Button */}
                <div className="mt-8 md:mt-[36px] flex justify-center">
                    <Link href="/documents">
                        <Button className="rounded-full bg-[#FFE96F] text-[#004EDC] font-bold px-6 py-2 md:px-8 md:py-[22px] text-sm md:text-base hover:bg-[#FFD600]">
                            Xem tất cả
                        </Button>
                    </Link>
                </div>

            </div>
        </section>
    );
}