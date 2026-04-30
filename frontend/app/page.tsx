import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Feature from "@/components/sections/Feature";
import HotRoom from "@/components/sections/HotRoom";
import NewExam from "@/components/sections/NewExam";
import Footer from "@/components/layout/Footer";
import CTA from "@/components/sections/CTA";
import Docs from "@/components/sections/Docs";
import { getHotRooms } from "@/lib/api/rooms/api";

export default async function Home() {
    const initialHotRooms = await getHotRooms().catch(() => []);

    return (
        <>
            <Header />
            <Hero />
            <Feature />
            <HotRoom initialRooms={initialHotRooms} />
            <NewExam />
            <CTA />
            <Docs />
            <Footer />
        </>
    );
}
