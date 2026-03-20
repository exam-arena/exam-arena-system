import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import Link from "next/link";
import { ChevronLeft, Wrench } from "lucide-react";

export default async function DocumentDetailPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params;

    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col mx-auto max-w-[1920px]">
            <Header />

            <section className="w-full bg-[#F6FBFF] py-16 flex-grow flex flex-col items-center justify-center border-t border-blue-50 px-4">
                <div className="max-w-[600px] w-full bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-blue-50 flex flex-col items-center text-center gap-6">
                    <div className="w-20 h-20 bg-[#EAF2FF] rounded-full flex items-center justify-center text-[#004EDC]">
                        <Wrench className="w-10 h-10" />
                    </div>

                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-[#004EDC]">
                            Tính năng đang hoàn thiện
                        </h1>
                        <p className="text-[#92B8FF] text-base">
                            Trang đọc tài liệu chi tiết cho Tài liệu mã số <b>{id}</b> hiện đang trong quá trình phát triển và sẽ sớm ra mắt.
                        </p>
                    </div>

                    <Link href="/documents" className="mt-4 flex items-center justify-center gap-2 text-white bg-[#004EDC] hover:bg-blue-800 transition-colors py-3 px-8 rounded-full font-medium">
                        <ChevronLeft className="w-4 h-4" />
                        <span>Quay lại danh sách tài liệu</span>
                    </Link>
                </div>
            </section>

            <Footer />
        </main>
    );
}
