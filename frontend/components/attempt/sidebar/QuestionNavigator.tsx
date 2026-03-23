import React from "react";

interface QuestionNavigatorProps {
    total: number;
    answered: number[];
    bookmarked?: number[];
    currentIndex?: number;
    onSelect?: (index: number) => void;
}

export function QuestionNavigator({ total, answered, bookmarked = [], currentIndex = 0, onSelect, mode = "exam", results }: QuestionNavigatorProps & { mode?: "exam" | "review", results?: Record<number, boolean> }) {
    const items = Array.from({ length: total }, (_, i) => i + 1);
    return (
        <div className="grid grid-cols-5 gap-2">
            {items.map((num, i) => {
                const isAnswered = answered.includes(num);
                const isActive = currentIndex === i;
                const isFlagged = bookmarked.includes(num);

                let btnClass = "bg-cornflowerblue-200 border-cornflowerblue-200 border-solid text-mediumslateblue hover:bg-mediumslateblue/10 font-normal";
                if (mode === "review" && results && results[num] !== undefined) {
                    if (results[num] === false) {
                        btnClass = "bg-red-500 text-white font-bold border-red-500 ring-2 ring-red-500/50 ring-offset-1";
                    } else if (results[num] === true) {
                        btnClass = "bg-green-500 text-white font-bold border-green-500 ring-2 ring-green-500/50 ring-offset-1";
                    }
                } else if (isAnswered) {
                    btnClass = "bg-mediumslateblue text-white font-bold border-mediumslateblue";
                }

                if (isActive) {
                    if (mode === "review" && results && results[num] !== undefined) {
                        // Already handled ring above
                    } else {
                        btnClass = "border-mediumslateblue bg-mediumslateblue/10 text-mediumslateblue font-bold ring-2 ring-mediumslateblue/50 ring-offset-1";
                        if (isAnswered || (mode === "review" && results?.[num] === true)) {
                            btnClass = "bg-mediumslateblue text-white font-bold border-mediumslateblue ring-2 ring-mediumslateblue/50 ring-offset-1";
                        }
                    }
                }

                return (
                    <button
                        key={num}
                        onClick={() => onSelect?.(i)}
                        className={`relative w-[2.275rem] h-[2.275rem] border rounded-num-8 flex items-center justify-center p-2 box-border transition-all outline-none cursor-pointer text-base ${btnClass}`}
                    >
                        {num}
                        {/* Bookmark icon indicator */}
                        {isFlagged && (
                            <div className="absolute -top-2 -right-1 text-amber-500 drop-shadow-sm">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                                </svg>
                            </div>
                        )}
                    </button>
                );
            })}
        </div>
    );
}
