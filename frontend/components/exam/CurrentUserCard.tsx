"use client";

import Link from "next/link";

import { useUser } from "@/lib/auth/hooks";

function formatRole(role: string | undefined): string {
  if (role === "student") return "Học sinh";
  if (role === "admin") return "Quản trị";
  if (!role) return "";
  return role;
}

export default function CurrentUserCard() {
  const { user } = useUser();

  if (!user) {
    return null;
  }

  const displayName = user.fullname?.trim() || user.username;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="w-full lg:w-100 flex flex-col items-center justify-start text-mediumslateblue">
      <div className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-center py-8 px-6 gap-6 border border-blue-50">
        <div className="self-stretch flex flex-col items-center gap-4">
          <h2 className="font-bold text-lg text-cornflowerblue-100">Thông tin thí sinh</h2>

          <div className="flex flex-col items-center gap-3">
            <div className="w-20 h-20 rounded-full bg-[#e7f0ff] flex items-center justify-center overflow-hidden border-2 border-[#EAF2FF]">
              <span className="text-3xl text-mediumslateblue font-bold">{initial}</span>
            </div>
            <b className="text-xl">{user.username}</b>
          </div>

          <div className="self-stretch h-px bg-[#EAF2FF] w-full" />

          <div className="self-stretch grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 text-[15px] w-full max-w-70 mx-auto">
            <div className="flex flex-col items-start gap-4 font-bold text-mediumslateblue">
              <p>Họ và tên:</p>
              <p>Email:</p>
              <p>Vai trò:</p>
            </div>
            <div className="flex flex-col items-end gap-4 text-right text-mediumslateblue font-medium">
              <p>{displayName}</p>
              <p className="truncate max-w-37.5" title={user.email}>
                {user.email}
              </p>
              <p className="capitalize">{formatRole(user.role)}</p>
            </div>
          </div>
        </div>

        <div className="flex items-start text-sm mt-2 w-full">
          <Link
            href="/profile"
            className="w-full rounded-full bg-white border border-[#EAF2FF] text-cornflowerblue-100 hover:bg-[#F6FBFF] hover:border-mediumslateblue hover:text-mediumslateblue transition-colors flex items-center justify-center py-2.5 px-5 font-bold"
          >
            Xem Profile
          </Link>
        </div>
      </div>
    </div>
  );
}
