"use client";

import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    FileText,
    CreditCard,
    Clock,
    BookOpen,
} from "lucide-react";

export type RoomCardProps = {
    room_id: string;
    name: string;
    type: string;
    price: number;
    test_quantity: number;
    status: string;
};

export default function RoomCard({
    room_id,
    name,
    type,
    price,
    test_quantity,
    status,
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

                {/* Title */}
                <h3 className="text-lg md:text-xl font-bold text-[#004EDC] mb-3 mt-4">
                    {name}
                </h3>

                {/* Info list */}
                <div className="space-y-3 text-sm text-[#004EDC] mt-6">

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <FileText className="size-4 opacity-60" />
                            <span>Số lượng đề</span>
                        </div>
                        <span>{test_quantity} đề</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <CreditCard className="size-4 opacity-60" />
                            <span>Giá</span>
                        </div>
                        <span>{price > 0 ? new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(price) : 'Miễn phí'}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Clock className="size-4 opacity-60" />
                            <span>Trạng thái</span>
                        </div>
                        <span>{status === "active" ? "Đang mở" : "Đã đóng"}</span>
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="size-4 opacity-60" />
                            <span>Loại phòng</span>
                        </div>
                        <span className="capitalize">{type.replace('_', ' ')}</span>
                    </div>

                </div>

                {/* Button */}
                <div className="mt-6 flex justify-center">
                    <Link href={`/rooms/${room_id}`}>
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