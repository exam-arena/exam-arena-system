"use client";

import { useEffect, useState } from "react";
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
import { getAttemptResult } from "@/lib/api/attempts/api";
import type { AttemptResultData } from "@/lib/api/attempts/types";
import { formatExamType } from "@/lib/api/exams/mapper";
import { BrandedLoadingScreen } from "@/components/shared/BrandedLoadingScreen";

export default function ExamResultPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [data, setData] = useState<AttemptResultData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    getAttemptResult(id)
      .then((result) => {
        if (!isMounted) return;
        setData(result);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError("Không thể tải kết quả bài thi. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
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

  if (isLoading) {
  return <BrandedLoadingScreen message="Đang tải kết quả bài thi..." />;
  }

  if (loadError || !data) {
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
                    Kết quả đề thi
                  </div>
                  <Link
                    href={`/attempts/${id}/review`}
                    className="rounded-num-30 border border-cornflowerblue-100 bg-white text-cornflowerblue-100 hover:bg-[#F6FBFF] hover:border-[#0050e2] hover:text-[#0050e2] transition-colors py-2 px-5 text-[1rem] leading-7 font-normal flex items-center justify-center"
                  >
                    Đáp án tham khảo
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

              <div className="flex flex-col items-start gap-3 w-full sm:w-[27.813rem]">
                <b className="text-[1.25rem] text-mediumslateblue">Chi tiết bài làm</b>
                <div className="flex flex-col items-start gap-2 text-[1.25rem] w-full text-mediumslateblue">
                  <div className="relative flex items-center gap-2">
                    <span>Số câu đúng: </span>
                    <b className="font-bold">{result.correct}</b>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <span>Số câu sai: </span>
                    <b className="font-bold">{result.wrong}</b>
                  </div>
                  <div className="relative flex items-center gap-2">
                    <span>Số câu bỏ qua: </span>
                    <b className="font-bold">{result.skipped}</b>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-start gap-3 mt-2">
                <Link
                  href={`/rooms/${room.id}`}
                  className="rounded-num-30 bg-white border-cornflowerblue-100 border-solid border hover:border-[#0050e2] hover:text-[#0050e2] overflow-hidden flex items-center justify-center py-2 px-4 text-cornflowerblue-100 transition-colors"
                >
                  <div className="relative text-[1rem] font-bold">Quay về {room.name}</div>
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
