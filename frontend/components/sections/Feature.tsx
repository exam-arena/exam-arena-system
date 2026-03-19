import { Card, CardContent } from "@/components/ui/card";

const features = [
    "Đúng chuẩn\ncấu trúc đề thi",
    "Phân bố\ntheo 4 mức độ",
    "Câu hỏi chọn lọc\nphân bố rõ ràng",
    "Bám sát\ntrọng tâm",
];

export default function Feature() {
    return (
        <section className="w-full bg-[#F6FBFF] py-10 md:py-14">
            <div className="max-w-[1100px] mx-auto px-4 sm:px-6 text-center">

                {/* Title */}
                <h2 className="text-xl md:text-2xl lg:text-[1.7rem] font-extrabold text-[#004EDC] uppercase mb-3">
                    Hệ thống luyện thi tiêu chuẩn
                </h2>

                {/* Subtitle */}
                <p className="text-sm md:text-base text-[#92B8FF] mb-8 md:mb-10">
                    Bám sát các dạng đề các năm của Bộ giáo dục và Đào tạo
                </p>

                {/* Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                    {features.map((text) => (
                        <Card
                            key={text}
                            className="h-[100px] md:h-[110px] w-full rounded-xl bg-[#004EDC] border-none shadow-md shadow-blue-500/15 transition-all duration-200 hover:-translate-y-1 hover:shadow-blue-500/30 flex items-center justify-center">
                            <CardContent
                                className="p-4 text-xs md:text-sm font-bold uppercase tracking-wide text-center leading-snug whitespace-pre-line text-white">
                                {text}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
}