"use client";

interface AttemptFullscreenWarningDialogProps {
  countdown: number;
  onReturnToFullscreen: () => void;
}

export function AttemptFullscreenWarningDialog({
  countdown,
  onReturnToFullscreen,
}: AttemptFullscreenWarningDialogProps) {
  return (
    <div className="fixed inset-0 z-120 flex items-center justify-center bg-[#1f2937]/70 px-4 backdrop-blur-sm">
      <div className="w-full max-w-110 rounded-[28px] bg-white p-7 text-center shadow-[0px_20px_60px_rgba(15,23,42,0.28)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf2ff] text-[2rem] text-mediumslateblue">
          !
        </div>

        <h2 className="mt-5 text-[1.9rem] font-bold leading-tight text-mediumslateblue">
          Thoát khỏi toàn màn hình!
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Bạn cần quay lại chế độ toàn màn hình để tiếp tục làm bài thi.
        </p>

        <div className="mt-6 rounded-[22px] border border-[#bfd7ff] bg-aliceblue px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2563eb]">
            Tự động nộp bài sau
          </div>
          <div className="mt-2 text-6xl font-bold leading-none text-mediumslateblue">
            {countdown}
          </div>
          <div className="mt-1 text-sm text-[#64748b]">giây</div>
        </div>

        <div className="mt-6 rounded-[20px] border border-[#dbeafe] bg-[#f8fbff] px-5 py-4 text-left">
          <div className="text-sm font-semibold text-mediumslateblue">Lưu ý quan trọng</div>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            Nếu hết thời gian mà bạn vẫn chưa quay lại toàn màn hình, hệ thống sẽ tự động nộp bài.
          </p>
        </div>

        <button
          type="button"
          onClick={onReturnToFullscreen}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-linear-to-r from-mediumslateblue to-[#2563eb] px-6 py-4 text-base font-semibold text-white shadow-[0px_10px_24px_rgba(0,78,220,0.28)] transition hover:brightness-105"
        >
          Quay lại toàn màn hình
        </button>
      </div>
    </div>
  );
}
