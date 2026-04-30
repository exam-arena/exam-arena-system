"use client";

import Image from "next/image";
import { Facebook, Youtube, Mail, Instagram } from "lucide-react";

export default function Footer() {
    return (
        <footer className="relative w-full overflow-hidden">

            {/* Background */}
            <Image
                src="/footer.png"
                alt="footer background"
                fill
                className="object-cover"
                priority
            />

            {/* Overlay */}
            <div className="absolute inset-0 bg-[#0050E2]/80" />

            {/* Content */}
            <div
                className="relative z-10 max-w-360 mx-auto px-4 sm:px-6 md:px-24 py-8 sm:py-10 md:py-12 text-white"
            >

                {/* Top */}
                <div className="flex flex-col md:flex-row md:justify-between gap-6">

                    {/* Left */}
                    <div className="text-center md:text-left">
                        <Image
                            src="/logoamban.png"
                            alt="Exam Arena"
                            width={190}
                            height={50}
                            className="object-contain w-35 sm:w-40 md:w-45 mx-auto md:mx-0 mb-2"
                        />

                        <p className="text-lg sm:text-lg font-semibold mt-3 mb-3 uppercase">
                            HỆ THỐNG LUYỆN THI THPT QUỐC GIA
                        </p>

                        <div className="space-y-1 text-xs sm:text-sm opacity-90">
                            <p>Facebook:</p>
                            <p>Gmail:</p>
                            <p>Website:</p>
                        </div>
                    </div>

                </div>

                {/* Divider */}
                <div className="border-t border-white/40 my-6" />

                {/* Bottom */}
                <div className="flex flex-col md:flex-row items-center justify-between gap-4">

                    <p className="text-xs sm:text-sm opacity-80 text-center md:text-left">
                        Copyright by @ExamArena
                    </p>

                    {/* Social */}
                    <div className="flex items-center gap-4">
                        <Facebook className="size-5 cursor-pointer hover:opacity-80" />
                        <Youtube className="size-5 cursor-pointer hover:opacity-80" />
                        <Mail className="size-5 cursor-pointer hover:opacity-80" />
                        <Instagram className="size-5 cursor-pointer hover:opacity-80" />
                    </div>

                </div>
            </div>
        </footer>
    );
}