import RequireAuth from "@/components/auth/RequireAuth";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import Banner from "@/components/sections/Banner";
import ExamInfoTabs from "@/components/exam/ExamInfoTabs";
import { getExamById } from "@/lib/api/exams/api";
import { getRoomById } from "@/lib/api/rooms/api";

export default async function ExamInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const exam = await getExamById(id);
  if (!exam) {
    return <div className="p-10 text-center font-medium">De thi khong ton tai</div>;
  }

  const room = await getRoomById(exam.roomId);

  // Todo: replace with actual server-side auth token when SSR auth is fully implemented
  // For now fallback to a mock admin user for rendering purposes
  const currentUser = {
    username: "admin01",
    fullname: "Dinh Van Pham Viet",
    email: "dinhvanphamviet@gmail.com",
    role: "admin",
  };

  const participantCount = 610;

  return (
    <RequireAuth>
      <main className="min-h-screen bg-white flex flex-col w-full font-roboto">
        <Header />

        <div className="bg-[#F6FBFF] w-full overflow-hidden py-12 shadow-sm border-t border-blue-50 flex-grow">
          <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">
            <div className="w-full overflow-hidden flex flex-col items-start gap-12">
              <div className="self-stretch flex flex-col items-start gap-6">
                <div className="flex items-center justify-start text-[#92b8ff] font-medium text-sm">
                  <Link href="/" className="hover:text-[#004edc] transition-colors">
                    Trang chu
                  </Link>
                  <span className="mx-2">/</span>
                  <Link
                    href={`/rooms/${room?.id || 1}`}
                    className="hover:text-[#004edc] transition-colors uppercase"
                  >
                    {room?.name || "Phong luyen thi"}
                  </Link>
                  <span className="mx-2">/</span>
                  <span className="text-[#004edc] uppercase">{exam.title}</span>
                </div>

                <div className="self-stretch flex flex-col items-start gap-6 text-xl text-[#004edc]">
                  <div className="flex flex-col items-start gap-3 text-base">
                    <div className="flex items-start gap-3">
                      <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                        <div className="font-semibold text-sm capitalize">
                          {exam.typeLabel}
                        </div>
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
                    participantCount={participantCount}
                  />
                </div>
              </div>
            </div>

            <div className="w-full lg:w-[400px] flex flex-col items-center justify-start text-[#004edc]">
              <div className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 border border-blue-50">
                <div className="self-stretch flex flex-col items-center gap-4">
                  <h2 className="font-bold text-lg text-[#92b8ff]">
                    Thong tin thi sinh
                  </h2>

                  <div className="flex flex-col items-center gap-3">
                    <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF]">
                      <span className="text-3xl text-[#004edc] font-bold">
                        {currentUser.fullname.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <b className="text-xl">{currentUser.username}</b>
                  </div>

                  <div className="self-stretch h-[1px] bg-[#EAF2FF] w-full" />

                  <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-[280px] mx-auto">
                    <div className="flex flex-col items-start gap-4 font-bold text-[#004edc]">
                      <p>Ho va ten:</p>
                      <p>Email:</p>
                      <p>Vai tro:</p>
                    </div>
                    <div className="flex flex-col items-end gap-4 text-right text-[#004edc] font-medium">
                      <p>{currentUser.fullname}</p>
                      <p className="truncate max-w-[150px]" title={currentUser.email}>
                        {currentUser.email}
                      </p>
                      <p className="capitalize">
                        {currentUser.role === "student" ? "Hoc sinh" : "Quan tri"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-start text-sm mt-2 w-full">
                  <Link
                    href="/profile"
                    className="w-full rounded-full bg-white border border-[#EAF2FF] text-[#92b8ff] hover:bg-[#F6FBFF] hover:border-[#004edc] hover:text-[#004edc] transition-colors flex items-center justify-center py-2.5 px-5 font-bold"
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
    </RequireAuth>
  );
}
