import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import Banner from "@/components/sections/Banner";
import ExamInfoTabs from "@/components/exam/ExamInfoTabs";

export default async function ExamInfoPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const examDuration = "90 phút";

    return (
        <main className="min-h-screen bg-white flex flex-col mx-auto max-w-[1920px] font-roboto">
            <Header />

            {/* Main Content Area from Figma */}
            <div className="bg-[#F6FBFF] w-full overflow-hidden flex justify-center py-12 px-4 shadow-sm border-t border-blue-50 flex-grow">
                <div className="w-full max-w-[1248px] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 justify-center">

                    {/* Left side: Exam Info */}
                    <div className="w-full overflow-hidden flex flex-col items-start gap-12">
                        <div className="self-stretch flex flex-col items-start gap-6">

                            <div className="flex items-center justify-start text-[#92b8ff] font-medium text-sm">
                                <Link href="/" className="hover:text-[#004edc] transition-colors">Trang chủ</Link>
                                <span className="mx-2">/</span>
                                {/* Mock room id as 1 for now until API is connected */}
                                <Link href="/rooms/1" className="hover:text-[#004edc] transition-colors">Tên phòng luyện thi</Link>
                                <span className="mx-2">/</span>
                                <span className="text-[#004edc]">Đề thi thử toán THPTQG</span>
                            </div>

                            <div className="self-stretch flex flex-col items-start gap-6 text-xl text-[#004edc]">
                                <div className="flex flex-col items-start gap-3 text-base">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                                            <div className="font-semibold text-sm">Toán</div>
                                        </div>
                                        <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                                            <div className="font-semibold text-sm">Đề thi thử</div>
                                        </div>
                                    </div>
                                    <h1 className="text-[2rem] font-bold font-inter mt-2 leading-tight">ĐỀ THI THỬ TOÁN THPTQG</h1>
                                </div>

                                <ExamInfoTabs examId={id} examDuration={examDuration} />
                            </div>
                        </div>
                    </div>

                    {/* Right side: User Info Box */}
                    <div className="w-full lg:w-[400px] flex flex-col items-center justify-start text-[#004edc]">
                        <div className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 border border-blue-50">

                            <div className="self-stretch flex flex-col items-center gap-4">
                                <h2 className="font-bold text-lg text-[#92b8ff]">Thông tin thí sinh</h2>

                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF]">
                                        <span className="text-3xl text-[#004edc] font-bold">U1</span>
                                    </div>
                                    <b className="text-xl">User 1</b>
                                </div>

                                <div className="self-stretch h-[1px] bg-[#EAF2FF] w-full" />

                                <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-[280px] mx-auto">
                                    <div className="flex flex-col items-start gap-4 font-bold text-[#004edc]">
                                        <p>Họ và tên:</p>
                                        <p>Trình độ:</p>
                                        <p>Điểm mục tiêu:</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-4 text-right text-[#004edc] font-medium">
                                        <p>Nguyễn Văn A</p>
                                        <p>Lớp 12</p>
                                        <p>8.5/10</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start text-sm mt-2 w-full">
                                <Link href="/profile" className="w-full rounded-full bg-white border border-[#EAF2FF] text-[#92b8ff] hover:bg-[#F6FBFF] hover:border-[#004edc] hover:text-[#004edc] transition-colors flex items-center justify-center py-2.5 px-5 font-bold">
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
    );
}
