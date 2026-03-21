"use client";

import React, { useRef } from "react";

interface ShortAnswerProps {
    name?: string;
    value?: string;
    onChange?: (val: string) => void;
}

export function ShortAnswer({ name, value = "", onChange }: ShortAnswerProps) {
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
                {[0, 1, 2, 3].map((i) => (
                    <input
                        key={i}
                        ref={(el) => { inputRefs.current[i] = el; }}
                        type="text"
                        inputMode="decimal"
                        maxLength={1}
                        value={chars[i]?.trim() || ""}
                        onChange={(e) => handleChange(i, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(i, e)}
                        className="w-12 h-14 md:w-14 md:h-16 border border-cornflowerblue-100 text-center text-xl md:text-2xl font-bold text-mediumslateblue outline-none focus:border-mediumslateblue focus:ring-2 focus:ring-mediumslateblue/30 focus:z-10 transition-all bg-white first:rounded-l-lg last:rounded-r-lg -ml-px first:ml-0"
                    />
                ))}
            </div>
        </div>
    );
}
