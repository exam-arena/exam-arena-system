"use client";

import { useEffect, useState } from "react";

interface CountdownProps {
    /**
     * Thời gian kết thúc đếm ngược.
     * Admin có thể truyền vào dưới dạng string (ISO 8601) hoặc Date object.
     * Ví dụ: "2026-06-25T00:00:00+07:00"
     */
    targetDate?: string | Date;
}

export default function Countdown({
    targetDate = "2026-06-11T00:00:00+07:00"
}: CountdownProps) {
    const [isMounted, setIsMounted] = useState(false);
    const [timeLeft, setTimeLeft] = useState({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
    });

    useEffect(() => {
        setIsMounted(true);

        const calculateTimeLeft = () => {
            const difference = new Date(targetDate).getTime() - new Date().getTime();

            if (difference > 0) {
                setTimeLeft({
                    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    minutes: Math.floor((difference / 1000 / 60) % 60),
                    seconds: Math.floor((difference / 1000) % 60),
                });
            } else {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            }
        };

        calculateTimeLeft();
        const timer = setInterval(calculateTimeLeft, 1000);

        return () => clearInterval(timer);
    }, [targetDate]);

    // Hàm thêm số 0 ở trước nếu số nhỏ hơn 10
    const formatNumber = (num: number) => num.toString().padStart(2, "0");

    const countdownItems = [
        { label: "NGÀY", value: isMounted ? formatNumber(timeLeft.days) : "00" },
        { label: "GIỜ", value: isMounted ? formatNumber(timeLeft.hours) : "00" },
        { label: "PHÚT", value: isMounted ? formatNumber(timeLeft.minutes) : "00" },
        { label: "GIÂY", value: isMounted ? formatNumber(timeLeft.seconds) : "00" },
    ];

    return (
        <div className="w-full bg-[#F6FBFF] flex flex-col items-center py-10 px-4 md:px-24 gap-8 text-center font-[Roboto]">
            {/* Title */}
            <div className="flex flex-col items-center gap-1">
                <h2 className="text-2xl sm:text-3xl md:text-[36px] font-bold text-[#004EDC] leading-tight">
                    ĐẾM NGƯỢC NGÀY THI
                </h2>
                <p className="text-sm sm:text-base md:text-lg text-[#92B8FF] font-medium mt-1">
                    Cùng cố gắng đạt mục tiêu nhé!
                </p>
            </div>

            {/* Countdown grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-6 md:gap-8">
                {countdownItems.map((item) => (
                    <div
                        key={item.label}
                        className="flex flex-col items-center gap-3 w-[120px] sm:w-[140px] md:w-[160px]"
                    >
                        <span className="text-base sm:text-lg md:text-xl font-bold text-[#004EDC]">
                            {item.label}
                        </span>

                        <div className="w-[110px] h-[110px] sm:w-[130px] sm:h-[130px] md:w-[160px] md:h-[160px] bg-white rounded-[24px] md:rounded-[32px] shadow-[0_8px_30px_rgb(0,78,220,0.08)] flex items-center justify-center text-[40px] sm:text-[52px] md:text-[64px] font-black text-[#004EDC] tracking-tight">
                            {item.value}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}