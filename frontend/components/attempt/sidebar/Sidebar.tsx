import React from "react";
import { Timer } from "./Timer";
import { QuestionNavigator } from "./QuestionNavigator";
import { UserInfo } from "./UserInfo";

interface SidebarProps {
  time?: string;
  totalQuestions?: number;
  answeredQuestions?: number[];
  currentIndex?: number;
  onSelectQuestion?: (index: number) => void;
  onSubmit?: () => void;
  onExit?: () => void;
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
  currentIndex = 0,
  onSelectQuestion,
  onSubmit,
  onExit,
  user = {
    name: "User 1",
    fullName: "Hà Trọng Thắng",
    grade: "Lớp 12",
    target: "8.5/10",
  }
}: SidebarProps) {
  return (
    <div className="flex flex-col lg:w-[294px] w-full shrink-0 gap-6">
      {/* Top Card */}
      <div className="shadow-[0px_2px_8px_rgba(146,184,255,0.2)] rounded-num-30 bg-white p-6 flex flex-col items-center gap-6 overflow-hidden">
        <div className="w-full flex-col flex items-start">
          <Timer time={time} />
        </div>
        <div className="w-full flex justify-center">
          <QuestionNavigator 
            total={totalQuestions} 
            answered={answeredQuestions} 
            currentIndex={currentIndex}
            onSelect={onSelectQuestion}
          />
        </div>
        <button 
          onClick={onSubmit}
          className="rounded-num-30 bg-white border-cornflowerblue-100 border border-solid overflow-hidden flex items-center justify-center py-2 px-5 hover:bg-cornflowerblue-200 transition-colors w-full cursor-pointer text-mediumslateblue"
        >
          <span className="leading-6 font-medium">Nộp bài</span>
        </button>
      </div>

      {/* Bottom Card */}
      <div className="shadow-[0px_2px_8px_rgba(146,184,255,0.2)] rounded-num-30 bg-white p-6 flex flex-col items-center gap-6 overflow-hidden">
        <UserInfo {...user} />
        <button 
          onClick={onExit}
          className="rounded-num-30 bg-white border-cornflowerblue-100 border border-solid overflow-hidden flex items-center justify-center py-2 px-5 hover:bg-cornflowerblue-200 transition-colors w-full cursor-pointer text-mediumslateblue"
        >
          <span className="leading-6">Thoát bài thi</span>
        </button>
      </div>
    </div>
  );
}
