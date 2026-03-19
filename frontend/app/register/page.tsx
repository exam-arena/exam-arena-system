"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthLayout from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function RegisterPage() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col">
      <Header />

      <AuthLayout>
        {/* Title */}
        <div className="flex flex-col items-center gap-[8px] w-full">
          <h2 className="text-[20px] lg:text-[24px] font-bold leading-[32px] text-[#004EDC] text-center">
            Chào mừng bạn!
          </h2>
          <p className="text-[#92B8FF] text-[14px] lg:text-[16px] leading-[20px] text-center">
            Cùng ôn luyện ngay với Exam Arena
          </p>
        </div>

        {/* Form Content */}
        <div className="flex flex-col items-start gap-[12px] w-full max-w-[344px]">

          {/* Inputs Wrapper */}
          <div className="flex flex-col items-start gap-[12px] w-full">

            {/* Username / Email */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Email hoặc Tài khoản
              </label>
              <Input
                placeholder="Nhập email hoặc tên tài khoản..."
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Mật khẩu
              </label>
              <Input
                type="password"
                placeholder="Nhập mật khẩu..."
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Nhập lại mật khẩu
              </label>
              <Input
                type="password"
                placeholder="Nhập lại mật khẩu..."
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex flex-col items-center gap-[8px] w-full">
          <Button className="flex flex-row justify-center items-center py-[8px] px-[16px] gap-[8px] bg-[#FFE96F] hover:bg-[#FFD600] rounded-[30px] w-auto h-[36px] transition-colors mt-2">
            <span className="text-[#004EDC] font-bold text-[16px] leading-[19px]">
              Đăng ký tài khoản
            </span>
          </Button>

          <p className="text-[12px] leading-[24px] text-[#92B8FF]">
            Đã có tài khoản?{" "}
            <Link href="/login" className="text-[#004EDC] cursor-pointer hover:underline">
              Đăng nhập ngay
            </Link>
          </p>
        </div>
      </AuthLayout>

      <Footer />
    </div>
  );
}
