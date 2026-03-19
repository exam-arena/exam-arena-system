"use client";

import Link from "next/link";
import Header from "@/components/layout/Header";
import AuthLayout from "@/components/layout/AuthLayout";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="w-full min-h-screen bg-white flex flex-col">

      {/* Header */}
      <Header />

      {/* Hero */}
      <AuthLayout>
        {/* Title */}
        <div className="flex flex-col items-center gap-[8px] w-full">
          <h2 className="text-[20px] lg:text-[24px] font-bold leading-[32px] text-[#004EDC] text-center">
            Cùng ôn luyện nào!
          </h2>
          <p className="text-[#92B8FF] text-[14px] lg:text-[16px] leading-[20px] text-center">
            Chào mừng quay trở lại!
          </p>
        </div>

        {/* Form Content */}
        <div className="flex flex-col items-start gap-[12px] w-full max-w-[344px]">
          
          {/* Inputs Wrapper */}
          <div className="flex flex-col items-start gap-[12px] w-full">
            
            {/* Username */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Tài khoản
              </label>
              <Input
                placeholder="Nhập tên tài khoản.."
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
          </div>

          {/* Remember / Forgot Password */}
          <div className="flex justify-between items-center w-full">
            <label className="flex items-center gap-[8px] cursor-pointer group">
              <div className="flex items-center justify-center w-[20px] h-[20px] rounded-[4px] border-[2px] border-[#EDF3FF] overflow-hidden bg-white">
                <input type="checkbox" className="w-[14px] h-[14px] accent-[#004EDC] cursor-pointer" />
              </div>
              <span className="text-[#92B8FF] text-[12px] leading-[24px] group-hover:text-[#004EDC] transition-colors">
                Ghi nhớ mật khẩu
              </span>
            </label>

            <span className="text-[#004EDC] text-[12px] leading-[24px] cursor-pointer hover:underline">
              Quên mật khẩu?
            </span>
          </div>

        </div>

        {/* Submit Actions */}
        <div className="flex flex-col items-center gap-[8px] w-full">
          <Button className="flex flex-row justify-center items-center py-[8px] px-[16px] gap-[8px] bg-[#FFE96F] hover:bg-[#FFD600] rounded-[30px] w-[117px] h-[36px] transition-colors">
            <span className="text-[#004EDC] font-bold text-[16px] leading-[19px]">
              Đăng nhập
            </span>
          </Button>

          <p className="text-[12px] leading-[24px] text-[#92B8FF]">
            Chưa có tài khoản?{" "}
            <Link href="/register" className="text-[#004EDC] cursor-pointer hover:underline">
              Đăng ký ngay
            </Link>
          </p>
        </div>
      </AuthLayout>

      {/* Footer */}
      <Footer />

    </div>
  );
}