"use client";

import React, { useMemo, useState } from "react";
import { ExamLayout } from "@/components/attempt/ExamLayout";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { ExamHeader } from "@/components/attempt/content/ExamHeader";
import { BottomNav } from "@/components/attempt/content/BottomNav";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";
import { LatexText } from "@/components/shared/LatexText";
import { useEffect } from "react";

import mockData from "../../../mock_exam_data.json";

interface GroupedQuestion {
    id: string;
    type: string;
    content: string;
    imageUrl: string | null;
    options: { id: string; text: string }[] | null;
    children?: {
        id: string;
        content: string;
        options: { id: string; text: string }[];
    }[];
    sTitle: string;
    sDesc: string;
    globalNum: number;
}

export default function AttemptPage() {
    const { title, duration_minutes, questions } = mockData.data;

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

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, string>>({});
    const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());

    useEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        const prevHtmlOverflow = html.style.overflow;
        const prevBodyOverflow = body.style.overflow;

        html.style.setProperty("overflow", "hidden", "important");
        body.style.setProperty("overflow", "hidden", "important");

        return () => {
            html.style.overflow = prevHtmlOverflow;
            body.style.overflow = prevBodyOverflow;
        };
    }, []);

    const answeredQuestions = useMemo(() => {
        return allQuestionsArray.filter(q => {
            if (q.type === "single_choice" || q.type === "short_answer") return !!answers[q.id];
            if (q.type === "cluster_context" && q.children) {
                return q.children.some((child: any) => !!answers[child.id]);
            }
            return false;
        }).map(q => q.globalNum);
    }, [allQuestionsArray, answers]);

    const handleAnswer = (qid: string, val: string) => {
        setAnswers(prev => ({ ...prev, [qid]: val }));
    };

    const toggleBookmark = (num: number) => {
        setBookmarks(prev => {
            const next = new Set(prev);
            if (next.has(num)) next.delete(num);
            else next.add(num);
            return next;
        });
    };

    const bookmarkedQuestions = useMemo(() => Array.from(bookmarks), [bookmarks]);

    const mockUser = {
        name: "User 1",
        fullName: "Hà Trọng Thắng",
        grade: "Lớp 12",
        target: "8.5/10"
    };

    const currentQ = allQuestionsArray[currentIndex];

    const header = (
        <ExamHeader
            sectionTitle={currentQ?.sTitle || ""}
            sectionDesc={currentQ?.sDesc || ""}
        />
    );

    const sidebar = (
        <Sidebar
            time={`${duration_minutes}:00`}
            totalQuestions={allQuestionsArray.length}
            answeredQuestions={answeredQuestions}
            bookmarkedQuestions={bookmarkedQuestions}
            currentIndex={currentIndex}
            onSelectQuestion={setCurrentIndex}
            onSubmit={() => alert(`Nộp bài với dữ liệu:\n${JSON.stringify(answers, null, 2)}`)}
            user={mockUser}
        />
    );

    const bottomBar = (
        <BottomNav
            currentIndex={currentIndex}
            totalQuestions={allQuestionsArray.length}
            onPrev={() => setCurrentIndex(i => Math.max(0, i - 1))}
            onNext={() => setCurrentIndex(i => Math.min(allQuestionsArray.length - 1, i + 1))}
        />
    );

    const content = currentQ ? (
        <div className="flex flex-col gap-6">
            <Question
                key={currentQ.id}
                number={currentQ.globalNum}
                text={<LatexText content={currentQ.content} />}
                imageUrl={currentQ.imageUrl}
                isBookmarked={bookmarks.has(currentQ.globalNum)}
                onToggleBookmark={() => toggleBookmark(currentQ.globalNum)}
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
            {/* Bottom spacer to prevent content being too close to the edge */}
            <div className="h-6" />
        </div>
    ) : null;

    return (
        <ExamLayout
            header={header}
            content={content}
            sidebar={sidebar}
            bottomBar={bottomBar}
        />
    );
}
