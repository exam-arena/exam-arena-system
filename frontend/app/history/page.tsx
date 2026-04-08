import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import RequireAuth from "@/components/auth/RequireAuth";
import HistoryList from "@/components/history/HistoryList";
import { Metadata } from "next";
import Banner from "@/components/sections/Banner";

export const metadata: Metadata = {
  title: "Lịch sử luyện thi | Exam Arena",
  description: "Xem lại lịch sử luyện thi của bạn",
};

export default function HistoryPage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-white flex flex-col font-roboto">
        <Header />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          <Banner />
          <HistoryList />
        </div>

        <Footer />
      </main>
    </RequireAuth>
  );
}
