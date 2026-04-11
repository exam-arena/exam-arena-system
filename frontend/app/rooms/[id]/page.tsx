import Link from "next/link";
import { ChevronLeft, Clock, User, Users } from "lucide-react";
import Banner from "@/components/sections/Banner";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import RoomExamCard from "@/components/room/RoomExamCard";
import CustomPagination from "@/components/shared/CustomPagination";
import { getExamsByRoomId } from "@/lib/api/exams/api";
import { getRoomById } from "@/lib/api/rooms/api";

export default async function RoomDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { id } = await params;
  const resolvedParams = await searchParams;
  const page = resolvedParams?.page;

  const room = await getRoomById(id);
  if (!room) {
    return (
      <div className="p-10 text-center font-medium">Phòng thi không tồn tại</div>
    );
  }

  const currentPage = parseInt(page || "1", 10);
  const itemsPerPage = 8;

  let displayExams: Awaited<
    ReturnType<typeof getExamsByRoomId>
  >["items"] = [];
  let totalPages = 0;
  let examsErrorMessage = "";

  try {
    const response = await getExamsByRoomId(room.id, currentPage, itemsPerPage);
    displayExams = response.items;
    totalPages = response.totalPages;
  } catch {
    examsErrorMessage = "Bạn cần đăng ký phòng để xem danh sách đề.";
  }

  return (
    <main className="flex min-h-screen w-full flex-col bg-neutral-50">
      <Header />

      <section className="w-full grow border-t border-blue-50 bg-[#F6FBFF] py-8 md:py-12">
        <div className="mx-auto max-w-360 px-4 sm:px-6 md:px-24">
          <div className="grid grid-cols-1 items-start gap-8 md:gap-10 lg:grid-cols-[300px_1fr]">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col overflow-hidden rounded-3xl border border-blue-100 bg-[#EAF2FF] p-6 shadow-sm">
                <div className="mb-8 flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <i className="text-sm text-[#004EDC] opacity-80">
                      Thông tin phòng luyện thi
                    </i>
                    <b className="text-xl leading-tight text-[#004EDC] uppercase">
                      {room.name}
                    </b>
                    <div className="mt-2">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#004EDC] shadow-sm capitalize">
                        {room.typeLabel}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 text-sm text-[#004EDC]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 opacity-80">
                        <Users className="h-4 w-4" />
                        <span>Số lượng đề</span>
                      </div>
                      <span className="text-right font-semibold">
                        {room.testQuantity} đề
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 opacity-80">
                        <User className="h-4 w-4" />
                        <span>Giá</span>
                      </div>
                      <span className="text-right font-semibold">
                        {room.priceLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 opacity-80">
                        <Clock className="h-4 w-4" />
                        <span>Trạng thái</span>
                      </div>
                      <span className="text-right font-semibold">
                        {room.statusLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/rooms"
                className="flex items-center justify-center gap-2 py-2 font-medium text-[#004EDC] transition-colors hover:text-blue-800"
              >
                <ChevronLeft className="h-4 w-4" />
                <span>Quay lại phòng luyện thi</span>
              </Link>
            </div>

            <div className="flex flex-col gap-6">
              <h2 className="text-xl font-bold text-[#004EDC] md:text-2xl">
                Danh sách đề thi
              </h2>

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {displayExams.length > 0 ? (
                  displayExams.map((exam) => (
                    <RoomExamCard key={exam.exam_id} {...exam} />
                  ))
                ) : (
                  <div className="col-span-1 py-10 text-center font-medium text-gray-500 sm:col-span-2 xl:col-span-3">
                    {examsErrorMessage || "Phòng này chưa có đề thi nào."}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="mt-4">
                  <CustomPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    basePath={`/rooms/${id}`}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Banner />
      <Footer />
    </main>
  );
}
