"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Banner from "@/components/sections/Banner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getAttemptResult, getAttemptReview } from "@/lib/api/attempts/api";
import type {
  AttemptProcessingData,
  AttemptQuestion,
  AttemptResultData,
  AttemptReviewData,
} from "@/lib/api/attempts/types";
import { formatExamType } from "@/lib/api/exams/mapper";
import { BrandedLoadingScreen } from "@/components/shared/BrandedLoadingScreen";

export default function ExamResultPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<AttemptResultData | null>(null);
  const [reviewData, setReviewData] = useState<AttemptReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const pollTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    const schedulePoll = () => {
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
      }
      pollTimerRef.current = window.setTimeout(() => {
        void fetchResult();
      }, 5000);
    };

    const fetchResult = async () => {
      try {
        const [result, review] = await Promise.all([
          getAttemptResult(id),
          getAttemptReview(id),
        ]);
        if (!isMounted) return;

        if (isProcessingResult(result) || isProcessingReview(review)) {
          setLoadError(null);
          setIsProcessing(true);
          schedulePoll();
          return;
        }

        setLoadError(null);
        setIsProcessing(false);
        setData(result);
        setReviewData(review);
      } catch {
        if (!isMounted) return;
        setLoadError("Không thể tải kết quả bài thi. Vui lòng thử lại.");
      } finally {
        if (!isMounted) return;
        setIsLoading(false);
      }
    };

    void fetchResult();
    return () => {
      isMounted = false;
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };

  }, [id]);

  useEffect(() => {
    const historyState = { attemptResultId: id, examResultLock: true };

    window.history.pushState(historyState, "", window.location.href);

    const handlePopState = () => {
      window.history.pushState(historyState, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [id, router]);

  if (!id) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-medium text-[#0f172a]">Không tìm thấy mã bài thi.</p>
        <Link
          href="/"
          className="rounded-full bg-mediumslateblue px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#003bb0]"
        >
          Về trang chủ
        </Link>
      </main>
    );
  }

  if (isLoading || isProcessing) {
    return (
      <BrandedLoadingScreen
        message={isProcessing ? "Đang chấm điểm bài thi... Vui lòng chờ." : "Đang tải kết quả bài thi..."}
      />
    );
  }

  if (loadError || !data || !reviewData) {
    return (
      <main className="min-h-screen bg-white flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-base font-medium text-[#0f172a]">
          {loadError ?? "Không thể tải kết quả bài thi."}
        </p>
        <Link
          href="/"
          className="rounded-full bg-mediumslateblue px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#003bb0]"
        >
          Về trang chủ
        </Link>
      </main>
    );
  }

  const { user, exam, room, result } = data;
  const detailSections = buildDetailSections(reviewData);

  return (
    <main className="min-h-screen bg-white flex flex-col w-full font-roboto">
      <Header />

      <div className="bg-[#F6FBFF] w-full overflow-hidden py-12 shadow-sm border-t border-blue-50 grow">
        <div className="w-full max-w-360 mx-auto px-4 sm:px-6 md:px-24 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
          <div className="w-full overflow-hidden flex flex-col items-start gap-12">
            <div className="self-stretch flex flex-col items-start gap-6">
              <Breadcrumb>
                <BreadcrumbList className="text-sm font-medium text-cornflowerblue-100">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href="/" className="transition-colors hover:text-mediumslateblue">
                        Trang chủ
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-cornflowerblue-100" />
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        href={`/rooms/${room.id}`}
                        className="uppercase transition-colors hover:text-mediumslateblue"
                      >
                        {room.name}
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="text-cornflowerblue-100" />
                  <BreadcrumbItem>
                    <BreadcrumbPage className="uppercase text-mediumslateblue">
                      {exam.title}
                    </BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>

              <div className="self-stretch flex flex-col items-start gap-6 text-xl text-mediumslateblue">
                <div className="flex flex-col items-start gap-3 text-base">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-[#EAF2FF] text-mediumslateblue flex items-center justify-center py-1 px-4">
                      <div className="font-semibold text-sm capitalize">
                        {formatExamType(exam.type)}
                      </div>
                    </div>
                  </div>
                  <h1 className="text-[2rem] font-bold font-inter mt-2 leading-tight uppercase">
                    {exam.title}
                  </h1>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full">
                  <div className="rounded-num-30 border border-transparent bg-[#e7f0ff] text-[#0050e2] py-2 px-5 text-[1rem] leading-7 font-bold flex items-center justify-center">
                    Kết quả Đề thi
                  </div>
                  <Link
                    href={`/attempts/${id}/review`}
                    className="rounded-num-30 border border-cornflowerblue-100 bg-white text-cornflowerblue-100 hover:bg-[#F6FBFF] hover:border-[#0050e2] hover:text-[#0050e2] transition-colors py-2 px-5 text-[1rem] leading-7 font-normal flex items-center justify-center"
                  >
                    Đáp án tham khảo
                  </Link>
                  <Link
                    href="/history"
                    className="rounded-num-30 border border-cornflowerblue-100 bg-white text-cornflowerblue-100 hover:bg-[#F6FBFF] hover:border-[#0050e2] hover:text-[#0050e2] transition-colors py-2 px-5 text-[1rem] leading-7 font-normal flex items-center justify-center"
                  >
                    Lịch sử làm bài
                  </Link>
                </div>
              </div>
            </div>

            <div className="flex flex-col items-start gap-10 mt-2 w-full">
              <div className="flex flex-col items-start gap-2">
                <div className="text-[2.25rem] font-bold font-roboto text-mediumslateblue">
                  {result.score} điểm
                </div>
                <div className="text-[1rem] text-cornflowerblue-100">{result.message}</div>
              </div>

              <div className="flex flex-col items-start gap-6 w-full sm:w-[27.813rem]">
                <b className="text-[1.25rem] text-mediumslateblue">Chi tiết bài làm</b>
                {detailSections.map((section) => {
                  if (section.questions.length === 0) {
                    return null;
                  }

                  return (
                    <div key={section.title} className="flex flex-col items-start gap-4 w-[min(100%,25.5rem)]">
                      <div className="w-full bg-[#EAF2FF] px-4 py-2 text-[1.25rem] leading-7 font-bold text-mediumslateblue">
                        {section.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-6 max-w-full">
                        {section.questions.map((question) => (
                          <ResultQuestionDot key={question.id} question={question} />
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="grid w-[min(100%,25.5rem)] grid-cols-2 gap-2 mt-2 sm:gap-3">
                <Link
                  href={`/exams/${exam.id}`}
                  className="rounded-num-30 bg-mediumslateblue border-mediumslateblue border-solid border hover:bg-[#003bb0] overflow-hidden flex items-center justify-center py-2 px-3 text-white transition-colors sm:px-4"
                >
                  <div className="relative text-center text-[0.875rem] font-bold sm:text-[1rem]">Làm lại bài thi</div>
                </Link>
                <Link
                  href={`/rooms/${room.id}`}
                  className="rounded-num-30 bg-white border-cornflowerblue-100 border-solid border hover:border-[#0050e2] hover:text-[#0050e2] overflow-hidden flex items-center justify-center py-2 px-3 text-cornflowerblue-100 transition-colors sm:px-4"
                >
                  <div className="relative text-center text-[0.875rem] font-bold sm:text-[1rem]">Quay về phòng thi</div>
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full lg:w-100 flex flex-col items-center justify-start text-mediumslateblue">
            <div className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 border border-blue-50">
              <div className="self-stretch flex flex-col items-center gap-4">
                <h2 className="font-bold text-lg text-cornflowerblue-100">Thông tin thí sinh</h2>

                <div className="flex flex-col items-center gap-3">
                  <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF]">
                    <span className="text-3xl text-mediumslateblue font-bold">
                      {user.fullname.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <b className="text-xl">{user.username}</b>
                </div>

                <div className="self-stretch h-px bg-[#EAF2FF] w-full" />

                <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-70 mx-auto">
                  <div className="flex flex-col items-start gap-4 font-bold text-mediumslateblue">
                    <p>Họ và tên:</p>
                    <p>Email:</p>
                    <p>Vai trò:</p>
                  </div>
                  <div className="flex flex-col items-end gap-4 text-right text-mediumslateblue font-medium">
                    <p>{user.fullname}</p>
                    <p className="truncate max-w-37.5" title={user.email}>
                      {user.email}
                    </p>
                    <p className="capitalize">
                      {user.role === "student" ? "Học sinh" : "Quản trị viên"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start text-sm mt-2 w-full">
                <Link
                  href="/profile"
                  className="w-full rounded-full bg-white border border-[#EAF2FF] text-cornflowerblue-100 hover:bg-[#F6FBFF] hover:border-mediumslateblue hover:text-mediumslateblue transition-colors flex items-center justify-center py-2.5 px-5 font-bold"
                >
                  Xem Profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Banner />
      <Footer />
    </main>
  );
}

function isProcessingResult(
  payload: AttemptResultData | AttemptProcessingData
): payload is AttemptProcessingData {
  return (payload as AttemptProcessingData).status === "processing";
}

function isProcessingReview(
  payload: AttemptReviewData | AttemptProcessingData
): payload is AttemptProcessingData {
  return (payload as AttemptProcessingData).status === "processing";
}

interface DetailQuestion {
  id: string;
  number: number;
  correct: number;
  wrong: number;
  skipped: number;
}

interface DetailSection {
  title: string;
  questions: DetailQuestion[];
}

function buildDetailSections(reviewData: AttemptReviewData): DetailSection[] {
  const parents = reviewData.questions.filter((question) => !question.parent_id);
  const childrenByParent = new Map<string, AttemptQuestion[]>();

  reviewData.questions.forEach((question) => {
    if (!question.parent_id) {
      return;
    }

    const siblings = childrenByParent.get(question.parent_id) ?? [];
    siblings.push(question);
    childrenByParent.set(question.parent_id, siblings);
  });

  const singleChoice = parents
    .filter((question) => question.type === "single_choice")
    .map((question, index) => buildSimpleDetailQuestion(question, index, reviewData.userAnswers));
  const trueFalse = parents
    .filter((question) => question.type === "cluster_context")
    .map((question, index) =>
      buildTrueFalseDetailQuestion(
        question,
        index,
        childrenByParent.get(question.question_id) ?? [],
        reviewData.userAnswers
      )
    );
  const shortAnswer = parents
    .filter((question) => question.type === "short_answer")
    .map((question, index) => buildSimpleDetailQuestion(question, index, reviewData.userAnswers));

  return [
    { title: "Trắc nghiệm", questions: singleChoice },
    { title: "Đúng - Sai", questions: trueFalse },
    { title: "Trả lời ngắn", questions: shortAnswer },
  ];
}

function buildSimpleDetailQuestion(
  question: AttemptQuestion,
  index: number,
  userAnswers: Record<string, string>
): DetailQuestion {
  const selected = normalizeAnswer(userAnswers[question.question_id]);
  const expected = normalizeAnswer(question.correct_answer);

  return {
    id: question.question_id,
    number: index + 1,
    correct: selected && selected === expected ? 1 : 0,
    wrong: selected && selected !== expected ? 1 : 0,
    skipped: selected ? 0 : 1,
  };
}

function buildTrueFalseDetailQuestion(
  question: AttemptQuestion,
  index: number,
  children: AttemptQuestion[],
  userAnswers: Record<string, string>
): DetailQuestion {
  const counts = children.reduce(
    (acc, child) => {
      const selected = normalizeAnswer(userAnswers[child.question_id]);
      const expected = normalizeAnswer(child.correct_answer);

      if (!selected) {
        acc.skipped += 1;
      } else if (selected === expected) {
        acc.correct += 1;
      } else {
        acc.wrong += 1;
      }

      return acc;
    },
    { correct: 0, wrong: 0, skipped: 0 }
  );

  return {
    id: question.question_id,
    number: index + 1,
    ...counts,
  };
}

function normalizeAnswer(value?: string | null) {
  return (value ?? "").trim().toLowerCase();
}

function ResultQuestionDot({ question }: { question: DetailQuestion }) {
  const total = Math.max(1, question.correct + question.wrong + question.skipped);
  const correctEnd = (question.correct / total) * 100;
  const wrongEnd = ((question.correct + question.wrong) / total) * 100;
  const baseBackground = `conic-gradient(#BFF7D0 0% ${correctEnd}%, #FFD7D7 ${correctEnd}% ${wrongEnd}%, rgba(146, 184, 255, 0.2) ${wrongEnd}% 100%)`;
  const background =
    total > 1
      ? `repeating-conic-gradient(transparent 0deg ${360 / total - 2}deg, rgba(255,255,255,0.8) ${360 / total - 2}deg ${360 / total}deg), ${baseBackground}`
      : baseBackground;

  return (
    <div
      className="w-12 h-12 shrink-0 rounded-full flex items-center justify-center text-[1.125rem] font-bold text-mediumslateblue"
      style={{ background }}
    >
      {question.number}
    </div>
  );
}
