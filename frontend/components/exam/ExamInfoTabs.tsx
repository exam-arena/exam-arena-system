"use client";

import { Clock, Users } from "lucide-react";
import StartExamDialog from "@/components/exam/StartExamDialog";

interface ExamInfoTabsProps {
    examId: string;
    examDuration: string;
}

export default function ExamInfoTabs({ examId, examDuration }: ExamInfoTabsProps) {
    return (
        <div className="w-full mt-2">
            <div className="flex flex-wrap items-center gap-3 w-full">
                <div className="rounded-[30px] border border-transparent bg-[#e7f0ff] text-[#0050e2] py-[0.5rem] px-[1.25rem] text-[1rem] leading-[1.75rem] font-bold flex items-center justify-center">
                    Thông tin đề thi
                </div>
                <div className="rounded-[30px] border border-[#92b8ff] bg-white text-[#92b8ff] py-[0.5rem] px-[1.25rem] text-[1rem] leading-[1.75rem] font-normal flex items-center justify-center cursor-not-allowed opacity-70">
                    Đáp án tham khảo
                </div>
                <div className="rounded-[30px] border border-[#92b8ff] bg-white text-[#92b8ff] py-[0.5rem] px-[1.25rem] text-[1rem] leading-[1.75rem] font-normal flex items-center justify-center cursor-not-allowed opacity-70">
                    Lịch sử làm bài
                </div>
            </div>

            <div className="mt-8 flex flex-col items-start gap-3 w-full text-[#004edc] text-base font-medium">
                <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    <div>Thời gian làm bài: {examDuration} | 22 câu hỏi</div>
                </div>
                <div className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    <div>610 người đã luyện tập đề thi này</div>
                </div>
            </div>

            <div className="self-stretch flex flex-col items-start text-left text-[#e1585a] mt-6 p-5 bg-red-50/50 rounded-2xl border border-red-100">
                <b className="font-bold block mb-1">Lưu ý:</b>
                <span className="leading-relaxed text-[15px]">
                    Trong quá trình làm bài, vui lòng không tải lại trang hoặc rời khỏi màn hình thi.<br />
                    Hệ thống có thể tự động nộp bài và ghi nhận kết quả hiện tại.
                </span>
            </div>

            <div className="flex flex-col items-start w-full sm:w-auto mt-8">
                <StartExamDialog examId={examId} duration={examDuration}>
                    <button className="w-full sm:w-auto rounded-full bg-[#0050e2] hover:bg-[#004edc] text-white transition-colors flex items-center justify-center py-3.5 px-10 font-bold shadow-md hover:shadow-lg text-lg">
                        Bắt đầu làm bài
                    </button>
                </StartExamDialog>
            </div>
        </div>
    );
}
