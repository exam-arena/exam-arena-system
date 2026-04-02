"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";
import { ExplanationCard } from "@/components/attempt/content/ExplanationCard";
import { LatexText } from "@/components/shared/LatexText";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { getAttemptReview } from "@/lib/api/attempts/api";
import type { AttemptQuestion, AttemptReviewData } from "@/lib/api/attempts/types";

interface GroupedQuestionChild {
    id: string;
    content: string;
    options: { id: string; text: string }[];
    correct_answer?: string;
}

interface GroupedQuestion {
    id: string;
    type: string;
    content: string;
    imageUrl: string | null;
    options: { id: string; text: string }[] | null;
    correct_answer?: string;
    explanation?: string;
    children?: GroupedQuestionChild[];
    sTitle: string;
    sDesc: string;
    globalNum: number;
}

const SECTION_1_TITLE = "Phần I: Câu trắc nghiệm nhiều phương án lựa chọn";
const SECTION_1_DESC = "Thí sinh trả lời các câu hỏi. Mỗi câu hỏi thí sinh chỉ chọn một phương án.";
const SECTION_2_TITLE = "Phần II: Câu trắc nghiệm Đúng - Sai";
const SECTION_2_DESC = "Trong mỗi ý a, b, c, d ở mỗi câu, thí sinh chọn đúng hoặc sai.";
const SECTION_3_TITLE = "Phần III: Câu trắc nghiệm trả lời ngắn";
const SECTION_3_DESC = "Thí sinh điền đáp án dạng số vào ô trống.";

function buildGroupedQuestions(questions: AttemptQuestion[]): GroupedQuestion[] {
    const grouped: GroupedQuestion[] = [];
    const childrenMap = new Map<string, AttemptQuestion[]>();

    questions.forEach((question) => {
        if (!question.parent_id) {
            return;
        }

        const siblings = childrenMap.get(question.parent_id) ?? [];
        siblings.push(question);
        childrenMap.set(question.parent_id, siblings);
    });

    questions.forEach((question) => {
        if (question.parent_id) {
            return;
        }

        const cleanContent = question.content.replace(/^Phần\s+[I|V|X]+\.\s*/i, "");
        const item: GroupedQuestion = {
            id: question.question_id,
            type: question.type,
            content: cleanContent,
            imageUrl: question.image_url,
            options: question.options,
            correct_answer: question.correct_answer,
            explanation: question.explanation,
            sTitle: "",
            sDesc: "",
            globalNum: 0,
        };

        if (question.type === "cluster_context") {
            item.children = (childrenMap.get(question.question_id) ?? []).map((child) => ({
                id: child.question_id,
                content: child.content,
                options: child.options ?? [],
                correct_answer: child.correct_answer,
            }));
        }

        grouped.push(item);
    });

    const section1 = grouped
        .filter((question) => question.type === "single_choice")
        .map((question) => ({ ...question, sTitle: SECTION_1_TITLE, sDesc: SECTION_1_DESC }));
    const section2 = grouped
        .filter((question) => question.type === "cluster_context")
        .map((question) => ({ ...question, sTitle: SECTION_2_TITLE, sDesc: SECTION_2_DESC }));
    const section3 = grouped
        .filter((question) => question.type === "short_answer")
        .map((question) => ({ ...question, sTitle: SECTION_3_TITLE, sDesc: SECTION_3_DESC }));

    return [...section1, ...section2, ...section3].map((question, index) => ({
        ...question,
        globalNum: index + 1,
    }));
}

