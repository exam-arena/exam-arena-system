import React from "react";
import { QuestionNavigator } from "./QuestionNavigator";
import { UserInfo } from "./UserInfo";

interface SidebarProps {
    time?: string;
    totalQuestions?: number;
    answeredQuestions?: number[];
    bookmarkedQuestions?: number[];
    currentIndex?: number;
    onSelectQuestion?: (index: number) => void;
    onSubmit?: () => void;
    user?: {
        name: string;
        fullName: string;
        grade: string;
        target: string;
        avatarUrl?: string;
    };
}

export function Sidebar({
    time = "90:00",
    totalQuestions = 22,
    answeredQuestions = [],
    bookmarkedQuestions = [],
    currentIndex = 0,
    onSelectQuestion,
    onSubmit,
    user = {
        name: "User 1",
        fullName: "Hà Trọng Thắng",
        grade: "Lớp 12",
        target: "8.5/10",
    }
}: SidebarProps) {
    return (
        <div className="flex flex-col w-full gap-6">
            {/* User Info Card */}
            <div className="shadow-[0px_2px_8px_rgba(146,184,255,0.2)] rounded-num-30 bg-white p-6 flex flex-col items-center gap-6 overflow-hidden">
                <UserInfo {...user} />
            </div>

            {/* Timer + Navigator + Submit Card */}
            <div className="shadow-[0px_2px_8px_rgba(146,184,255,0.2)] rounded-num-30 bg-white p-6 flex flex-col items-center gap-6 overflow-hidden text-base">
                <div className="flex flex-col items-center gap-2">
                    <b className="text-xl text-mediumslateblue">Thời gian làm bài:</b>
                    <b className="text-2xl text-[#e1585a]">{time}</b>
                </div>
                <div className="w-full flex justify-center">
                    <QuestionNavigator
                        total={totalQuestions}
                        answered={answeredQuestions}
                        bookmarked={bookmarkedQuestions}
                        currentIndex={currentIndex}
                        onSelect={onSelectQuestion}
                    />
                </div>
                <button
                    onClick={onSubmit}
                    className="rounded-num-30 bg-mediumslateblue border-cornflowerblue-100 border border-solid overflow-hidden flex items-center justify-center py-2 px-5 hover:opacity-90 transition-colors w-full cursor-pointer text-white"
                >
                    <b className="leading-6">Nộp bài</b>
                </button>
            </div>
        </div>
    );
}
