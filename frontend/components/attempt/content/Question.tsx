import React from "react";

interface QuestionProps {
    number?: string | number;
    text: React.ReactNode;
    imageUrl?: string | null;
    isBookmarked?: boolean;
    onToggleBookmark?: () => void;
    statusBadge?: React.ReactNode;
    children?: React.ReactNode;
}

export function Question({ number, text, imageUrl, isBookmarked, onToggleBookmark, statusBadge, children }: QuestionProps) {
    return (
        <div className="flex flex-col gap-6 w-full text-foreground">
            <div className="flex flex-col w-full">
                {/* Question number + bookmark */}
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                    {number && <b className="text-lg leading-7 text-mediumslateblue">Câu {number}:</b>}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        {statusBadge}
                        <button
                            onClick={onToggleBookmark}
                            className={`flex shrink-0 items-center gap-1.5 px-3 py-1 rounded-num-30 border text-sm transition-all cursor-pointer ${
                                isBookmarked
                                    ? "bg-amber-50 border-amber-400 text-amber-600"
                                    : "bg-white border-cornflowerblue-100 text-cornflowerblue-100 hover:border-amber-400 hover:text-amber-500"
                            }`}
                            title={isBookmarked ? "Bỏ đánh dấu" : "Đánh dấu xem lại"}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={isBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                            </svg>
                            {isBookmarked ? "Đã đánh dấu" : "Đánh dấu"}
                        </button>
                    </div>
                </div>

                <div className="text-[1.125rem] leading-8 flex flex-col items-start gap-4">
                    <div className="w-full">{text}</div>

                    {imageUrl && (
                        <div className="w-full max-w-2xl mt-2 rounded-lg overflow-hidden border border-cornflowerblue-100/30">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={imageUrl}
                                alt="Hình minh họa"
                                className="w-full h-auto object-contain"
                            />
                        </div>
                    )}
                </div>
            </div>
            {children && (
                <div className="w-full text-base">
                    {children}
                </div>
            )}
        </div>
    );
}