export default function ReviewPage() {
    const params = useParams();
    const id = params?.id as string | undefined;

    const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) {
            return;
        }

        getAttemptReview(id)
            .then((response) => {
                setReviewData(response);
            })
            .catch(() => {
                setError("Không thể tải bài review. Vui lòng thử lại.");
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, [id]);

    const allQuestionsArray = useMemo(() => {
        if (!reviewData) {
            return [];
        }

        return buildGroupedQuestions(reviewData.questions);
    }, [reviewData]);

    const resultsMap = useMemo(() => {
        if (!reviewData) {
            return {};
        }

        const res: Record<number, boolean> = {};

        allQuestionsArray.forEach((question) => {
            if (question.type === "single_choice" || question.type === "short_answer") {
                const answer = reviewData.userAnswers[question.id];
                if (answer && answer.trim() !== "") {
                    res[question.globalNum] = answer === question.correct_answer;
                }
                return;
            }

            if (question.type === "cluster_context" && question.children) {
                let isAllCorrect = true;
                let hasAnyAnswer = false;

                question.children.forEach((child) => {
                    const answer = reviewData.userAnswers[child.id];
                    if (answer && answer.trim() !== "") {
                        hasAnyAnswer = true;
                    }
                    if (answer !== child.correct_answer) {
                        isAllCorrect = false;
                    }
                });

                if (hasAnyAnswer) {
                    res[question.globalNum] = isAllCorrect;
                }
            }
        });

        return res;
    }, [allQuestionsArray, reviewData]);

    const sections = [
        {
            title: SECTION_1_TITLE,
            desc: SECTION_1_DESC,
            questions: allQuestionsArray.filter((question) => question.type === "single_choice"),
        },
        {
            title: SECTION_2_TITLE,
            desc: SECTION_2_DESC,
            questions: allQuestionsArray.filter((question) => question.type === "cluster_context"),
        },
        {
            title: SECTION_3_TITLE,
            desc: SECTION_3_DESC,
            questions: allQuestionsArray.filter((question) => question.type === "short_answer"),
        },
    ];

    if (!id) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center font-medium text-red-500">
                Thiếu mã bài làm.
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center font-medium text-red-500">
                {error}
            </div>
        );
    }

    if (isLoading || !reviewData) {
        return (
            <div className="min-h-screen w-full flex items-center justify-center font-medium text-[#004edc]">
                Đang tải kết quả bài thi...
            </div>
        );
    }

    const { title, userAnswers, user } = reviewData;

    return (
        <div className="w-full relative bg-aliceblue flex flex-col items-start font-roboto min-h-screen">
            <div className="w-full sticky top-0 z-50 shadow-md">
                <Header />
            </div>

            <div className="flex-1 w-full grid grid-cols-1 lg:grid-cols-[1fr_294px] gap-x-6 px-4 md:px-12 lg:px-24 py-8 lg:py-10 box-border font-sans items-start">
                <div className="flex flex-col lg:col-[1] row-[1] w-full rounded-num-30 bg-white shadow-[0px_2px_8px_rgba(146,184,255,0.2)] mb-10 pb-6">
                    <div className="p-6 md:p-8 flex flex-col gap-[3rem]">
                        <div className="w-full flex items-center justify-between pb-4 border-b border-aliceblue">
                            <b className="relative leading-[1.5rem] text-2xl text-mediumslateblue">
                                {title} - Kết quả bài thi
                            </b>
                        </div>

                        {sections.map((section) => {
                            if (section.questions.length === 0) {
                                return null;
                            }

                            return (
                                <div key={section.title} className="w-full flex flex-col items-start gap-[1.5rem]">
                                    <div className="flex flex-col items-start gap-[0.25rem]">
                                        <b className="relative leading-[2rem] text-mediumslateblue text-2xl">
                                            {section.title}
                                        </b>
                                        <div className="relative text-[1rem] leading-[1.75rem] text-cornflowerblue-100">
                                            {section.desc}
                                        </div>
                                    </div>

                                    <div className="w-full flex flex-col items-start gap-[3rem] text-[1rem]">
                                        {section.questions.map((currentQ) => (
                                            <div
                                                key={currentQ.id}
                                                className="w-full border-b border-aliceblue pb-8 last:border-0 relative"
                                            >
                                                <div id={`question-${currentQ.globalNum}`} className="absolute -top-[100px]" />

                                                <Question
                                                    number={currentQ.globalNum}
                                                    text={<LatexText content={currentQ.content} />}
                                                    imageUrl={currentQ.imageUrl}
                                                    isBookmarked={false}
                                                >
                                                    <div className="mt-4">
                                                        {currentQ.type === "single_choice" && currentQ.options && (
                                                            <MultipleChoice
                                                                name={currentQ.id}
                                                                options={currentQ.options}
                                                                value={userAnswers[currentQ.id]}
                                                                mode="review"
                                                                correctAnswer={currentQ.correct_answer}
                                                            />
                                                        )}

                                                        {currentQ.type === "cluster_context" && currentQ.children && (
                                                            <TrueFalse
                                                                parentId={currentQ.id}
                                                                statements={currentQ.children}
                                                                answers={userAnswers}
                                                                mode="review"
                                                                correctAnswers={currentQ.children.reduce<Record<string, string | undefined>>(
                                                                    (acc, child) => {
                                                                        acc[child.id] = child.correct_answer;
                                                                        return acc;
                                                                    },
                                                                    {}
                                                                )}
                                                            />
                                                        )}

                                                        {currentQ.type === "short_answer" && (
                                                            <ShortAnswer
                                                                name={currentQ.id}
                                                                value={userAnswers[currentQ.id] || ""}
                                                                mode="review"
                                                                correctAnswer={currentQ.correct_answer}
                                                            />
                                                        )}

                                                        <ExplanationCard
                                                            correctAnswerText={currentQ.correct_answer}
                                                            explanation={
                                                                currentQ.explanation ||
                                                                "Chưa có lời giải chi tiết cho câu hỏi này."
                                                            }
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

                <aside className="hidden lg:flex flex-col gap-6 col-[2] row-[1] sticky top-[7rem]">
                    <Sidebar
                        time="--:--"
                        totalQuestions={allQuestionsArray.length}
                        answeredQuestions={[]}
                        bookmarkedQuestions={[]}
                        currentIndex={-1}
                        onSelectQuestion={(idx) => {
                            const element = document.getElementById(`question-${idx + 1}`);
                            if (!element) {
                                return;
                            }

                            const y = element.getBoundingClientRect().top + window.scrollY - 150;
                            window.scrollTo({ top: y, behavior: "smooth" });
                        }}
                        onSubmit={() => {
                            window.location.href = `/attempts/${id}/result`;
                        }}
                        user={user}
                        mode="review"
                        results={resultsMap}
                    />
                </aside>
            </div>

            <Footer />
        </div>
    );
}
