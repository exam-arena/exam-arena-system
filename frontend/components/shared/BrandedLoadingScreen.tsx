"use client";

interface BrandedLoadingScreenProps {
  message?: string;
}

export function BrandedLoadingScreen({
  message = "Dang tai du lieu...",
}: BrandedLoadingScreenProps) {
  return (
    <div className="min-h-screen w-full bg-white">
      <div className="flex min-h-screen w-full flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 text-[2rem] font-extrabold tracking-[0.18em] text-[#004edc] sm:text-[2.5rem]">
          ExamArena
        </div>
        <div className="h-2 w-full max-w-md overflow-hidden rounded-full bg-[#dbe8ff]">
          <div className="loading-bar h-full w-1/2 rounded-full bg-[#004edc]" />
        </div>
        <p className="mt-5 text-base font-medium text-[#004edc] opacity-80 sm:text-lg">
          {message}
        </p>
      </div>
      <style jsx>{`
        .loading-bar {
          animation: branded-loading 1.1s ease-in-out infinite;
        }

        @keyframes branded-loading {
          0% {
            transform: translateX(-110%);
          }
          100% {
            transform: translateX(220%);
          }
        }
      `}</style>
    </div>
  );
}
