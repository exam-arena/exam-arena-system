"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, Menu, ChevronDown, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Image from "next/image";
import { useAuth } from "@/lib/auth/hooks";

export default function Header() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const isLoggedIn = !!user;
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
      router.refresh();
    } catch {
      window.alert("Khong the dang xuat. Vui long thu lai.");
    }
  };

  const navLinks = useMemo(() => [
    { label: "Trang chủ", href: isLoggedIn ? "/home" : "/" },
    { label: "Phòng luyện thi", href: "/rooms" },
    { label: "Đề thi", href: "/exams" },
    { label: "Tài liệu tham khảo", href: "/documents" },
  ], [isLoggedIn]);

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0050E2] h-[5rem] overflow-hidden">
      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex items-center justify-between h-full px-[6rem] max-w-[1920px] mx-auto gap-[1.5rem]">

        {/* Logo */}
        <Link href="/" className="flex flex-col shrink-0 items-center justify-center p-[0.625rem] w-[11.75rem]">
          <div className="flex flex-col items-center justify-center gap-[0.25rem]">
            <Image
              src="/logoamban.png"
              alt="Exam Arena"
              width={168}
              height={24}
              priority
              className="w-[10.5rem] relative max-h-full object-cover"
            />
            <span className="text-[0.625rem] text-white font-medium tracking-widest uppercase leading-[0.875rem] mt-1">
              Hệ thống luyện thi THPTQG
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center justify-center gap-[2.5rem] h-[1.25rem] text-[1rem] font-bold text-white">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="flex items-center justify-center hover:text-[#FFD600] transition-colors">
              <span className="leading-[1.25rem] whitespace-nowrap">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center justify-end gap-[0.75rem] w-[25rem]">

          {/* Search Bar - Hiện ở cả 2 trạng thái */}
          <div className="relative flex items-center h-[2.25rem] w-[16.938rem] rounded-[30px] bg-white/20 px-[1rem] gap-[0.25rem] shrink-0 overflow-hidden">
            <Search className="size-[1.25rem] text-white/70 shrink-0" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="w-full bg-transparent border-none text-[0.875rem] text-white placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-full placeholder:font-normal font-normal"
            />
          </div>

          {/* Conditional Auth Block */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="h-[2.25rem] rounded-[30px] bg-white/20 border border-white box-border flex items-center justify-center py-[0.5rem] px-[0.75rem] gap-[0.5rem] shrink-0 cursor-pointer hover:bg-white/30 transition-colors group"
                >
                  <div className="flex items-center gap-[0.35rem] shrink-0">
                    <div className="size-[1.5rem] bg-white/30 rounded-full flex items-center justify-center overflow-hidden">
                      <User className="size-[1rem] text-white" />
                    </div>
                    <span className="text-[1rem] text-white font-medium pl-1 pr-1">{user.fullname}</span>
                  </div>
                  <ChevronDown className="size-[1.2rem] text-white group-hover:translate-y-[2px] transition-transform" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem>Thông tin cá nhân</DropdownMenuItem>
                <DropdownMenuItem>Lịch sử thi</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onSelect={(event) => {
                    event.preventDefault();
                    handleLogout();
                  }}
                  className="text-red-600 focus:text-red-600"
                >
                  Đăng xuất
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button asChild className="h-[2.25rem] px-[1.5rem] rounded-[30px] bg-[#FFD600] text-[1rem] font-semibold text-gray-900 hover:bg-[#FFE44D] border-none shrink-0">
              <Link href="/login" className="!text-[#004EDC]">Đăng nhập</Link>
            </Button>
          )}

        </div>
      </div>

      {/* ─── Mobile ─── */}
      <div className="flex lg:hidden items-center justify-between h-full px-4 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex flex-col items-center shrink-0">
          <Image
            src="/logoamban.png"
            alt="Exam Arena"
            width={140}
            height={40}
            priority
            className="object-contain"
          />
          <span className="text-[9px] text-white/90 text-center uppercase leading-none mt-1">
            Hệ thống luyện thi
          </span>
        </Link>

        {/* Mobile actions */}
        <div className="flex items-center gap-3">

          {isLoggedIn ? (
            <div className="size-8 rounded-full bg-white/20 border border-white flex items-center justify-center">
              <User className="size-4 text-white" />
            </div>
          ) : (
            <Button asChild size="sm" className="rounded-full bg-[#FFD600] text-xs font-semibold hover:bg-[#FFE44D] border-none">
              <Link href="/login" className="!text-[#004EDC]">Đăng nhập</Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="text-white hover:text-[#FFD600] hover:bg-white/10" aria-label="Mở menu">
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="bg-[#2956DE] border-l-white/10 w-72">
              <SheetHeader>
                <SheetTitle className="text-white text-left">Menu</SheetTitle>
              </SheetHeader>

              <nav className="flex flex-col px-2 gap-1 mt-4">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button variant="ghost" className="w-full justify-start text-sm font-medium text-white hover:bg-white/10 hover:text-[#FFD600]">
                      {link.label}
                    </Button>
                  </Link>
                ))}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
