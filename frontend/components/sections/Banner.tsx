import Image from "next/image";

export default function Banner() {
    return (
        <section
            className="w-full relative overflow-hidden flex flex-col items-center justify-center bg-cover bg-no-repeat bg-center shadow-inner"
            style={{ backgroundImage: "url('/herosection.png')" }}
        >
            <div className="w-full h-[220px] sm:h-[240px] md:h-[280px]" />
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6 py-4">
                <div className="flex flex-col items-center gap-3 sm:gap-6">
                    <div className="flex flex-col items-center gap-1.5 sm:gap-3">
                        <Image
                            src="/logo.png"
                            alt="Exam Arena Logo"
                            width={450}
                            height={64}
                            className="w-[200px] sm:w-[300px] md:w-[450px] h-auto object-contain"
                            priority
                        />
                        <h2 className="text-base sm:text-xl md:text-[1.75rem] font-bold text-[#004edc] font-roboto tracking-wide">
                            HỆ THỐNG LUYỆN THI THPTQG
                        </h2>
                    </div>
                    <p className="text-sm sm:text-base md:text-[1.25rem] text-[#004edc] font-medium font-roboto max-w-2xl px-2">
                        Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật
                    </p>
                </div>
            </div>
        </section>
    );
}
