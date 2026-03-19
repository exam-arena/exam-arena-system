import Image from "next/image";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="relative w-full min-h-[600px] flex items-center justify-center overflow-hidden">
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
      <div className="relative z-10 w-full max-w-[1440px] mx-auto px-4 lg:px-[96px] flex flex-col lg:flex-row items-center justify-between gap-8 lg:gap-[24px] py-10 lg:py-[24px] min-h-[619px]">

        {/* CỘT TRÁI: Dùng chung (Logo & Intro Text) */}
        <div className="flex flex-col items-center justify-center text-center w-full lg:w-[612px] lg:h-[571px]">
          <div className="flex flex-col items-center gap-[12px] w-full max-w-[426px]">
            <Image
              src="/logo.png"
              alt="Logo"
              width={338}
              height={48}
              className="w-[280px] lg:w-[338px]"
            />
            <h3 className="text-[#004EDC] font-bold text-[18px] lg:text-[20px] leading-[23px]">
              HỆ THỐNG LUYỆN THI THPTQG
            </h3>
            <p className="text-[#004EDC] text-[14px] lg:text-[16px] leading-[19px]">
              Tổng duyệt trước kỳ thi thật - Biết điểm thật - Tăng điểm thật
            </p>
          </div>
        </div>

        {/* CỘT PHẢI: Linh động thay đổi tùy trang (Login Form, Register Form,...) */}
        <div className="flex flex-col items-center justify-center w-full lg:w-[612px] lg:h-[571px]">
          <div className="flex flex-col items-center p-8 lg:p-[48px] gap-[24px] w-full max-w-[440px] bg-white rounded-[30px] shadow-[0px_2px_8px_rgba(0,78,220,0.2)]">
            {children}
          </div>
        </div>

      </div>
    </section>
  );
}
