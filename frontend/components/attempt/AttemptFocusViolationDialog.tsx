"use client";

interface AttemptFocusViolationDialogProps {
  violationCount: number;
  maxViolations: number;
  onResume: () => void;
}

export function AttemptFocusViolationDialog({
  violationCount,
  maxViolations,
  onResume,
}: AttemptFocusViolationDialogProps) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-[#1f2937]/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-[460px] rounded-[28px] border border-[#fde68a] bg-white p-7 text-center shadow-[0px_20px_60px_rgba(15,23,42,0.24)]">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#fff7db] text-[2rem] font-bold text-[#d97706]">
          !
        </div>

        <h2 className="mt-5 text-[1.9rem] font-bold leading-tight text-[#0f172a]">
          Bạn vừa rời khỏi màn hình thi
        </h2>
        <p className="mt-3 text-sm leading-6 text-[#64748b]">
          Hệ thống đã ghi nhận một lần rời khỏi tab hoặc cửa sổ làm bài. Nếu vượt quá giới hạn cho phép, bài thi sẽ bị nộp tự động.
        </p>

        <div className="mt-6 rounded-[22px] border border-[#fde68a] bg-[#fffdf4] px-6 py-5">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d97706]">
            Số lần vi phạm
          </div>
          <div className="mt-2 text-5xl font-bold leading-none text-[#d97706]">
            {violationCount}
            <span className="ml-2 text-2xl text-[#f59e0b]">/ {maxViolations}</span>
          </div>
        </div>

        <div className="mt-6 rounded-[20px] border border-[#e2e8f0] bg-[#f8fafc] px-5 py-4 text-left">
          <div className="text-sm font-semibold text-[#0f172a]">Lưu ý</div>
          <p className="mt-2 text-sm leading-6 text-[#475569]">
            Hãy giữ màn hình thi luôn ở tab đang hoạt động để tránh bị hệ thống đánh dấu thêm.
          </p>
        </div>

        <button
          type="button"
          onClick={onResume}
          className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-[#004edc] to-[#2563eb] px-6 py-4 text-base font-semibold text-white shadow-[0px_10px_24px_rgba(0,78,220,0.28)] transition hover:brightness-105"
        >
          Quay lại bài làm
        </button>
      </div>
    </div>
  );
}
