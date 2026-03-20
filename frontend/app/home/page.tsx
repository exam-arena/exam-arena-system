import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Countdown from "@/components/sections/Countdown";
import HotRoom from "@/components/sections/HotRoom";
import NewExam from "@/components/sections/NewExam";
import CTA from "@/components/sections/CTA";
import Docs from "@/components/sections/Docs";
import Footer from "@/components/layout/Footer";

export default function HomePage() {
    return (
        <main className="min-h-screen bg-neutral-50 flex flex-col items-center mx-auto max-w-[1920px]">
            <Header isLoggedIn={true} user={{ name: "User 1" }} />
            <Hero />
            <Countdown targetDate="2026-06-11T00:00:00+07:00" />
            <HotRoom />
            <NewExam />
            <CTA />
            <Docs />
            <Footer />
        </main>
    );
}
