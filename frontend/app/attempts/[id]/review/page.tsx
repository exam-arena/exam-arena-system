"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";
import { ExplanationCard } from "@/components/attempt/content/ExplanationCard";
import { LatexText } from "@/components/shared/LatexText";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import data from "@/data.json";
import mockAttemptData from "../../../../mock_attempt_data.json"; // Tạm keep fallback này nếu data.json trống answers

// Hàm mock trả về dữ liệu review (Sau này thay bằng fetch API /api/attempts/:id/review)
async function fetchReviewData(attemptId: string) {
    const attempt = data.exam_attempts.find(a => a.attempt_id === attemptId) || data.exam_attempts[0];
    const exam = data.exams.find(e => e.exam_id === attempt?.exam_id) || data.exams[0];
    const user = data.users.find(u => u.user_id === attempt?.user_id) || data.users[0];

    const questions = exam.sections.reduce((acc, sec) => acc.concat(sec.questions), [] as any[]);

    // Tạm thời lấy user_answers từ attempt_logs nếu có
    let user_answers: Record<string, string> = {};
    if (attempt && attempt.section_logs) {
        attempt.section_logs.forEach((log: any) => {
            log.details.forEach((d: any) => {
                user_answers[d.question_id] = d.selected_ans;
            });
        });
    } else {
        user_answers = mockAttemptData.data.user_answers;
    }

    return {
        title: exam.title,
        questions,
        user_answers,
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

export default function ReviewPage() {
    const params = useParams();
    const id = params?.id as string;

    const [reviewData, setReviewData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!id) return;
        setIsLoading(true);
        fetchReviewData(id).then(res => {
            setReviewData(res);
            setIsLoading(false);
        });
    }, [id]);

    const { title, questions, user_answers, user: mockUser } = reviewData || {};

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
            ...s1.map(q => ({ ...q, sTitle: "Phần 1: Câu trắc nghiệm nhiều phương án lựa chọn", sDesc: "Thí sinh trả lời từ câu 1 đến câu 12, mỗi câu chỉ chọn 1 phương án." })),
            ...s2.map(q => ({ ...q, sTitle: "Phần 2: Câu trắc nghiệm Đúng - Sai", sDesc: "Thí sinh trả lời từ câu 1 đến 4, trong các đáp án a - d, chọn đúng - sai." })),
            ...s3.map(q => ({ ...q, sTitle: "Phần 3: Câu trắc nghiệm trả lời ngắn", sDesc: "Thí sinh trả lời từ câu 1 đến câu 6." }))
        ];

        return flat.map((q, i) => ({ ...q, globalNum: i + 1 })) as GroupedQuestion[];
    }, [questions]);

    const resultsMap = useMemo(() => {
        const res: Record<number, boolean> = {};
        allQuestionsArray.forEach(q => {
            if (q.type === "single_choice" || q.type === "short_answer") {
                const ans = user_answers[q.id as keyof typeof user_answers] as string | undefined;
                if (ans !== undefined && ans !== null && ans.trim() !== "") {
                    res[q.globalNum] = ans === q.correct_answer;
                }
            } else if (q.type === "cluster_context" && q.children) {
                let isAllCorrect = true;
                let hasAnyAnswer = false;
                q.children.forEach((child: any) => {
                    const ans = user_answers[child.id as keyof typeof user_answers] as string | undefined;
                    if (ans !== undefined && ans !== null && ans.trim() !== "") {
                        hasAnyAnswer = true;
                    }
                    if (ans !== child.correct_answer) {
                        isAllCorrect = false;
                    }
                });
                if (hasAnyAnswer) {
                    res[q.globalNum] = isAllCorrect;
                }
            }
        });
        return res;
    }, [allQuestionsArray, user_answers]);

    // Grouping by section for rendering
    const sections = [
        { title: "Phần 1: Câu trắc nghiệm nhiều phương án lựa chọn", questions: allQuestionsArray.filter(q => q.type === "single_choice"), desc: "Thí sinh trả lời từ câu 1 đến câu 12, mỗi câu chỉ chọn 1 phương án." },
        { title: "Phần 2: Câu trắc nghiệm Đúng - Sai", questions: allQuestionsArray.filter(q => q.type === "cluster_context"), desc: "Thí sinh trả lời từ câu 1 đến 4, trong các đáp án a - d, chọn đúng - sai." },
        { title: "Phần 3: Câu trắc nghiệm trả lời ngắn", questions: allQuestionsArray.filter(q => q.type === "short_answer"), desc: "Thí sinh trả lời từ câu 1 đến câu 6." }
    ];

    if (isLoading || !reviewData) {
        return <div className="min-h-screen w-full flex items-center justify-center font-medium text-[#004edc]">Đang tải kết quả bài thi...</div>;
    }

    return (
        <div className="w-full relative bg-aliceblue flex flex-col items-start font-roboto min-h-screen">
            {/* Header */}
            <div className="w-full sticky top-0 z-50 shadow-md">
                <Header isLoggedIn={true} user={mockUser} />
            </div>

            {/* Main Content - Full width layout similar to ExamLayout */}
            <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_294px] gap-x-6 px-4 md:px-12 lg:px-24 py-8 lg:py-10 box-border font-sans items-start">

                {/* LEFT COLUMN: Questions List */}
                <div className="flex flex-col lg:col-[1] row-[1] w-full rounded-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)] mb-10 pb-6">
                    <div className="p-6 md:p-8 flex flex-col gap-[3rem]">
                        <div className="w-full flex items-center justify-between pb-4 border-b border-aliceblue">
                            <b className="relative leading-[1.5rem] text-2xl text-mediumslateblue">{title} - Kết quả bài thi</b>
                        </div>

                        {sections.map((section, idx) => {
                            if (section.questions.length === 0) return null;
                            return (
                                <div key={idx} className="w-full flex flex-col items-start gap-[1.5rem]">
                                    <div className="flex flex-col items-start gap-[0.25rem]">
                                        <b className="relative leading-[2rem] text-mediumslateblue text-2xl">{section.title}</b>
                                        <div className="relative text-[1rem] leading-[1.75rem] text-cornflowerblue-100">{section.desc}</div>
                                    </div>

                                    <div className="w-full flex flex-col items-start gap-[3rem] text-[1rem]">
                                        {section.questions.map((currentQ) => (
                                            <div key={currentQ.id} className="w-full border-b border-aliceblue pb-8 last:border-0 relative">
                                                {/* Anchor point to scroll to if needed */}
                                                <div id={`question-${currentQ.globalNum}`} className="absolute -top-[100px]" />

                                                <Question
                                                    number={currentQ.globalNum}
                                                    text={<LatexText content={currentQ.content} />}
                                                    imageUrl={currentQ.imageUrl}
                                                    isBookmarked={false} // don't show bookmark in review
                                                >
                                                    <div className="mt-4">
                                                        {currentQ.type === "single_choice" && currentQ.options && (
                                                            <MultipleChoice
                                                                name={currentQ.id}
                                                                options={currentQ.options}
                                                                value={user_answers[currentQ.id as keyof typeof user_answers] as string}
                                                                mode="review"
                                                                correctAnswer={currentQ.correct_answer}
                                                            />
                                                        )}

                                                        {currentQ.type === "cluster_context" && currentQ.children && (
                                                            <TrueFalse
                                                                parentId={currentQ.id}
                                                                statements={currentQ.children}
                                                                answers={user_answers as Record<string, string>}
                                                                mode="review"
                                                                correctAnswers={currentQ.children.reduce((acc: any, child: any) => {
                                                                    acc[child.id] = child.correct_answer;
                                                                    return acc;
                                                                }, {})}
                                                            />
                                                        )}

                                                        {currentQ.type === "short_answer" && (
                                                            <ShortAnswer
                                                                name={currentQ.id}
                                                                value={user_answers[currentQ.id as keyof typeof user_answers] as string || ""}
                                                                mode="review"
                                                                correctAnswer={currentQ.correct_answer}
                                                            />
                                                        )}

                                                        <ExplanationCard
                                                            correctAnswerText={currentQ.correct_answer}
                                                            explanation={currentQ.explanation || "Chưa có lời giải chi tiết cho câu hỏi này."}
                                                        />
                                                    </div>
                                                </Question>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* RIGHT COLUMN: Sidebar with Navigation & Results */}
                <aside className="hidden lg:flex flex-col gap-6 col-[2] row-[1] sticky top-[7rem]">
                    <Sidebar
                        time="--:--"
                        totalQuestions={allQuestionsArray.length}
                        answeredQuestions={[]}
                        bookmarkedQuestions={[]}
                        currentIndex={-1}
                        onSelectQuestion={(idx) => {
                            const el = document.getElementById(`question-${idx + 1}`);
                            // Account for header + padding
                            if (el) {
                                const y = el.getBoundingClientRect().top + window.scrollY - 150;
                                window.scrollTo({ top: y, behavior: 'smooth' });
                            }
                        }}
                        onSubmit={() => {
                            window.location.href = `/attempts/${id}/result`;
                        }}
                        user={mockUser}
                        mode="review"
                        results={resultsMap}
                    />
                </aside>

            </div>

            <Footer />
        </div>
    );
}
