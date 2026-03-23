import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface ExplanationCardProps {
    correctAnswerText?: string;
    explanation?: string;
}

export function ExplanationCard({ correctAnswerText, explanation }: ExplanationCardProps) {
    if (!correctAnswerText && !explanation) return null;
    
    return (
        <div className="w-full w-full rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-start py-[1rem] px-[1.5rem] box-border gap-[0.625rem] mt-6 text-foreground">
            {correctAnswerText && (
                <b className="text-[1.25rem] leading-[2rem] text-mediumslateblue">Đáp án đúng: {correctAnswerText}</b>
            )}
            
            {explanation && (
                <>
                    <b className="text-mediumslateblue mt-2">Giải thích:</b>
                    <div className="leading-[1.75rem] text-slate-700 w-full">
                        <LatexText content={explanation} />
                    </div>
                </>
            )}
        </div>
    );
}
