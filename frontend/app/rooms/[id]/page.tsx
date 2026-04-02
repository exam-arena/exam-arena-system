import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Users, User, Clock, ChevronLeft } from "lucide-react";
import RoomExamCard from "@/components/room/RoomExamCard";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";
import { getRoomById } from "@/lib/api/rooms/api";
import { getExamsByRoomId } from "@/lib/api/exams/api";

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
        return <div className="p-10 text-center font-medium">Phòng thi không tồn tại</div>;
    }

    const currentPage = parseInt(page || "1", 10);
    const itemsPerPage = 8;
    const { items: displayExams, totalPages } = await getExamsByRoomId(room.id, currentPage, itemsPerPage);

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full">
            <Header />

            <section className="w-full bg-[#F6FBFF] grow py-8 md:py-12 border-t border-blue-50">
                <div className="max-w-360 mx-auto px-4 sm:px-6 md:px-24">

                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 md:gap-10 items-start">

                        {/* Sidebar: Thông tin phòng luyện thi */}
                        <div className="flex flex-col gap-6">
                            <div className="shadow-sm rounded-3xl bg-[#EAF2FF] overflow-hidden flex flex-col p-6 border border-blue-100">

                                <div className="flex flex-col gap-6 mb-8">
                                    <div className="flex flex-col gap-2">
                                        <i className="text-sm text-[#004EDC] opacity-80">Thông tin phòng luyện thi</i>
                                        <b className="text-[#004EDC] text-xl leading-tight uppercase">{room.name}</b>
                                        <div className="mt-2">
                                            <span className="bg-white text-[#004EDC] font-semibold text-xs px-3 py-1 rounded-full shadow-sm capitalize">
                                                {room.typeLabel}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 text-sm text-[#004EDC]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <Users className="w-4 h-4" />
                                                <span>Số lượng đề</span>
                                            </div>
                                            <span className="font-semibold text-right">{room.testQuantity} đề</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <User className="w-4 h-4" />
                                                <span>Giá</span>
                                            </div>
                                            <span className="font-semibold text-right">{room.priceLabel}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <Clock className="w-4 h-4" />
                                                <span>Trạng thái</span>
                                            </div>
                                            <span className="font-semibold text-right">{room.statusLabel}</span>
                                        </div>
                                    </div>
                                </div>

                            </div>

                            {/* Nút quay lại */}
                            <Link href="/rooms" className="flex items-center justify-center gap-2 text-[#004EDC] hover:text-blue-800 transition-colors py-2 font-medium">
                                <ChevronLeft className="w-4 h-4" />
                                <span>Quay lại phòng luyện thi</span>
                            </Link>

                        </div>

                        {/* Main Content: Danh sách đề thi */}
                        <div className="flex flex-col gap-6">

                            <h2 className="text-xl md:text-2xl font-bold text-[#004EDC]">
                                Danh sách đề thi
                            </h2>

                            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                                {displayExams.length > 0 ? (
                                    displayExams.map((exam) => (
                                        <RoomExamCard key={exam.exam_id} {...exam} />
                                    ))
                                ) : (
                                    <div className="col-span-1 sm:col-span-2 xl:col-span-3 text-center py-10 text-gray-500 font-medium">
                                        Phòng này chưa có đề thi nào.
                                    </div>
                                )}
                            </div>

                            {/* Phân trang */}
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
