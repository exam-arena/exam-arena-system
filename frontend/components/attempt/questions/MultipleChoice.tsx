import React from "react";
import { LatexText } from "@/components/shared/LatexText";

interface MultipleChoiceProps {
    options: { id: string; text: string }[];
    name?: string;
    value?: string;
    onChange?: (val: string) => void;
}

export function MultipleChoice({ options, name, value, onChange }: MultipleChoiceProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
            {options?.map((opt) => {
                const isChecked = value === opt.id;
                return (
                    <label
                        key={opt.id}
                        className={`rounded-num-30 py-3 px-5 cursor-pointer transition-all border flex items-center gap-2 min-h-[3rem] ${
                            isChecked
                                ? "bg-mediumslateblue text-white border-mediumslateblue"
                                : "bg-cornflowerblue-200 border-transparent hover:bg-mediumslateblue/10 text-mediumslateblue"
                        }`}
                    >
                        <input
                            type="radio"
                            name={name}
                            value={opt.id}
                            checked={isChecked}
                            onChange={() => onChange?.(opt.id)}
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
