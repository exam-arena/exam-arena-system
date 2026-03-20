import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RoomCard from "@/components/room/RoomCard";
import Hero from "@/components/sections/Hero";
import CustomPagination from "@/components/shared/CustomPagination";
import Banner from "@/components/sections/Banner";

// Sinh 48 phòng thi để giả phân trang làm 4 trang (12 phòng/trang)
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
    // Next.js 15 requires awaiting searchParams
    const resolvedParams = await searchParams;
    const page = resolvedParams?.page;

    // Logic tính trang
    const currentPage = parseInt(page || '1', 10);
    const itemsPerPage = 6;
    const totalPages = Math.ceil(allMockRooms.length / itemsPerPage);

    // Lấy đúng khoảng slice của mảng ứng với trang
    const mockRooms = allMockRooms.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col items-center mx-auto max-w-[1920px]">
            {/* Header sử dụng UI của người chưa đăng nhập để thống nhất (hoặc bạn có thể tự đổi sang true) */}
            <Header />
            <Banner />

            <section className="w-full bg-white flex-grow border-t border-blue-50 py-10 md:py-16">
                <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">

                    {/* Header Page */}
                    <div className="flex flex-col items-center gap-2 mb-8 md:mb-12">
                        <h1 className="text-2xl sm:text-3xl md:text-[40px] font-bold text-[#004EDC] text-center leading-tight">
                            DANH SÁCH PHÒNG LUYỆN THI
                        </h1>
                        <p className="text-sm md:text-lg text-[#92B8FF] text-center max-w-[600px] mt-2">
                            Tham gia các phòng thi thử mô phỏng thời gian và quy chế thật.
                        </p>
                    </div>

                    {/* Rooms Grid */}
                    <div className="max-w-[1248px] mx-auto">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-y-8 md:gap-y-10 gap-x-6 md:gap-x-8">
                            {mockRooms.map((room) => (
                                <RoomCard key={room.id} {...room} />
                            ))}
                        </div>

                        {/* Pagination Component */}
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
