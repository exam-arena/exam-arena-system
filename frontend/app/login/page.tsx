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
      <Header />

      <AuthLayout>
        <div className="flex flex-col items-center gap-2 w-full">
          <h2 className="text-[20px] lg:text-[24px] font-bold leading-8 text-[#004EDC] text-center">
            Cùng ôn luyện nào!
          </h2>
          <p className="text-[#92B8FF] text-[14px] lg:text-[16px] leading-5 text-center">
            Chào mừng quay trở lại!
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col items-start gap-3 w-full max-w-86">
          {error && (
            <div className="w-full px-4 py-2 bg-red-50 border border-red-200 rounded-[12px] text-red-600 text-[13px] text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col items-start gap-3 w-full">
            <div className="flex flex-col items-start gap-1 w-full">
              <label htmlFor="login-identifier" className="text-[#004EDC] text-[16px] font-bold leading-6">
                Tài khoản
              </label>
              <Input
                id="login-identifier"
                placeholder="Nhập tên tài khoản.."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-4 bg-[#EDF3FF] rounded-num-30 border-none text-[12px] leading-6 text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>

            <div className="flex flex-col items-start gap-1 w-full">
              <label htmlFor="login-password" className="text-[#004EDC] text-[16px] font-bold leading-6">
                Mật khẩu
              </label>
              <Input
                id="login-password"
                type="password"
                placeholder="Nhập mật khẩu..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="w-full h-10 px-4 bg-[#EDF3FF] rounded-num-30 border-none text-[12px] leading-6 text-[#004EDC] placeholder:text-[#92B8FF] focus-visible:ring-1 focus-visible:ring-[#004EDC]"
              />
            </div>
          </div>

          <div className="flex justify-end items-center w-full">
            <span className="text-[#004EDC] text-[12px] leading-6 cursor-pointer hover:underline">
              Quên mật khẩu?
            </span>
          </div>

          <div className="flex flex-col items-center gap-2 w-full">
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex flex-row justify-center items-center py-2 px-4 gap-2 bg-[#FFE96F] hover:bg-[#FFD600] disabled:opacity-60 rounded-num-30 w-29.25 h-9 transition-colors"
            >
              <span className="text-[#004EDC] font-bold text-[16px] leading-4.75">
                {isSubmitting ? "Đang xử lý..." : "Đăng nhập"}
              </span>
            </Button>

            <p className="text-[12px] leading-6 text-[#92B8FF]">
              Chưa có tài khoản?{" "}
              <Link href="/register" className="text-[#004EDC] cursor-pointer hover:underline">
                Đăng ký ngay
              </Link>
            </p>
          </div>
        </form>
      </AuthLayout>

      <Footer />
    </div>
  );
}
