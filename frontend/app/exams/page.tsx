import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ExamCard from "@/components/exam/ExamCard";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";
import { getExams } from "@/lib/api/exams/api";

export default async function ExamsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    const currentPage = parseInt(page || "1", 10);
    const itemsPerPage = 8;
    
    const { items: exams, totalPages } = await getExams(currentPage, itemsPerPage);

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full">
            <Header />
            <Banner />

            <section className="w-full bg-[#F6FBFF] py-10 md:py-16 grow border-t border-blue-50">
                <div className="w-full max-w-360 mx-auto px-4 sm:px-6 md:px-24">

                    {/* Header Page */}
                    <div className="flex flex-col items-center gap-2 mb-10 md:mb-14">
                        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-[#004EDC] text-center">
                            DANH SÁCH ĐỀ THI TUYỂN CHỌN
                        </h1>
                        <p className="text-sm md:text-lg text-[#92B8FF] text-center max-w-150">
                            Tuyển chọn đề thi hay, chuẩn cấu trúc, có lời giải chi tiết.
                        </p>
                    </div>

                    {/* Exams Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {exams.length > 0 ? (
                            exams.map((exam) => (
                                <ExamCard key={exam.exam_id} {...exam} image="/carddethi.png" />
                            ))
                        ) : (
                            <div className="col-span-2 sm:col-span-2 lg:col-span-4 text-center py-10 text-gray-500 font-medium">
                                Chưa có đề thi nào.
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="mt-10">
                            <CustomPagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                basePath="/exams"
                            />
                        </div>
                    )}

                </div>
            </section>

            <Footer />
        </main>
    );
}
