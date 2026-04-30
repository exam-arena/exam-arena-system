import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Banner from "@/components/sections/Banner";
import CustomPagination from "@/components/shared/CustomPagination";
import DocCard from "@/components/document/DocCard";
import FilterSidebar from "@/components/document/FilterSidebar";

// Sinh tổng 36 tài liệu để tạo list 3 trang
const allMockDocs = Array(36).fill(null).map((_, i) => ({
    id: i + 1,
    title: `Gợi ý đáp án đề thi tốt nghiệp Toán THPT 2025 #${i + 1}`,
    subject: "Toán",
    type: "Tài liệu tham khảo",
    time: "20/03/2026",
}));

export default async function DocumentsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    // Logic Pagination
    const currentPage = parseInt(page || '1', 10);
    const itemsPerPage = 12;
    const totalPages = Math.ceil(allMockDocs.length / itemsPerPage);

    // Slice documents
    const mockDocs = allMockDocs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full font-roboto">
            <Header />
            <Banner />

            <section className="w-full bg-[#F6FBFF] py-8 sm:py-12 grow border-t border-blue-50">

                <div className="w-full max-w-360 mx-auto px-4 sm:px-6 md:px-24">

                    <div className="w-full grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 lg:gap-8 items-start">

                        {/* Left Sidebar: Filters */}
                        <FilterSidebar />

                        {/* Right Content: Document List */}
                        <div className="w-full flex flex-col gap-6">
                            <h2 className="text-2xl lg:text-[28px] font-bold text-[#004EDC]">
                                Danh sách tài liệu
                            </h2>

                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                                {mockDocs.map((doc) => (
                                    <DocCard key={doc.id} {...doc} />
                                ))}
                            </div>

                            {/* Pagination Component */}
                            <div className="mt-8 flex justify-center w-full">
                                <CustomPagination
                                    currentPage={currentPage}
                                    totalPages={totalPages}
                                    basePath="/documents"
                                />
                            </div>
                        </div>

                    </div>

                </div>
            </section>

            <Footer />
        </main>
    );
}