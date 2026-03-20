"use client";

import React, { useMemo, useState } from "react";
import { ExamLayout } from "@/components/attempt/ExamLayout";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { ExamContent } from "@/components/attempt/content/ExamContent";
import { Section } from "@/components/attempt/content/Section";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";
import { LatexText } from "@/components/shared/LatexText";

import mockData from "../../../mock_exam_data.json";

interface GroupedQuestion {
    id: string;
    type: string;
    content: string;
    imageUrl: string | null;
    options: { id: string, text: string }[] | null;
    children?: {
        id: string;
        content: string;
        options: { id: string, text: string }[];
    }[];
    sTitle: string;
    sDesc: string;
    globalNum: number;
}

export default function AttemptPage() {
    const { title, duration_minutes, questions } = mockData.data;

    // Xử lý list câu hỏi JSON thành mảng tuần tự phục vụ làm bài từng câu
    const allQuestionsArray = useMemo(() => {
        const grouped: any[] = [];
        const childrenMap = new Map<string, any[]>();

        questions.forEach((q: any) => {
            if (q.parent_id) {
                if (!childrenMap.has(q.parent_id)) childrenMap.set(q.parent_id, []);
                childrenMap.get(q.parent_id)?.push(q);
            }
        });

        questions.forEach((q: any) => {
            if (!q.parent_id) {
                const cleanContent = q.content.replace(/^Phần\s+[I|V|X]+\.\s*/i, "");
                const item: any = { ...q, id: q.question_id, imageUrl: q.image_url, content: cleanContent };

                if (q.type === "cluster_context") {
                    item.children = (childrenMap.get(q.question_id) || []).map(child => ({
                        id: child.question_id,
                        content: child.content,
                        options: child.options || []
                    }));
                }
                grouped.push(item);
            }
        });

        const s1 = grouped.filter(q => q.type === "single_choice");
        const s2 = grouped.filter(q => q.type === "cluster_context");
        const s3 = grouped.filter(q => q.type === "short_answer");

        const flat = [
            ...s1.map(q => ({ ...q, sTitle: "Phần I: Câu trắc nghiệm nhiều phương án lựa chọn", sDesc: "Thí sinh trả lời các câu hỏi. Mỗi câu hỏi thí sinh chỉ chọn một phương án." })),
            ...s2.map(q => ({ ...q, sTitle: "Phần II: Câu trắc nghiệm Đúng - Sai", sDesc: "Trong mỗi ý a, b, c, d ở mỗi câu, thí sinh chọn đúng hoặc sai." })),
            ...s3.map(q => ({ ...q, sTitle: "Phần III: Câu trắc nghiệm trả lời ngắn", sDesc: "Thí sinh điền đáp án dạng số vào ô trống." }))
        ];

        return flat.map((q, i) => ({ ...q, globalNum: i + 1 })) as GroupedQuestion[];
    }, [questions]);

    // Quản lý trạng thái đang xem câu nào + đáp án User chọn
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});

    // Lọc ra id các câu đã làm để tô xanh ở Sidebar
    const answeredQuestions = useMemo(() => {
        return allQuestionsArray.filter(q => {
            if (q.type === "single_choice" || q.type === "short_answer") {
                return !!answers[q.id];
            }
            if (q.type === "cluster_context" && q.children) {
                // Nếu làm bất kỳ 1 ý a,b,c,d nào => Xem như block này đang làm dở (có thể tô màu hoặc tô half, ở đây cho tô luôn xanh)
                return q.children.some((child: any) => !!answers[child.id]);
            }
            return false;
        }).map(q => q.globalNum);
    }, [allQuestionsArray, answers]);

    const handleAnswer = (qid: string, val: string) => {
        setAnswers(prev => ({ ...prev, [qid]: val }));
    };

    const mockUser = {
        name: "User 1",
        fullName: "Hà Trọng Thắng",
        grade: "Lớp 12",
        target: "8.5/10"
    };

    const sidebar = (
        <Sidebar
            time={`${duration_minutes}:00`}
            totalQuestions={allQuestionsArray.length}
            answeredQuestions={answeredQuestions}
            currentIndex={currentIndex}
            onSelectQuestion={setCurrentIndex}
            onSubmit={() => alert(`Nộp bài với dữ liệu:\n${JSON.stringify(answers, null, 2)}`)}
            onExit={() => alert("Thoát làm bài!")}
            user={mockUser}
        />
    );

    const currentQ = allQuestionsArray[currentIndex];

    const content = (
        <ExamContent title={title}>
            {currentQ && (
                <Section title={currentQ.sTitle} description={currentQ.sDesc}>
                    <Question
                        key={currentQ.id}
                        number={currentQ.globalNum}
                        text={<LatexText content={currentQ.content} />}
                        imageUrl={currentQ.imageUrl}
                    >
                        {currentQ.type === "single_choice" && currentQ.options && (
                            <MultipleChoice
                                name={currentQ.id}
                                options={currentQ.options}
                                value={answers[currentQ.id]}
                                onChange={(val) => handleAnswer(currentQ.id, val)}
                            />
                        )}

                        {currentQ.type === "cluster_context" && currentQ.children && (
                            <TrueFalse
                                parentId={currentQ.id}
                                statements={currentQ.children}
                                answers={answers}
                                onChange={(childId, val) => handleAnswer(childId, val)}
                            />
                        )}

                        {currentQ.type === "short_answer" && (
                            <ShortAnswer
                                name={currentQ.id}
                                value={answers[currentQ.id] || ""}
                                onChange={(val) => handleAnswer(currentQ.id, val)}
                            />
                        )}
                    </Question>

                    {/* Nút chuyển câu Previous/Next */}
                    <div className="flex justify-between items-center mt-4 pt-10 border-t border-cornflowerblue-100/20 w-full mb-10">
                        <button
                            disabled={currentIndex === 0}
                            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
                            className="px-6 py-2.5 rounded-num-30 border-2 border-mediumslateblue text-mediumslateblue font-medium hover:bg-mediumslateblue/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                            ← Câu trước
                        </button>

                        <button
                            disabled={currentIndex === allQuestionsArray.length - 1}
                            onClick={() => setCurrentIndex(i => Math.min(allQuestionsArray.length - 1, i + 1))}
                            className="px-6 py-2.5 rounded-num-30 bg-mediumslateblue border-2 border-mediumslateblue text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                        >
                            Câu tiếp →
                        </button>
                    </div>
                </Section>
            )}
        </ExamContent>
    );

    return <ExamLayout sidebar={sidebar} content={content} />;
}
