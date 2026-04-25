"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Search, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { UserData } from "@/lib/api/auth/types";
import { useAuth } from "@/lib/auth/hooks";

function UserAvatarDropdown({
  user,
  onLogout,
  className = "size-10",
}: {
  user: UserData;
  onLogout: () => void;
  className?: string;
}) {
  const avatarUrl = user.avatar_url?.trim() || undefined;
  const displayName = user.fullname?.trim() || user.username;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={`${className} rounded-full border border-white/80 bg-white/20 p-0.5 shadow-sm transition-colors hover:bg-white/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0050E2]`}
          aria-label="Mở menu tài khoản"
        >
          <Avatar className="size-full after:hidden">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-white/25 text-white">
              <User className="size-5" />
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuItem asChild>
          <Link href="/profile">Hồ sơ cá nhân</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/history">Lịch sử thi</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            onLogout();
          }}
          className="text-red-600 focus:text-red-600"
        >
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

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
      window.alert("Không thể đăng xuất. Vui lòng thử lại.");
    }
  };

  const navLinks = useMemo(
    () => [
      { label: "Trang chủ", href: isLoggedIn ? "/home" : "/" },
      { label: "Phòng luyện thi", href: "/rooms" },
      { label: "Đề thi", href: "/exams" },
      { label: "Tài liệu tham khảo", href: "/documents" },
    ],
    [isLoggedIn]
  );

  return (
    <header className="sticky top-0 z-50 h-20 w-full overflow-hidden bg-[#0050E2]">
      {/* Desktop */}
      <div className="mx-auto hidden h-full max-w-480 items-center justify-between gap-6 px-24 lg:flex">
        {/* Logo */}
        <Link href="/" className="flex w-47 shrink-0 flex-col items-center justify-center p-2.5">
          <div className="flex flex-col items-center justify-center gap-1">
            <Image
              src="/logoamban.png"
              alt="Exam Arena"
              width={168}
              height={24}
              priority
              className="relative max-h-full w-42 object-cover"
            />
            <span className="mt-1 text-[0.625rem] font-medium uppercase leading-3.5 tracking-widest text-white">
              Hệ thống luyện thi THPTQG
            </span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex h-5 items-center justify-center gap-10 text-[1rem] font-bold text-white">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="flex items-center justify-center transition-colors hover:text-[#FFD600]"
            >
              <span className="whitespace-nowrap leading-5">{link.label}</span>
            </Link>
          ))}
        </nav>

        {/* Right Actions */}
        <div className="flex w-100 items-center justify-end gap-3">
          {/* Search Bar - Hiện ở cả 2 trạng thái */}
          <div className="relative flex h-9 w-[16.938rem] shrink-0 items-center gap-1 overflow-hidden rounded-num-30 bg-white/20 px-4">
            <Search className="size-5 shrink-0 text-white/70" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm"
              className="h-full w-full border-none bg-transparent px-0 text-[0.875rem] font-normal text-white placeholder:font-normal placeholder:text-white/70 focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          </div>

          {/* Conditional Auth Block */}
          {isLoggedIn ? (
            <UserAvatarDropdown user={user} onLogout={handleLogout} />
          ) : (
            <Button
              asChild
              className="h-9 shrink-0 rounded-num-30 border-none bg-[#FFD600] px-6 text-[1rem] font-semibold text-gray-900 hover:bg-[#FFE44D]"
            >
              <Link href="/login" className="text-[#004EDC]!">
                Đăng nhập
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile */}
      <div className="flex h-full items-center justify-between px-4 sm:px-6 lg:hidden">
        {/* Logo */}
        <Link href="/" className="flex shrink-0 flex-col items-center">
          <Image
            src="/logoamban.png"
            alt="Exam Arena"
            width={140}
            height={40}
            priority
            className="object-contain"
          />
          <span className="mt-1 text-center text-[9px] uppercase leading-none text-white/90">
            Hệ thống luyện thi
          </span>
        </Link>

        {/* Mobile actions */}
        <div className="flex items-center gap-3">
          {isLoggedIn ? (
            <UserAvatarDropdown user={user} onLogout={handleLogout} className="size-9" />
          ) : (
            <Button
              asChild
              size="sm"
              className="rounded-full border-none bg-[#FFD600] text-xs font-semibold hover:bg-[#FFE44D]"
            >
              <Link href="/login" className="text-[#004EDC]!">
                Đăng nhập
              </Link>
            </Button>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 hover:text-[#FFD600]"
                aria-label="Mở menu"
              >
                <Menu className="size-6" />
              </Button>
            </SheetTrigger>

            <SheetContent side="right" className="w-72 border-l-white/10 bg-[#2956DE]">
              <SheetHeader>
                <SheetTitle className="text-left text-white">Menu</SheetTitle>
              </SheetHeader>

              <nav className="mt-4 flex flex-col gap-1 px-2">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <Button
                      variant="ghost"
                      className="w-full justify-start text-sm font-medium text-white hover:bg-white/10 hover:text-[#FFD600]"
                    >
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
