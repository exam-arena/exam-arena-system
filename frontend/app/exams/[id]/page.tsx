import RequireAuth from "@/components/auth/RequireAuth";
import CurrentUserCard from "@/components/exam/CurrentUserCard";
import ExamInfoTabs from "@/components/exam/ExamInfoTabs";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import Banner from "@/components/sections/Banner";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { getExamById } from "@/lib/api/exams/api";
import Link from "next/link";

export default async function ExamInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exam = await getExamById(id);
  if (!exam) {
    return <div className="p-10 text-center font-medium">Đề thi không tồn tại</div>;
  }

  return (
    <RequireAuth>
      <main className="min-h-screen bg-white flex flex-col w-full font-roboto">
        <Header />

        <div className="bg-[#F6FBFF] w-full overflow-hidden py-12 shadow-sm border-t border-blue-50 flex-grow">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
            <div className="w-full overflow-hidden flex flex-col items-start gap-12">
              <div className="self-stretch flex flex-col items-start gap-6">
                <Breadcrumb>
                  <BreadcrumbList className="text-sm font-medium text-[#92b8ff]">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild
                        className="hover:text-[#004edc]"
                      >
                        <Link href="/">Trang chủ</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-[#92b8ff]" />
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild
                        className="hover:text-[#004edc] uppercase"
                      >
                        <Link href={`/rooms/${exam.roomId}`}>{exam.roomName}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-[#92b8ff]" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-[#004edc] uppercase">
                        {exam.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="self-stretch flex flex-col items-start gap-6 text-xl text-[#004edc]">
                  <div className="flex flex-col items-start gap-3 text-base">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                        <div className="font-semibold text-sm capitalize">{exam.typeLabel}</div>
                      </div>
                    </div>
                    <h1 className="text-[2rem] font-bold font-inter mt-2 leading-tight uppercase">
                      {exam.title}
                    </h1>
                  </div>

                  <ExamInfoTabs
                    examId={id}
                    examDuration={exam.durationLabel}
                    totalQuestions={exam.totalQuestions}
                    participantCount={exam.participantCount}
                  />
                </div>
              </div>
            </div>

            <CurrentUserCard />
          </div>
        </div>
        <Banner />

        <Footer />
      </main>
    </RequireAuth>
  );
}
