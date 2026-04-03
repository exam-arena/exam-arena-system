import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface ExplanationCardProps {
    correctAnswerText?: string;
    explanation?: string;
}

export function ExplanationCard({ correctAnswerText, explanation }: ExplanationCardProps) {
    if (!correctAnswerText && !explanation) return null;

    return (
        <div className="w-full rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-start py-4 px-6 box-border gap-2.5 mt-6 text-foreground">
            {correctAnswerText && (
                <b className="text-[1.25rem] leading-8 text-mediumslateblue">Đáp án đúng: {correctAnswerText}</b>
            )}

            {explanation && (
                <>
                    <b className="text-mediumslateblue mt-2">Giải thích:</b>
                    <div className="leading-7 text-slate-700 w-full">
                        <LatexText content={explanation} />
                    </div>
                </>
            )}
        </div>
    );
}
