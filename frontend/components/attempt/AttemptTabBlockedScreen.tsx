"use client";

interface AttemptTabBlockedScreenProps {
  onGoHome: () => void;
}

export function AttemptTabBlockedScreen({
  onGoHome,
}: AttemptTabBlockedScreenProps) {
  return (
    <div className="min-h-screen w-full bg-[#f6fbff] px-6">
      <div className="mx-auto flex min-h-screen max-w-[720px] items-center justify-center">
        <div className="w-full rounded-[32px] border border-[#dbeafe] bg-white p-8 text-center shadow-[0px_20px_60px_rgba(0,78,220,0.10)]">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#eaf2ff] text-3xl font-bold text-[#004edc]">
            !
          </div>

          <h1 className="mt-6 text-[2rem] font-bold leading-tight text-[#004edc]">
            Bài thi đang mở ở tab khác
          </h1>
          <p className="mt-3 text-base leading-7 text-[#64748b]">
            Hệ thống chỉ cho phép một tab được làm bài với cùng một attempt.
            Hay quay lại tab đang thi, hoặc đóng tab đó rồi thử lại.
          </p>

          <div className="mt-6 rounded-[24px] border border-[#dbeafe] bg-[#f8fbff] px-5 py-4 text-left">
            <div className="text-sm font-semibold text-[#004edc]">ưu ý</div>
            <p className="mt-2 text-sm leading-6 text-[#475569]">
              Tab này đã bị khóa nên sẽ không được phép lưu đáp án hoặc nộp bài
              cho đến khi không còn tab nào khác giữ quyền làm bài.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoHome}
              className="rounded-full border border-[#92b8ff] bg-white px-6 py-3 text-sm font-semibold text-[#004edc] transition hover:border-[#004edc] hover:bg-[#f6fbff]"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
