import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RoomCard from "@/components/room/RoomCard";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";

// Mock data
const allMockRooms = Array(24).fill(null).map((_, i) => ({
    id: i + 1,
    title: `PHÒNG THI THỬ TOÁN THPTQG #${i + 1}`,
    subtitle: "Lớp 12 luyện thi đại học",
    capacity: "504/1000",
    target: "Tất cả",
    status: "Đang mở",
    type: "Trực tuyến",
}));

export default async function RoomsPage({
    searchParams,
}: {
    searchParams: Promise<{ page?: string }>;
}) {
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    const currentPage = parseInt(page || "1", 10);
    const itemsPerPage = 6;
    const totalPages = Math.ceil(allMockRooms.length / itemsPerPage);

    const mockRooms = allMockRooms.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col w-full">
            <Header />
            <Banner />

            <section className="w-full bg-white flex-grow py-10 md:py-16 border-t border-blue-50">
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                    {/* Header */}
                    <div className="flex flex-col items-center gap-2 mb-10 md:mb-14">
                        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-[#004EDC] text-center">
                            DANH SÁCH PHÒNG LUYỆN THI
                        </h1>
                        <p className="text-sm md:text-lg text-[#92B8FF] text-center max-w-[600px]">
                            Tham gia các phòng thi thử mô phỏng thời gian và quy chế thật.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 md:gap-10">
                        {mockRooms.map((room) => (
                            <RoomCard key={room.id} {...room} />
                        ))}
                    </div>

                    {/* Pagination */}
                    <div className="mt-10">
                        <CustomPagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            basePath="/rooms"
                        />
                    </div>

                </div>
            </section>

            <Footer />
        </main>
    );
}