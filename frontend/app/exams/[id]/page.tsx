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

        <div className="bg-[#F6FBFF] w-full overflow-hidden py-12 shadow-sm border-t border-blue-50 grow">
          <div className="w-full max-w-360 mx-auto px-4 sm:px-6 md:px-24 grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
            <div className="w-full overflow-hidden flex flex-col items-start gap-12">
              <div className="self-stretch flex flex-col items-start gap-6">
                <Breadcrumb>
                  <BreadcrumbList className="text-sm font-medium text-cornflowerblue-100">
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild
                        className="hover:text-mediumslateblue"
                      >
                        <Link href="/">Trang chủ</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-cornflowerblue-100" />
                    <BreadcrumbItem>
                      <BreadcrumbLink
                        asChild
                        className="hover:text-mediumslateblue uppercase"
                      >
                        <Link href={`/rooms/${exam.roomId}`}>{exam.roomName}</Link>
                      </BreadcrumbLink>
                    </BreadcrumbItem>
                    <BreadcrumbSeparator className="text-cornflowerblue-100" />
                    <BreadcrumbItem>
                      <BreadcrumbPage className="text-mediumslateblue uppercase">
                        {exam.title}
                      </BreadcrumbPage>
                    </BreadcrumbItem>
                  </BreadcrumbList>
                </Breadcrumb>

                <div className="self-stretch flex flex-col items-start gap-6 text-xl text-mediumslateblue">
                  <div className="flex flex-col items-start gap-3 text-base">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[#EAF2FF] text-mediumslateblue flex items-center justify-center py-1 px-4">
                        <div className="font-semibold text-sm capitalize">{exam.typeLabel}</div>
                      </div>
                    </div>
                    <h1 className="text-[2rem] font-bold font-inter mt-2 leading-tight uppercase">
                      {exam.title}
                    </h1>
                  </div>

                  <ExamInfoTabs
                    examId={id}
                    examType={exam.type}
                    examStartTime={exam.startTime}
                    examDurationSeconds={exam.durationSeconds}
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
