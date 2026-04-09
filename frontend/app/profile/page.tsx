import type { Metadata } from "next";

import RequireAuth from "@/components/auth/RequireAuth";
import Footer from "@/components/layout/Footer";
import Header from "@/components/layout/Header";
import ProfilePageClient from "@/components/profile/ProfilePageClient";
import Banner from "@/components/sections/Banner";

export const metadata: Metadata = {
  title: "Profile cá nhân | Exam Arena",
  description: "Cập nhật và theo dõi hồ sơ cá nhân của thí sinh trên Exam Arena.",
};

export default function ProfilePage() {
  return (
    <RequireAuth>
      <main className="min-h-screen bg-white font-roboto">
        <Header />
        <div className="flex flex-col">
          <Banner />
          <ProfilePageClient />
        </div>
        <Footer />
      </main>
    </RequireAuth>
  );
}
