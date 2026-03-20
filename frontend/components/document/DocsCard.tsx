import Image from "next/image";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ExamCardProps = {
    id?: string | number;
    title: string;
    subject: string;
    author: string;
    image?: string;
};

export default function DocsCard({
    id = 1,
    title,
    subject,
    author,
    image = "/carddethi.png",
}: ExamCardProps) {
    return (
        <Card
            className="
                rounded-2xl sm:rounded-3xl overflow-hidden
                border-none shadow-md p-0 group
                transition-shadow hover:shadow-lg
            "
        >
            {/* Image — aspect-ratio keeps proportion on all screens */}
            <div className="relative w-full aspect-[4/3]">
                <Image
                    src={image}
                    alt={title}
                    fill
                    className="object-cover"
                />
            </div>

            {/* Content */}
            <CardContent className="px-3 py-3 sm:px-4 sm:py-4 md:p-5 bg-white text-center">
                <h3 className="text-sm sm:text-base font-bold text-[#004EDC] mb-1 sm:mb-2 line-clamp-2">
                    {title}
                </h3>

                <p className="text-[11px] sm:text-xs text-[#92B8FF] mb-2 sm:mb-3">
                    Môn học: {subject} | Tác giả: {author}
                </p>

                <Link href={`/documents/${id}`}>
                    <Button
                        variant="outline"
                        className="
                            rounded-full border-[#004EDC] text-[#004EDC]
                            text-xs sm:text-sm
                            px-3 py-1 sm:px-5 sm:py-1.5
                            hover:bg-[#004EDC] hover:text-white
                            transition-colors
                        "
                    >
                        Xem chi tiết
                    </Button>
                </Link>
            </CardContent>
        </Card>
    );
}