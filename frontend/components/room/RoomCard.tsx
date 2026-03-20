"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Users,
    User,
    Clock,
    GraduationCap,
} from "lucide-react";

type RoomCardProps = {
    id?: string | number;
    title: string;
    subtitle?: string;
    level?: string; // THPT
    capacity: string; // 504/1000
    target: string; // Tất cả
    status: string; // Đang mở
    type: string; // Trực tuyến
};

export default function RoomCard({
    id = 1,
    title,
    subtitle,
    level = "THPT",
    capacity,
    target,
    status,
    type,
}: RoomCardProps) {
    return (
        <Card className="rounded-3xl border-none shadow-md overflow-hidden bg-[#E5EEFF33]">

            <CardContent className="p-6 text-left">

                {/* Logo */}
                <Image
                    src="/logo.png"
                    alt="Exam Arena"
                    width={160}
                    height={40}
                    className="object-contain mb-2"
                />

                {/* Subtitle */}
                {subtitle && (
                    <p className="text-sm text-[#92B8FF] italic mb-2">
                        {subtitle}
                    </p>
                )}

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-[#004EDC] mb-3">
                    {title}
                </h3>

                {/* Badge */}
                <div className="mb-4">
                    <span className="bg-[#EAF2FF] text-[#004EDC] text-xs px-3 py-1 rounded-full">
                        {level}
                    </span>
                </div>

                {/* Info list */}
                <div className="space-y-3 text-sm text-[#004EDC]">

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Users className="size-4 opacity-60" />
                            <span>Sức chứa</span>
                        </div>
                        <span>{capacity}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <User className="size-4 opacity-60" />
                            <span>Đối tượng</span>
                        </div>
                        <span>{target}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 opacity-60" />
                            <span>Trạng thái</span>
                        </div>
                        <span>{status}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <GraduationCap className="size-4 opacity-60" />
                            <span>Hình thức</span>
                        </div>
                        <span>{type}</span>
                    </div>

                </div>

                {/* Button */}
                <div className="mt-6 flex justify-center">
                    <Link href={`/rooms/${id}`}>
                        <Button
                            variant="outline"
                            className="rounded-full border-[#004EDC] text-[#004EDC] px-6 hover:bg-[#004EDC] hover:text-white"
                        >
                            Xem chi tiết
                        </Button>
                    </Link>
                </div>

            </CardContent>
        </Card>
    );
}