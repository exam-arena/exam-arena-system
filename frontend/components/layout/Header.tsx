"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import Image from "next/image";

const navLinks = [
  { label: "Trang chủ", href: "/" },
  { label: "Đề thi tuyển chọn", href: "/exams" },
  { label: "Tài liệu tham khảo", href: "/documents" },
];

export default function Header() {
  const [searchQuery, setSearchQuery] = useState("");

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0050E2] h-20">
      {/* ─── Desktop ─── */}
      <div className="hidden lg:flex items-center h-full px-24 gap-6 max-w-[1440px] mx-auto">
        {/* Logo */}
        <Link href="/" className="flex flex-col shrink-0 items-center">
          <Image
            src="/logoamban.png"
            alt="Exam Arena"
            width={190}
            height={50}
            priority
            className="object-contain"
          />
          <span className="text-[10px] text-white/100 text-center tracking-widest uppercase leading-none mt-2">
            Hệ thống luyện thi THPTQG
          </span>
        </Link>
        {/* Nav */}
        <nav className="flex items-center gap-12 ml-30">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button variant="ghost" className="text-sm font-medium text-white hover:text-[#FFD600] hover:bg-transparent whitespace-nowrap px-0">
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search */}
        <div className="relative flex items-center">
          <Search className="absolute left-3 size-4 text-white/50 pointer-events-none z-10" />
          <Input
            type="text"
            value={searchQuery}
            placeholder="Tìm kiếm"
            className="h-9 w-70 rounded-full border border-white/20 bg-white/10 backdrop-blur-md pl-9 pr-4 text-sm text-white placeholder:text-white/50 focus-visible:ring-1 focus-visible:ring-white/40 focus-visible:outline-none"
          />
        </div>

        {/* CTA */}
        <Button asChild className="h-9 px-5 rounded-full bg-[#FFD600] text-sm font-semibold text-gray-900 hover:bg-[#FFE44D] border-none">
          <Link href="/login">Đăng nhập</Link>
        </Button>
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
          <span className="text-[9px] text-white/90 text-center tracking-widest uppercase leading-none mt-1">
            Hệ thống luyện thi THPTQG
          </span>
        </Link>

        {/* Mobile actions */}
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="rounded-full bg-[#FFD600] text-xs font-semibold text-gray-900 hover:bg-[#FFE44D] border-none">
            <Link href="/login">Đăng nhập</Link>
          </Button>

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

              <div className="px-4 mt-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-gray-400 pointer-events-none z-10" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm kiếm"
                    className="h-10 w-full rounded-full border-none bg-white pl-9 pr-4 text-sm text-gray-800 placeholder:text-gray-400"
                  />
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
