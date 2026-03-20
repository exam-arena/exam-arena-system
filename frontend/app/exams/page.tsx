import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ExamCard from "@/components/exam/ExamCard";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";

// Mock data
const allMockExams = Array(32).fill(null).map((_, i) => ({
    id: i + 1,
    title: `ĐỀ ÔN LUYỆN TUYỂN CHỌN SỐ ${i + 1}`,
    subject: "Toán học",
    duration: "90 phút",
    image: "/carddethi.png",
}));

export default async function ExamsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    const currentPage = parseInt(page || "1", 10);
    const itemsPerPage = 8;
    const totalPages = Math.ceil(allMockExams.length / itemsPerPage);

    const mockExams = allMockExams.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full">
            <Header />
            <Banner />

            <section className="w-full bg-[#F6FBFF] py-10 md:py-16 flex-grow border-t border-blue-50">
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                    {/* Header Page */}
                    <div className="flex flex-col items-center gap-2 mb-10 md:mb-14">
                        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-[#004EDC] text-center">
                            DANH SÁCH ĐỀ THI TUYỂN CHỌN
                        </h1>
                        <p className="text-sm md:text-lg text-[#92B8FF] text-center max-w-[600px]">
                            Tuyển chọn đề thi hay, chuẩn cấu trúc, có lời giải chi tiết.
                        </p>
                    </div>

                    {/* Exams Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                        {mockExams.map((exam) => (
                            <ExamCard key={exam.id} {...exam} />
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="mt-10">
                        <CustomPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            basePath="/exams"
                        />
                    </div>

                </div>
            </section>

            <Footer />
        </main>
    );
}