import React from "react";

interface ExamHeaderProps {
    sectionTitle: string;
    sectionDesc: string;
}

export function ExamHeader({ sectionTitle, sectionDesc }: ExamHeaderProps) {
    return (
        <div className="rounded-t-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)] px-6 py-4 flex flex-col gap-1.5">
            <div className="flex flex-col gap-1">
                <b className="text-mediumslateblue text-lg md:text-[1.5rem] leading-[2rem]">{sectionTitle}</b>
                <div className="text-cornflowerblue-100 text-sm md:text-base leading-[1.75rem]">{sectionDesc}</div>
            </div>
        </div>
    );
}
