"use client";

import { Camera, UserRound } from "lucide-react";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ProfileIdentityCardProps {
  fullname: string;
  username: string;
  userId: string;
  avatarUrl?: string;
  isEditing: boolean;
}

function getInitials(fullname: string, username: string) {
  const source = fullname.trim() || username.trim() || "EA";
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export default function ProfileIdentityCard({
  fullname,
  username,
  avatarUrl,
}: ProfileIdentityCardProps) {
  const displayName = fullname.trim() || username;
  const initials = getInitials(fullname, username);

  return (
    <Card className="overflow-hidden rounded-[2rem] border border-[#D8E6FF] bg-linear-to-b from-[#F6FAFF] to-white py-0 shadow-[0_18px_60px_rgba(0,78,220,0.08)]">
      <CardContent className="flex h-full min-h-136 flex-col items-center justify-start gap-6 px-6 py-8 text-center">
        <div className="relative">
          <Avatar className="size-36 border-4 border-white shadow-[0_16px_30px_rgba(0,78,220,0.15)] after:hidden">
            <AvatarImage src={avatarUrl} alt={displayName} />
            <AvatarFallback className="bg-[#DCE9FF] text-3xl font-bold text-[#004EDC]">
              {avatarUrl ? <UserRound className="size-10" /> : initials}
            </AvatarFallback>
          </Avatar>

          <div className="absolute -bottom-1 -right-1 rounded-full bg-[#004EDC] p-2 text-white shadow-lg">
            <Camera className="size-4" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-[#004EDC]">
            {displayName}
          </h2>
          <p className="text-sm font-medium text-[#5B84D7]">@{username}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="h-11 w-full rounded-full border-[#CFE0FF] bg-white text-sm font-semibold text-[#004EDC] hover:border-[#004EDC] hover:bg-[#F5F9FF]"
          disabled
        >
          Tải ảnh đại diện
        </Button>
      </CardContent>
    </Card>
  );
}
