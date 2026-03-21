import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Banner from "@/components/sections/Banner";
import Link from "next/link";

export default async function ExamResultPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    // Mock data based on Figma
    const mockUser = {
        name: "Nguyễn Văn A",
        level: "Lớp 12",
        targetScore: "8.5/10",
        avatar: "U1",
    };

    const mockResult = {
        score: "8.0",
        message: "Mức điểm khá ổn, hãy cố gắng hơn nữa nhé!",
        correct: 32,
        wrong: 8,
        skipped: 10,
    };

    return (
        <main className="min-h-screen bg-white flex flex-col mx-auto max-w-[1920px] font-roboto">
            <Header />

            {/* Main Content Area */}
            <div className="bg-[#F6FBFF] w-full overflow-hidden flex justify-center py-8 md:py-12 px-4 shadow-sm border-t border-[#EAF2FF] flex-grow">
                <div className="w-full max-w-[1248px] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8 justify-center">

                    {/* Left side: Exam Result */}
                    <div className="w-full overflow-hidden flex flex-col items-start gap-8 md:gap-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
                        
                        {/* Breadcrumb & Title */}
                        <div className="self-stretch flex flex-col items-start gap-6">
                            <div className="flex flex-wrap items-center justify-start text-[#92b8ff] font-medium text-sm gap-2">
                                <Link href="/" className="hover:text-[#004edc] transition-colors">Trang chủ</Link>
                                <span>/</span>
                                <Link href="/rooms/1" className="hover:text-[#004edc] transition-colors">Đề thi tuyển chọn</Link>
                                <span>/</span>
                                <span className="text-[#004edc]">Đề thi thử toán THPTQG</span>
                            </div>

                            <div className="self-stretch flex flex-col items-start gap-6 text-[#004edc]">
                                <div className="flex flex-col items-start gap-3">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                                            <span className="font-semibold text-sm">Toán</span>
                                        </div>
                                        <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                                            <span className="font-semibold text-sm">Đề thi thử</span>
                                        </div>
                                    </div>
                                    <h1 className="text-[2rem] md:text-[2.5rem] font-bold font-inter mt-2 leading-tight tracking-tight uppercase">
                                        ĐỀ THI THỬ TOÁN THPTQG
                                    </h1>
                                </div>

                                {/* Tabs Navigation (Static map from Figma) */}
                                <div className="flex flex-wrap items-center gap-3 text-sm md:text-base font-medium">
                                    <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-2.5 px-6 shadow-sm">
                                        Kết quả đề thi
                                    </div>
                                    <Link href={`/exams/${id}`} className="rounded-full bg-white border border-[#92b8ff] text-[#92b8ff] hover:border-[#004edc] hover:text-[#004edc] transition-colors flex items-center justify-center py-2.5 px-6">
                                        Đáp án tham khảo
                                    </Link>
                                    <div className="rounded-full bg-white border border-[#92b8ff] text-[#92b8ff] transition-colors flex items-center justify-center py-2.5 px-6 cursor-not-allowed opacity-70">
                                        Lịch sử làm bài
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Score Section */}
                        <div className="flex flex-col items-start gap-2">
                            <div className="text-5xl md:text-6xl font-bold text-[#004edc] tracking-tighter">
                                {mockResult.score} <span className="text-3xl tracking-normal text-[#92b8ff]">điểm</span>
                            </div>
                            <div className="text-base text-[#92b8ff] mt-2 font-medium">
                                {mockResult.message}
                            </div>
                        </div>

                        {/* Detail Stats */}
                        <div className="flex flex-col items-start gap-4 w-full">
                            <h3 className="text-xl font-bold text-[#004edc]">Chi tiết bài làm</h3>
                            <div className="w-full max-w-[445px] flex flex-col gap-3 text-lg font-medium text-[#004edc]">
                                <div className="flex justify-between items-center py-2 border-b border-[#EAF2FF]">
                                    <span className="text-[#92b8ff]">Số câu đúng:</span>
                                    <span className="text-[#004edc] text-xl font-bold">{mockResult.correct}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#EAF2FF]">
                                    <span className="text-[#92b8ff]">Số câu sai:</span>
                                    <span className="text-[#004edc] text-xl font-bold">{mockResult.wrong}</span>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-[#EAF2FF]">
                                    <span className="text-[#92b8ff]">Số câu bỏ qua:</span>
                                    <span className="text-[#004edc] text-xl font-bold">{mockResult.skipped}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center gap-4 mt-4">
                            <button className="rounded-full bg-[#004edc] text-white font-bold hover:bg-[#003bb5] transition-transform hover:-translate-y-1 active:scale-95 flex items-center justify-center py-3 px-8 shadow-md">
                                Làm lại bài thi
                            </button>
                            <Link href="/rooms/1" className="rounded-full bg-white border border-[#EAF2FF] text-[#004edc] font-bold hover:border-[#004edc] hover:bg-[#F6FBFF] hover:-translate-y-1 transition-all flex items-center justify-center py-3 px-8 shadow-sm">
                                Quay về phòng thi
                            </Link>
                        </div>

                    </div>

                    {/* Right side: User Info Box */}
                    <div className="w-full lg:w-[400px] flex flex-col items-center justify-start text-[#004edc] animate-in fade-in slide-in-from-right-8 duration-700 delay-150 ease-out fill-mode-both">
                        <div className="w-full shadow-[0px_2px_8px_rgba(146,_184,_255,_0.2)] hover:shadow-[0px_4px_16px_rgba(146,_184,_255,_0.3)] transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 relative overflow-hidden">
                            {/* Decorative background shape */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-[#F6FBFF] rounded-bl-[100px] -z-10" />

                            <div className="self-stretch flex flex-col items-center gap-4 z-10">
                                <h2 className="font-bold text-lg text-[#92b8ff]">Thông tin thí sinh</h2>

                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF] shadow-inner">
                                        <span className="text-3xl text-[#004edc] font-bold">{mockUser.avatar}</span>
                                    </div>
                                    <b className="text-xl">{mockUser.name}</b>
                                </div>

                                <div className="self-stretch h-[1px] bg-[#EAF2FF] w-full my-2" />

                                <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-[280px] mx-auto">
                                    <div className="flex flex-col items-start gap-4 font-bold text-[#004edc]">
                                        <p>Họ và tên:</p>
                                        <p>Trình độ:</p>
                                        <p>Điểm mục tiêu:</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-4 text-right text-[#004edc] font-medium">
                                        <p>{mockUser.name}</p>
                                        <p>{mockUser.level}</p>
                                        <p>{mockUser.targetScore}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-start text-sm mt-2 w-full z-10">
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
