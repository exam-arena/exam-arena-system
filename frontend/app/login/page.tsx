"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/layout/Header";
import AuthLayout from "@/components/layout/AuthLayout";
import Footer from "@/components/layout/Footer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth/hooks";
import { ApiError } from "@/lib/api/client";

export default function LoginPage() {
  const { login, user, isLoading } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace("/home");
    }
  }, [isLoading, router, user]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Vui lòng nhập tài khoản và mật khẩu");
      return;
    }

    setIsSubmitting(true);
    try {
      await login(identifier, password);
      const params = new URLSearchParams(window.location.search);
      const redirectTo = params.get("from") || "/home";
      router.replace(redirectTo);
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
        <form onSubmit={handleSubmit} className="flex flex-col items-start gap-[12px] w-full max-w-[344px]">

          {/* Error Message */}
          {error && (
            <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-[13px] text-center">
              {error}
            </div>
          )}

          {/* Inputs Wrapper */}
          <div className="flex flex-col items-start gap-[12px] w-full">

            {/* Username */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="login-identifier" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Tài khoản
              </label>
              <Input
                id="login-identifier"
                placeholder="Nhập tên tài khoản.."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-[40px] px-4 bg-[#EDF3FF] rounded-[30px] border-none text-[12px] leading-[24px] text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col items-start gap-[4px] w-full">
              <label htmlFor="login-password" className="text-[#004EDC] text-[16px] font-bold leading-[24px]">
                Mật khẩu
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
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

          {/* Submit Actions */}
          <div className="flex flex-col items-center gap-[8px] w-full">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-row justify-center items-center py-[8px] px-[16px] gap-[8px] bg-[#FFE96F] hover:bg-[#FFD600] disabled:opacity-60 rounded-[30px] w-[117px] h-[36px] transition-colors"
            >
              <span className="text-[#004EDC] font-bold text-[16px] leading-[19px]">
                {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
              </span>
            </Button>

            <p className="text-[12px] leading-[24px] text-[#92B8FF]">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-[#004EDC] cursor-pointer hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </form>
      </AuthLayout>

      {/* Footer */}
      <Footer />

    </div>
  );
}
