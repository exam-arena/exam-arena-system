import React from "react";

interface ExamHeaderProps {
    sectionTitle: string;
    sectionDesc: string;
    mode?: "exam" | "review";
}

export function ExamHeader({ sectionTitle, sectionDesc, mode = "exam" }: ExamHeaderProps) {
    return (
        <div className="rounded-t-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)] px-6 py-4 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                    <b className="text-mediumslateblue text-lg md:text-[1.5rem] leading-8">{sectionTitle}</b>
                    <div className="text-cornflowerblue-100 text-sm md:text-base leading-7">{sectionDesc}</div>
                </div>
                {mode === "review" && (
                    <div className="hidden md:flex bg-[#e8f0fe] text-mediumslateblue font-bold px-4 py-2 rounded-num-30">
                        Chế độ xem lại
                    </div>
                )}
            </div>
        </div>
    );
}
