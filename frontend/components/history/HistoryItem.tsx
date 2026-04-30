import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryAttempt {
  id: string;
  startTime: string;
  endTime: string | null;
  roomName: string;
  examName: string;
  score: number | string;
}

interface HistoryItemProps {
  item: HistoryAttempt;
}

export default function HistoryItem({ item }: HistoryItemProps) {
  return (
    <div className="w-full rounded-2xl bg-[#92B8FF]/20 overflow-hidden hover:bg-[#92B8FF]/30 transition-colors border border-transparent hover:border-[#92B8FF]/40">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-y-6 gap-x-4 p-4 md:p-6 items-center text-center">
        <div className="flex flex-col items-center justify-center gap-1.5 lg:border-r border-[#0050e2]/10 lg:pr-4 col-span-2 md:col-span-1">
          <span className="text-sm font-bold text-[#0050e2]">Thời gian bắt đầu</span>
          <span className="text-sm text-[#0050e2] font-normal">{item.startTime}</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 lg:border-r border-[#0050e2]/10 lg:pr-4 col-span-2 md:col-span-1">
          <span className="text-sm font-bold text-[#0050e2]">Thời gian hoàn thành</span>
          <span className="text-sm text-[#0050e2] font-normal">{item.endTime ?? "--"}</span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 lg:border-r border-[#0050e2]/10 lg:pr-4">
          <span className="text-sm font-bold text-[#0050e2]">Phòng luyện thi</span>
          <span className="text-sm text-[#0050e2] font-normal" title={item.roomName}>
            {item.roomName}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 lg:border-r border-[#0050e2]/10 lg:pr-4">
          <span className="text-sm font-bold text-[#0050e2]">Đề thi</span>
          <span className="text-sm text-[#0050e2] font-normal" title={item.examName}>
            {item.examName}
          </span>
        </div>

        <div className="flex flex-col items-center justify-center gap-1.5 lg:border-r border-[#0050e2]/10 lg:pr-4">
          <span className="text-sm font-bold text-[#0050e2]">Điểm số</span>
          <span className="text-sm text-[#0050e2] font-normal">{item.score}</span>
        </div>

        <div className="flex items-center justify-center pt-2 md:pt-0">
          <Button asChild variant="ghost" className="text-[#0050e2] hover:text-[#004edc] hover:bg-[#0050e2]/10 font-bold gap-2">
            <Link href={`/attempts/${item.id}/result`}>
              Chi tiết
              <ChevronRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
