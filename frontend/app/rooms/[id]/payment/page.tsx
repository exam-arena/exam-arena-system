import Link from "next/link";
import { ArrowLeft, CreditCard } from "lucide-react";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import { getRoomById } from "@/lib/api/rooms/api";

export default async function RoomPaymentPlaceholderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const room = await getRoomById(id);

  return (
    <main className="flex min-h-screen w-full flex-col bg-neutral-50">
      <Header />

      <section className="flex-1 border-t border-blue-50 bg-[#F6FBFF]">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 md:px-10 md:py-16">
          <div className="mx-auto max-w-2xl rounded-[32px] border border-blue-100 bg-white p-8 shadow-sm md:p-10">
            <div className="inline-flex items-center justify-center rounded-full bg-blue-50 p-4 text-[#004EDC]">
              <CreditCard className="size-6" />
            </div>

            <h1 className="mt-6 text-2xl font-bold text-[#004EDC] md:text-3xl">
              Trang thanh toán đang phát triển
            </h1>

            <p className="mt-4 text-sm leading-7 text-slate-600 md:text-base">
              {room
                ? `Tính năng thanh toán cho phòng "${room.name}" sẽ sớm được mở.`
                : "Tính năng thanh toán cho phòng này sẽ sớm được mở."}{" "}
              Hiện tại route này đã được dựng sẵn để sau này cắm payment thật mà
              không cần đổi lại luồng điều hướng trên giao diện.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/rooms"
                className="inline-flex items-center gap-2 rounded-full bg-[#004EDC] px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                <ArrowLeft className="size-4" />
                Quay lại danh sách phòng
              </Link>

              {room ? (
                <Link
                  href={`/rooms/${room.id}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#004EDC] px-5 py-3 text-sm font-semibold text-[#004EDC] transition hover:bg-blue-50"
                >
                  Xem chi tiết phòng
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
