"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, CreditCard, Clock, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError } from "@/lib/api/client";
import { joinRoom } from "@/lib/api/rooms/api";
import { useAuth } from "@/lib/auth/hooks";
import { useRoomAccess } from "@/lib/room-access/context";

export type RoomCardProps = {
  room_id: string;
  name: string;
  type: string;
  price: number;
  test_quantity: number;
  status: string;
  has_access: boolean;
};

function formatRoomPrice(price: number) {
  if (price <= 0) {
    return "Miễn phí";
  }

  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export default function RoomCard({
  room_id,
  name,
  type,
  price,
  test_quantity,
  status,
  has_access,
}: RoomCardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();
  const { getRoomAccess, grantRoomAccess } = useRoomAccess();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [localHasAccess, setLocalHasAccess] = useState(has_access);

  const detailHref = `/rooms/${room_id}`;
  const paymentHref = `/rooms/${room_id}/payment`;
  const effectiveHasAccess = getRoomAccess(room_id, localHasAccess);

  useEffect(() => {
    setLocalHasAccess(has_access);
  }, [has_access]);

  const handleRegister = async () => {
    if (isLoading || isSubmitting) {
      return;
    }

    if (!user) {
      router.push("/login");
      return;
    }

    if (price > 0) {
      router.push(paymentHref);
      return;
    }

    try {
      setIsSubmitting(true);
      const result = await joinRoom(room_id);

      if (result.requires_payment) {
        router.push(paymentHref);
        return;
      }

      setLocalHasAccess(true);
      grantRoomAccess(room_id);
      toast.success("Đăng ký phòng thành công");
      router.push(detailHref);
      router.refresh();
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : "Không thể đăng ký phòng lúc này";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden rounded-3xl border-none bg-[#E5EEFF33] shadow-md">
      <CardContent className="p-6 text-left">
        <Image
          src="/logo.png"
          alt="Exam Arena"
          width={160}
          height={40}
          className="mb-2 object-contain"
        />

        <h3 className="mt-4 mb-3 text-lg font-bold text-[#004EDC] md:text-xl">
          {name}
        </h3>

        <div className="mt-6 space-y-3 text-sm text-[#004EDC]">
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
            <span>{formatRoomPrice(price)}</span>
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
            <span className="capitalize">{type.replaceAll("_", " ")}</span>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          {effectiveHasAccess ? (
            <Link href={detailHref}>
              <Button
                variant="outline"
                className="rounded-full border-[#004EDC] px-6 text-[#004EDC] hover:bg-[#004EDC] hover:text-white"
              >
                Xem chi tiết
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || isSubmitting}
              onClick={handleRegister}
              className="rounded-full border-[#004EDC] px-6 text-[#004EDC] hover:bg-[#004EDC] hover:text-white disabled:opacity-60"
            >
              {isSubmitting ? "Đang xử lý..." : "Đăng ký"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
