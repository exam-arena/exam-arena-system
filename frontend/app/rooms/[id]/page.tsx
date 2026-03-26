import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { Users, User, Clock, GraduationCap, ChevronLeft } from "lucide-react";
import RoomExamCard from "@/components/room/RoomExamCard";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";

// Sinh list đề thi mẫu trong phòng
const roomExams = Array(9).fill(null).map((_, i) => ({
    id: i + 1,
    title: `ĐỀ THI THỬ TOÁN THPTQG MÃ ĐỀ ${101 + i}`,
    subject: "Toán học",
    duration: "90 phút",
}));

export default async function RoomDetailPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ page?: string }>;
}) {
    // Next.js 15
    const { id } = await params;
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    // Pagination (Demo 3 trang)
    const currentPage = parseInt(page || '1', 10);
    const totalPages = 3;

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full">
            <Header />

            <section className="w-full bg-[#F6FBFF] flex-grow py-8 md:py-12 border-t border-blue-50">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                    <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 md:gap-10 items-start">

                        {/* Sidebar: Thông tin phòng luyện thi */}
                        <div className="flex flex-col gap-6">
                            <div className="shadow-sm rounded-3xl bg-[#EAF2FF] overflow-hidden flex flex-col p-6 border border-blue-100">

                                <div className="flex flex-col gap-6 mb-8">
                                    <div className="flex flex-col gap-2">
                                        <i className="text-sm text-[#004EDC] opacity-80">Thông tin phòng luyện thi</i>
                                        <b className="text-[#004EDC] text-xl leading-tight">PHÒNG THI ID: {id} <br /> MÔN TOÁN THPTQG</b>
                                        <div className="mt-2">
                                            <span className="bg-white text-[#004EDC] font-semibold text-xs px-3 py-1 rounded-full shadow-sm">
                                                THPT
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 text-sm text-[#004EDC]">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <Users className="w-4 h-4" />
                                                <span>Sức chứa</span>
                                            </div>
                                            <span className="font-semibold text-right">504/1000</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <User className="w-4 h-4" />
                                                <span>Đối tượng</span>
                                            </div>
                                            <span className="font-semibold text-right">Tất cả</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <Clock className="w-4 h-4" />
                                                <span>Trạng thái</span>
                                            </div>
                                            <span className="font-semibold text-right">Đang mở</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 opacity-80">
                                                <GraduationCap className="w-4 h-4" />
                                                <span>Hình thức</span>
                                            </div>
                                            <span className="font-semibold text-right">Trực tuyến</span>
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
                                {roomExams.map((exam) => (
                                    <RoomExamCard key={exam.id} {...exam} />
                                ))}
                            </div>

                            {/* Phân trang */}
                            <div className="mt-4">
                                <CustomPagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    basePath={`/rooms/${id}`}
                                />
                            </div>

                        </div>

                    </div>

                </div>
            </section>
            <Banner />
            <Footer />
        </main>
    );
}
