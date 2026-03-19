"use client";

import Image from "next/image";

export default function CTA() {
    return (
        <section className="w-full py-6 sm:py-8 md:py-10 bg-white">
            <div className="max-w-[1248px] mx-auto px-4 sm:px-6">

                {/* Banner*/}
                <div className="relative w-full overflow-hidden rounded-2xl sm:rounded-3xl lg:rounded-[30px] md:aspect-[1248/200]">
                    {/* Background */}
                    <Image
                        src="/footer.png"
                        alt="CTA background"
                        fill
                        className="object-cover object-center"
                    />

                    {/* Overlay */}
                    <div className="absolute inset-0 bg-[#D7E5FF]/5" />

                    {/* Content */}
                    <div
                        className="relative z-10 flex flex-col md:flex-row items-center justify-center md:justify-between w-full h-full px-5 sm:px-8 md:px-12 lg:px-[96px] py-6 sm:py-8 md:py-[48px] gap-4 sm:gap-5 md:gap-6">
                        {/* Logo */}
                        <Image
                            src="/logo.png"
                            alt="Exam Arena"
                            width={337}
                            height={48}
                            className="object-contain shrink-0 w-[160px] sm:w-[200px] md:w-[260px] lg:w-[337px]"
                        />

                        {/* Text box */}
                        <div
                            className="bg-white/30 backdrop-blur-sm rounded-xl sm:rounded-2xl lg:rounded-[30px] px-4 py-3 sm:px-6 sm:py-4 flex flex-col items-center md:items-start gap-1.5 sm:gap-2 text-center md:text-left w-full md:w-auto md:max-w-[555px]">
                            <h3 className="text-base sm:text-xl md:text-2xl lg:text-[32px] font-bold text-[#004EDC] leading-tight">
                                THI THỬ SỚM - LỢI THẾ SỚM
                            </h3>

                            <p className="text-xs sm:text-sm md:text-base text-[#004EDC]">
                                Tham gia ôn luyện, đăng ký thi thử để sẵn sàng cho kì thi sắp tới!
                            </p>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    );
}