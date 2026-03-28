"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import AuthLayout from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/hooks";
import { ApiError } from "@/lib/api/client";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [fullname, setFullname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!username.trim() || !email.trim() || !fullname.trim() || !password) {
      setError("Vui lòng điền đầy đủ thông tin");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu nhập lại không khớp");
      return;
    }

    if (password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự");
      return;
    }

    setIsSubmitting(true);
    try {
      await register({ username, email, password, fullname });
      router.push("/login");
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "NETWORK_ERROR") {
          setError("Không thể kết nối tới máy chủ");
        } else if (err.code === "TIMEOUT") {
          setError("Máy chủ phản hồi chậm. Vui lòng thử lại");
        } else {
          setError(err.message);
        }
      } else {
        setError("Đã xảy ra lỗi. Vui lòng thử lại");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

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
        <form onSubmit={handleSubmit} className="flex flex-col items-start gap-[12px] w-full max-w-[344px]">

          {/* Error Message */}
          {error && (
            <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-[13px] text-center">
              {error}
            </div>
          )}

          {/* Inputs Wrapper */}
          <div className="flex flex-col items-start gap-[12px] w-full">

            {/* Fullname */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="register-fullname" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Họ và tên
              </label>
              <Input
                id="register-fullname"
                placeholder="Nhập họ và tên..."
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Username */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="register-username" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Tên tài khoản
              </label>
              <Input
                id="register-username"
                placeholder="Nhập tên tài khoản..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Email */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="register-email" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Email
              </label>
              <Input
                id="register-email"
                type="email"
                placeholder="Nhập email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="register-password" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Mật khẩu
              </label>
              <Input
                id="register-password"
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Confirm Password */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="register-confirm-password" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Nhập lại mật khẩu
              </label>
              <Input
                id="register-confirm-password"
                type="password"
                placeholder="Nhập lại mật khẩu..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>
          </div>
        </form>

        {/* Submit Actions */}
        <div className="flex flex-col items-center gap-[8px] w-full">
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex flex-row justify-center items-center py-[8px] px-[16px] gap-[8px] bg-[#FFE96F] hover:bg-[#FFD600] disabled:opacity-60 rounded-[30px] w-auto h-[36px] transition-colors mt-2"
          >
            <span className="text-[#004EDC] font-bold text-[16px] leading-[19px]">
              {isSubmitting ? "Đang xử lý..." : "Đăng ký tài khoản"}
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
