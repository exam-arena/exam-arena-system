import Header from "@/components/layout/Header";
import Hero from "@/components/sections/Hero";
import Feature from "@/components/sections/Feature";
import HotRoom from "@/components/sections/HotRoom";
import NewExam from "@/components/sections/NewExam";
import Footer from "@/components/layout/Footer";
import CTA from "@/components/sections/CTA";
import Docs from "@/components/sections/Docs";

export default function Home() {
    return (
        <>
            <Header />
            <Hero />
            <Feature />
            <HotRoom />
            <NewExam />
            <CTA />
            <Docs />
            <Footer />
        </>
    );
}
