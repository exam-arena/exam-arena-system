import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface MultipleChoiceProps {
    options: { id: string; text: string }[];
    name?: string;
    value?: string;
    onChange?: (val: string) => void;
    mode?: "exam" | "review";
    correctAnswer?: string;
}

export function MultipleChoice({ options, name, value, onChange, mode = "exam", correctAnswer }: MultipleChoiceProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {options?.map((opt) => {
                const isChecked = value === opt.id;
                const isCorrect = mode === "review" && opt.id === correctAnswer;
                const isWrongSelection = mode === "review" && isChecked && opt.id !== correctAnswer;
                
                let btnClass = "bg-cornflowerblue-200 border-transparent hover:bg-mediumslateblue/10 text-mediumslateblue";
                if (mode === "review") {
                    if (isChecked && isCorrect) btnClass = "bg-mediumslateblue text-white border-mediumslateblue"; 
                    else if (!isChecked && isCorrect) btnClass = "bg-green-100/90 border-green-500 text-green-700 font-bold"; 
                    else if (isWrongSelection) btnClass = "bg-red-100/90 border-red-500 text-red-700 font-bold"; 
                    else btnClass = "bg-slate-50 border-slate-200 text-slate-500"; 
                } else {
                    if (isChecked) btnClass = "bg-mediumslateblue text-white border-mediumslateblue";
                }

                return (
                    <label
                        key={opt.id}
                        className={`rounded-num-30 py-3 px-5 transition-all border flex items-center gap-2 min-h-[3rem] ${
                            mode === "review" ? "cursor-default" : "cursor-pointer"
                        } ${btnClass}`}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={opt.id}
                            checked={isChecked}
                            onChange={() => mode !== "review" && onChange?.(opt.id)}
                            disabled={mode === "review"}
                            className="hidden"
                        />
                        <b className="text-base leading-[1.75rem] whitespace-nowrap shrink-0">
                            {opt.id}.
                        </b>
                        <div className={`text-base leading-[1.75rem] break-words ${isChecked ? "font-bold" : "font-normal"}`}>
                            <LatexText content={opt.text} />
                        </div>
                    </label>
                );
            })}
        </div>
    );
}
