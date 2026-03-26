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
import { ExplanationCard } from "@/components/attempt/content/ExplanationCard";
import { useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import data from "@/data.json";

// Hàm mock trả về dữ liệu bài thi (Sau này thay bằng fetch API /api/attempts/:id)
async function fetchAttemptData(attemptId: string) {
    const attempt = data.exam_attempts.find(a => a.attempt_id === attemptId) || data.exam_attempts[0];
    const exam = data.exams.find(e => e.exam_id === attempt?.exam_id) || data.exams[0];
    const user = data.users.find(u => u.user_id === attempt?.user_id) || data.users[0];

    // Gộp tất cả question từ các section lại do Layout cũ đang dùng mảng phẳng
    const questions = exam.sections.reduce((acc, sec) => acc.concat(sec.questions), [] as any[]);

    return {
        title: exam.title,
        duration_minutes: Math.floor(exam.duration / 60),
        questions,
        user: {
            name: user.username,
            fullName: user.fullname,
            email: user.email,
            role: user.role
        }
    };
}

interface GroupedQuestion {
    id: string;
    type: string;
    content: string;
    imageUrl: string | null;
    options: { id: string; text: string }[] | null;
    correct_answer?: string;
    explanation?: string;
    children?: {
        id: string;
        content: string;
        options: { id: string; text: string }[];
        correct_answer?: string;
    }[];
    sTitle: string;
    sDesc: string;
    globalNum: number;
}

export default function AttemptPage() {
    const params = useParams();
    const id = params?.id as string;

    const [examData, setExamData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        fetchAttemptData(id).then(res => {
            setExamData(res);
            setIsLoading(false);
        });
    }, [id]);

    const { title, duration_minutes, questions } = examData || {};

    const allQuestionsArray = useMemo(() => {
        if (!questions) return [];
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
                        options: child.options || [],
                        correct_answer: child.correct_answer
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
    const router = useRouter();
    const [mode, setMode] = useState<"exam" | "review">("exam");

    const results = useMemo(() => {
        if (mode !== "review") return undefined;
        const res: Record<number, boolean> = {};
        allQuestionsArray.forEach(q => {
            if (q.type === "single_choice" || q.type === "short_answer") {
                res[q.globalNum] = answers[q.id] === q.correct_answer;
            } else if (q.type === "cluster_context" && q.children) {
                let isAllCorrect = true;
                q.children.forEach((child: any) => {
                    if (answers[child.id] !== child.correct_answer) {
                        isAllCorrect = false;
                    }
                });
                res[q.globalNum] = isAllCorrect;
            }
        });
        return res;
    }, [mode, allQuestionsArray, answers]);

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

    const { user: mockUser } = examData || {};

    if (isLoading || !examData) {
        return <div className="min-h-screen w-full flex items-center justify-center font-medium text-[#004edc]">Đang tải dữ liệu bài thi...</div>;
    }

    const currentQ = allQuestionsArray[currentIndex];

    const header = (
        <ExamHeader
            sectionTitle={currentQ?.sTitle || ""}
            sectionDesc={currentQ?.sDesc || ""}
            mode={mode}
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
            onSubmit={() => {
                router.push(`/attempts/${id}/result`);
            }}
            user={mockUser}
            mode={mode}
            results={results}
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
                        mode={mode}
                        correctAnswer={currentQ.correct_answer}
                    />
                )}

                {currentQ.type === "cluster_context" && currentQ.children && (
                    <TrueFalse
                        parentId={currentQ.id}
                        statements={currentQ.children}
                        answers={answers}
                        onChange={(childId, val) => handleAnswer(childId, val)}
                        mode={mode}
                        correctAnswers={currentQ.children.reduce((acc: any, child: any) => {
                            acc[child.id] = child.correct_answer;
                            return acc;
                        }, {})}
                    />
                )}

                {currentQ.type === "short_answer" && (
                    <ShortAnswer
                        name={currentQ.id}
                        value={answers[currentQ.id] || ""}
                        onChange={(val) => handleAnswer(currentQ.id, val)}
                        mode={mode}
                        correctAnswer={currentQ.correct_answer}
                    />
                )}

                {mode === "review" && (
                    <ExplanationCard 
                        correctAnswerText={currentQ.correct_answer}
                        explanation={currentQ.explanation || "Lời giải chi tiết cho câu hỏi này chưa có sẵn."}
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
