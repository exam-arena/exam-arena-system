import React from "react";

interface BottomNavProps {
    currentIndex: number;
    totalQuestions: number;
    onPrev: () => void;
    onNext: () => void;
    onOpenMenu?: () => void;
}

export function BottomNav({ currentIndex, totalQuestions, onPrev, onNext, onOpenMenu }: BottomNavProps) {
    const isFirst = currentIndex === 0;
    const isLast = currentIndex === totalQuestions - 1;

    return (
        <div className="rounded-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)] py-1.5 px-6 flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2">
                <button
                    onClick={onOpenMenu}
                    className="lg:hidden flex items-center gap-2 rounded-num-30 bg-aliceblue border-none py-2 px-4 text-mediumslateblue leading-6 hover:bg-cornflowerblue-200 transition-all cursor-pointer font-bold"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" />
                    </svg>
                    Danh sách
                </button>
            </div>

            <div className="flex items-center gap-2.5">
                <button
                    disabled={isFirst}
                    onClick={onPrev}
                    className="rounded-num-30 bg-white border-cornflowerblue-100 border border-solid py-2 px-5 text-mediumslateblue leading-6 hover:bg-cornflowerblue-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                    Câu trước
                </button>
                <button
                    disabled={isLast}
                    onClick={onNext}
                    className="rounded-num-30 bg-mediumslateblue border-cornflowerblue-100 border border-solid py-2 px-5 text-white font-bold leading-6 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                    Câu sau
                </button>
            </div>
        </div>
    );
}
