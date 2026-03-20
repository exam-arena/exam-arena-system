import Link from "next/link";

type DocCardProps = {
    id: string | number;
    title: string;
    subject: string;
    type: string;
    time?: string;
};

export default function DocCard({ id, title, subject, type = "Tài liệu tham khảo", time = "20/03/2026" }: DocCardProps) {
    return (
        <div className="flex flex-col items-start w-full">
            <Link 
                href={`/documents/${id}`}
                className="w-full shadow-sm hover:shadow-md transition-shadow rounded-3xl bg-white flex flex-col items-start py-6 px-4 border border-blue-50 group hover:border-[#004EDC]"
            >
                <div className="w-full flex flex-col items-start gap-3">
                    <div className="flex items-start gap-2 flex-wrap mb-1">
                        <div className="rounded-full bg-[#EAF2FF] flex items-center justify-center py-1 px-3">
                            <span className="text-[#004EDC] text-xs font-semibold leading-4">{subject}</span>
                        </div>
                        <div className="rounded-full bg-[#EAF2FF] flex items-center justify-center py-1 px-3">
                            <span className="text-[#004EDC] text-xs font-semibold leading-4">{type}</span>
                        </div>
                    </div>
                    <div className="w-full flex flex-col items-start text-left text-base">
                        <div className="w-full flex flex-col items-start justify-center">
                            <b className="w-full relative leading-[1.5rem] text-[#004EDC] line-clamp-2 min-h-[48px] group-hover:text-blue-800 transition-colors">
                                {title}
                            </b>
                        </div>
                        <div className="flex items-center gap-1.5 text-center text-xs text-[#92b8ff] mt-3">
                            <div className="h-3 w-[2px] rounded-full bg-[#92b8ff]" />
                            <span className="leading-5 font-medium">Thời gian: {time}</span>
                        </div>
                    </div>
                </div>
            </Link>
        </div>
    );
}
