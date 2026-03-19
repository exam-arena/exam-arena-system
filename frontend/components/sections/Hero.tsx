import Image from "next/image";

export default function Hero() {
    return (
        <section className="relative w-full bg-no-repeat bg-cover bg-[center_top] sm:bg-center" style={{ backgroundImage: "url('/herosection.png')" }}>
            <div className="w-full h-[260px] sm:h-[320px] md:h-auto md:aspect-[1440/460]" />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 sm:px-6">
                <Image
                    src="/logo.png"
                    alt="examArena"
                    width={500}
                    height={80}
                    priority
                    className="w-[200px] sm:w-[300px] md:w-[400px] lg:w-[500px] h-auto mb-3 sm:mb-4 md:mb-5"
                />

                <h2 className="text-sm sm:text-base md:text-xl lg:text-2xl font-extrabold text-[#004EDC] tracking-wider uppercase mb-1.5 sm:mb-2 md:mb-3">
                    Hệ thống luyện thi THPTQG
                </h2>

                <p className="text-[11px] sm:text-sm md:text-base lg:text-lg text-[#004EDC] font-medium italic">
                    Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật
                </p>
            </div>
        </section>
    );
}
