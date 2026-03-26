import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Banner from "@/components/sections/Banner";
import Link from "next/link";
import data from "@/data.json";

// Hàm mock trả về dữ liệu kết quả (Sau này thay bằng fetch API /api/attempts/:id/result)
async function fetchResultData(attemptId: string) {
    const attempt = data.exam_attempts.find(a => a.attempt_id === attemptId) || data.exam_attempts[0];
    const exam = data.exams.find(e => e.exam_id === attempt.exam_id) || data.exams[0];
    const user = data.users.find(u => u.user_id === attempt.user_id) || data.users[0];
    const room = data.exam_rooms.find(r => r.room_id === exam.room_id) || data.exam_rooms[0];

    // Giả lập tính toán đúng sai từ attempt logs
    let correct = 0, wrong = 0, skipped = 0;
    if (attempt && attempt.section_logs) {
        attempt.section_logs.forEach((sec: any) => {
            sec.details.forEach((detail: any) => {
                if (!detail.selected_ans) skipped++;
                else if (detail.is_correct) correct++;
                else wrong++;
            });
        });
    } else {
        correct = 32; wrong = 8; skipped = 10;
    }

    return {
        user: {
            username: user.username,
            fullname: user.fullname,
            email: user.email,
            role: user.role
        },
        exam: {
            title: exam.title,
            type: exam.type,
        },
        room: {
            id: room.room_id,
            name: room.name
        },
        result: {
            score: attempt.marks ? attempt.marks.toString() : "8.0",
            message: "Mức điểm khá ổn, hãy cố gắng hơn nữa nhé!",
            correct,
            wrong,
            skipped
        }
    };
}

