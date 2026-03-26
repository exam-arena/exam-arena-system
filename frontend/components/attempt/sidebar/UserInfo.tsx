import React from "react";
import Image from "next/image";

interface UserInfoProps {
  name: string;
  fullName: string;
  email: string;
  role: string;
  avatarUrl?: string;
}

export function UserInfo({ name, fullName, email, role, avatarUrl }: UserInfoProps) {
  return (
    <div className="flex flex-col items-center gap-6 w-full">
      <div className="flex flex-col items-center gap-3 w-full">
        <b className="text-base font-bold text-mediumslateblue">Thông tin thí sinh</b>
        <div className="relative w-20 h-20 rounded-full overflow-hidden bg-cornflowerblue-200 flex items-center justify-center">
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={name}
              fill
              className="object-cover"
              sizes="80px"
            />
          ) : (
            <span className="text-2xl text-mediumslateblue font-bold">{name.charAt(0)}</span>
          )}
        </div>
        <b className="text-2xl text-mediumslateblue">{name}</b>
      </div>
      <div className="flex flex-col w-full items-start px-3 gap-2 text-base text-mediumslateblue">
        <div>
          <b>Họ và tên: </b><span>{fullName}</span>
        </div>
        <div>
          <b>Email: </b><span className="truncate max-w-[150px] inline-block align-bottom" title={email}>{email}</span>
        </div>
        <div>
          <b>Vai trò: </b><span className="capitalize">{role === 'student' ? 'Học sinh' : 'Quản trị viên'}</span>
        </div>
      </div>
    </div>
  );
}
