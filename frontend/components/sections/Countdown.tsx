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

function buildTimeLeft(targetDate: string | Date) {
  const difference = new Date(targetDate).getTime() - Date.now();

  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
  };
}

export default function Countdown({
  targetDate = "2026-06-11T00:00:00+07:00",
}: CountdownProps) {
  const [timeLeft, setTimeLeft] = useState(() => buildTimeLeft(targetDate));

  useEffect(() => {
    const updateCountdown = () => {
      setTimeLeft(buildTimeLeft(targetDate));
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  const formatNumber = (num: number) => num.toString().padStart(2, "0");

  const countdownItems = [
    { label: "NGÀY", value: formatNumber(timeLeft.days) },
    { label: "GIỜ", value: formatNumber(timeLeft.hours) },
    { label: "PHÚT", value: formatNumber(timeLeft.minutes) },
    { label: "GIÂY", value: formatNumber(timeLeft.seconds) },
  ];

  return (
    <div className="flex w-full flex-col items-center gap-8 bg-[#F6FBFF] px-4 py-10 text-center font-[Roboto] md:px-24">
      <div className="flex flex-col items-center gap-1">
        <h2 className="text-2xl font-bold leading-tight text-[#004EDC] sm:text-3xl md:text-[36px]">
          ĐẾM NGƯỢC NGÀY THI
        </h2>
        <p className="mt-1 text-sm font-medium text-[#92B8FF] sm:text-base md:text-lg">
          Cùng cố gắng đạt mục tiêu nhé!
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 sm:grid-cols-4 md:gap-8">
        {countdownItems.map((item) => (
          <div
            key={item.label}
            className="flex w-[120px] flex-col items-center gap-3 sm:w-[140px] md:w-[160px]"
          >
            <span className="text-base font-bold text-[#004EDC] sm:text-lg md:text-xl">
              {item.label}
            </span>

            <div className="flex h-[110px] w-[110px] items-center justify-center rounded-[24px] bg-white text-[40px] font-black tracking-tight text-[#004EDC] shadow-[0_8px_30px_rgb(0,78,220,0.08)] sm:h-[130px] sm:w-[130px] sm:text-[52px] md:h-[160px] md:w-[160px] md:rounded-[32px] md:text-[64px]">
              {item.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
