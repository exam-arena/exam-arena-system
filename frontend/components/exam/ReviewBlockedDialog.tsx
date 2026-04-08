import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ReviewBlockedDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ReviewBlockedDialog({
  open,
  onOpenChange,
}: ReviewBlockedDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg rounded-num-30 border-none bg-white p-8 text-center shadow-[0px_2px_8px_rgba(146,184,255,0.2)] outline-none sm:p-12">
        <DialogHeader className="w-full flex flex-col items-center">
          <DialogTitle className="text-[1.25rem] font-bold leading-6 text-[#004EDC] sm:text-2xl">
            Chưa thể xem đáp án
          </DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col items-center justify-center gap-1 text-[1rem] leading-6 text-[#004EDC] opacity-80">
          <span>
            Đáp án sẽ được công bố sau khi cuộc thi kết thúc. Vui lòng vào Lịch sử thi để xem lại kết quả sau thời gian này.
          </span>
        </div>

        <div className="mt-4 flex items-center justify-center">
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-num-30 bg-[#004EDC] px-6 py-2 text-white transition-colors hover:bg-blue-800 focus:outline-none sm:px-8 sm:py-3"
          >
            <b className="relative text-[1rem] leading-6">Đóng</b>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
