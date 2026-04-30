import RequireAuth from "@/components/auth/RequireAuth";
import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Countdown from "@/components/sections/Countdown";
import HotRoom from "@/components/sections/HotRoom";
import NewExam from "@/components/sections/NewExam";
import CTA from "@/components/sections/CTA";
import Docs from "@/components/sections/Docs";
import Footer from "@/components/layout/Footer";
import { getHotRooms } from "@/lib/api/rooms/api";

export default async function HomePage() {
    const initialHotRooms = await getHotRooms().catch(() => []);

    return (
        <RequireAuth>
            <main className="min-h-screen bg-neutral-50 flex flex-col">
                <Header />
                <Hero />
                <Countdown targetDate="2026-06-11T00:00:00+07:00" />
                <HotRoom initialRooms={initialHotRooms} />
                <NewExam />
                <CTA />
                <Docs />
                <Footer />
            </main>
        </RequireAuth>
    );
}
