"use client";

import React, { useRef } from "react";

interface ShortAnswerProps {
    name?: string;
    value?: string;
    onChange?: (val: string) => void;
    mode?: "exam" | "review";
    correctAnswer?: string;
}

export function ShortAnswer({ name, value = "", onChange, mode = "exam", correctAnswer }: ShortAnswerProps) {
    const chars = value.padEnd(4, "").slice(0, 4).split("");
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    const handleChange = (index: number, char: string) => {
        const newChars = [...chars];
        // Allow digits, comma, dot
        const filtered = char.replace(/[^0-9.,]/g, "");
        if (!filtered && char !== "") return;

        newChars[index] = filtered || "";

        // Build the value string (trim trailing empty)
        const newVal = newChars.join("").replace(/\s+$/g, "");
        onChange?.(newVal);

        // Auto-focus next box
        if (filtered && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Backspace" && !chars[index] && index > 0) {
            // Move back to previous box
            inputRefs.current[index - 1]?.focus();
            const newChars = [...chars];
            newChars[index - 1] = "";
            const newVal = newChars.join("").replace(/\s+$/g, "");
            onChange?.(newVal);
        }
    };

    return (
        <div className="flex flex-col gap-3 w-full">
            <b className="text-base leading-[1.75rem] text-mediumslateblue font-bold">Câu trả lời:</b>
            <div className="flex gap-0" role="group" aria-label={name}>
                {[0, 1, 2, 3].map((i) => {
                    let bgClass = `bg-white text-mediumslateblue focus:border-mediumslateblue focus:ring-mediumslateblue/30 ${chars[i] ? "font-bold" : ""
                        }`;
                    if (mode === "review") {
                        if (value === "") {
                            bgClass = "bg-slate-50 text-slate-500 border-slate-200 focus:ring-0";
                        } else if (value === correctAnswer) {
                            bgClass = "bg-green-100/90 text-green-700 border-green-500 font-bold";
                        } else {
                            bgClass = "bg-red-100/90 text-red-700 border-red-500 font-bold";
                        }
                    }

                    return (
                        <input
                            key={i}
                            ref={(el) => { inputRefs.current[i] = el; }}
                            type="text"
                            inputMode="decimal"
                            maxLength={1}
                            value={chars[i]?.trim() || ""}
                            onChange={(e) => mode !== "review" && handleChange(i, e.target.value)}
                            onKeyDown={(e) => mode !== "review" && handleKeyDown(i, e)}
                            disabled={mode === "review"}
                            className={`w-12 h-14 md:w-14 md:h-16 border border-cornflowerblue-100 text-center text-xl md:text-2xl outline-none focus:ring-2 focus:z-10 transition-all first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0 ${bgClass}`}
                        />
                    );
                })}
            </div>
        </div>
    );
}
