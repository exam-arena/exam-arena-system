import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative w-full min-h-150 flex items-center justify-center overflow-hidden">
      {/* Background Layer */}
      <Image
        src="/herosection.png"
        alt="Background"
        fill
        className="object-cover"
        priority
      />
      <div className="absolute inset-0 bg-white/30" />

      {/* Main Content Layout */}
      <div className="relative z-10 w-full max-w-360 mx-auto px-4 lg:px-24 flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-6 py-10 lg:py-6 min-h-154.75">

        {/* CỘT TRÁI: Dùng chung (Logo & Intro Text) */}
        <div className="flex flex-col items-center justify-center text-center w-full lg:w-153 lg:h-142.75">
          <div className="flex flex-col items-center gap-3 w-full max-w-106.5">
            <Image
              src="/logo.png"
              alt="Logo"
              width={338}
              height={48}
              className="w-70 lg:w-84.5"
            />
            <h3 className="text-[#004EDC] font-bold text-[18px] lg:text-[20px] leading-5.75">
              HỆ THỐNG LUYỆN THI THPTQG
            </h3>
            <p className="text-[#004EDC] text-[14px] lg:text-[16px] leading-4.75 lg:whitespace-nowrap">
              Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: Linh động thay đổi tùy trang (Login Form, Register Form,...) */}
        <div className="flex flex-col items-center justify-center w-full lg:w-153 lg:min-h-142.75">
          <div className="flex flex-col items-center p-8 lg:p-12 gap-6 w-full max-w-110 bg-white rounded-num-30 shadow-[0px_2px_8px_rgba(0,78,220,0.2)]">
            {children}
          </div>
        </div>

      </div>
    </section>
  );
}