export default async function ExamResultPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    const { user: mockUser, exam, room, result: mockResult } = await fetchResultData(id);

    return (
        <main className="min-h-screen bg-white flex flex-col w-full font-roboto">
            <Header />

            {/* Main Content Area */}
            <div className="bg-[#F6FBFF] w-full overflow-hidden py-12 shadow-sm border-t border-blue-50 flex-grow">
                <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px] grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 lg:gap-8">

                    {/* Left side: Exam Result */}
                    <div className="w-full overflow-hidden flex flex-col items-start gap-12">

                        <div className="self-stretch flex flex-col items-start gap-6">

                            {/* Breadcrumb */}
                            <div className="flex items-center justify-start text-[#92b8ff] font-medium text-sm">
                                <Link href="/" className="hover:text-[#004edc] transition-colors">Trang chủ</Link>
                                <span className="mx-2">/</span>
                                <Link href={`/rooms/${room.id}`} className="hover:text-[#004edc] transition-colors uppercase">{room.name}</Link>
                                <span className="mx-2">/</span>
                                <span className="text-[#004edc] uppercase">{exam.title}</span>
                            </div>

                            <div className="self-stretch flex flex-col items-start gap-6 text-xl text-[#004edc]">
                                {/* Title and tags */}
                                <div className="flex flex-col items-start gap-3 text-base">
                                    <div className="flex items-start gap-3">
                                        <div className="rounded-full bg-[#EAF2FF] text-[#004edc] flex items-center justify-center py-1 px-4">
                                            <div className="font-semibold text-sm capitalize">{exam.type.replace('_', ' ')}</div>
                                        </div>
                                    </div>
                                    <h1 className="text-[2rem] font-bold font-inter mt-2 leading-tight uppercase">{exam.title}</h1>
                                </div>

                                {/* Tabs Navigation (Mirror ExamInfoTabs style) */}
                                <div className="flex flex-wrap items-center gap-3 w-full">
                                    <div className="rounded-[30px] border border-transparent bg-[#e7f0ff] text-[#0050e2] py-[0.5rem] px-[1.25rem] text-[1rem] leading-[1.75rem] font-bold flex items-center justify-center">
                                        Kết quả đề thi
                                    </div>
                                    <Link href={`/attempts/${id}/review`} className="rounded-[30px] border border-[#92b8ff] bg-white text-[#92b8ff] hover:bg-[#F6FBFF] hover:border-[#0050e2] hover:text-[#0050e2] transition-colors py-[0.5rem] px-[1.25rem] text-[1rem] leading-[1.75rem] font-normal flex items-center justify-center">
                                        Đáp án tham khảo
                                    </Link>
                                </div>
                            </div>
                        </div>

                        {/* Result Content */}
                        <div className="flex flex-col items-start gap-10 mt-2 w-full">
                            {/* Score Section */}
                            <div className="flex flex-col items-start gap-2">
                                <div className="text-[2.25rem] font-bold font-roboto text-[#004edc]">
                                    {mockResult.score} điểm
                                </div>
                                <div className="text-[1rem] text-[#92b8ff]">
                                    {mockResult.message}
                                </div>
                            </div>

                            {/* Detail Stats */}
                            <div className="flex flex-col items-start gap-3 w-full sm:w-[27.813rem]">
                                <b className="text-[1.25rem] text-[#004edc]">Chi tiết bài làm</b>
                                <div className="flex flex-col items-start gap-2 text-[1.25rem] w-full text-[#004edc]">
                                    <div className="relative flex items-center gap-2">
                                        <span>Số câu đúng: </span>
                                        <b className="font-bold">{mockResult.correct}</b>
                                    </div>
                                    <div className="relative flex items-center gap-2">
                                        <span>Số câu sai: </span>
                                        <b className="font-bold">{mockResult.wrong}</b>
                                    </div>
                                    <div className="relative flex items-center gap-2">
                                        <span>Số câu bỏ qua: </span>
                                        <b className="font-bold">{mockResult.skipped}</b>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-start gap-3 mt-2">
                                <button className="rounded-[30px] bg-[#0050e2] hover:bg-[#004edc] transition-colors overflow-hidden flex items-center justify-center py-[0.5rem] px-[1rem] text-white">
                                    <b className="relative text-[1rem]">Làm lại bài thi</b>
                                </button>
                                <Link href={`/rooms/${room.id}`} className="rounded-[30px] bg-white border-[#92b8ff] border-solid border-[1px] hover:border-[#0050e2] hover:text-[#0050e2] overflow-hidden flex items-center justify-center py-[0.5rem] px-[1rem] text-[#92b8ff] transition-colors">
                                    <div className="relative text-[1rem] font-bold">Quay về {room.name}</div>
                                </Link>
                            </div>
                        </div>

                    </div>

                    {/* Right side: User Info Box (Identical to ExamInfo page) */}
                    <div className="w-full lg:w-[400px] flex flex-col items-center justify-start text-[#004edc]">
                        <div className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 border border-blue-50">

                            <div className="self-stretch flex flex-col items-center gap-4">
                                <h2 className="font-bold text-lg text-[#92b8ff]">Thông tin thí sinh</h2>

                                <div className="flex flex-col items-center gap-3">
                                    <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF]">
                                        <span className="text-3xl text-[#004edc] font-bold">
                                            {mockUser.fullname.charAt(0).toUpperCase()}
                                        </span>
                                    </div>
                                    <b className="text-xl">{mockUser.username}</b>
                                </div>

                                <div className="self-stretch h-[1px] bg-[#EAF2FF] w-full" />

                                <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-[280px] mx-auto">
                                    <div className="flex flex-col items-start gap-4 font-bold text-[#004edc]">
                                        <p>Họ và tên:</p>
                                        <p>Email:</p>
                                        <p>Vai trò:</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-4 text-right text-[#004edc] font-medium">
                                        <p>{mockUser.fullname}</p>
                                        <p className="truncate max-w-[150px]" title={mockUser.email}>{mockUser.email}</p>
                                        <p className="capitalize">{mockUser.role === 'student' ? 'Học sinh' : 'Quản trị viên'}</p>
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
