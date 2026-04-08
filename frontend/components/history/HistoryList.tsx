"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import HistoryItem, { type HistoryAttempt } from "./HistoryItem";
import CustomPagination from "@/components/shared/CustomPagination";
import { BrandedLoadingScreen } from "@/components/shared/BrandedLoadingScreen";
import { ApiError } from "@/lib/api/client";
import { getAttemptHistory } from "@/lib/api/history/api";
import type { HistoryAttemptsResponse } from "@/lib/api/history/types";

const ITEMS_PER_PAGE = 6;

function formatDateTime(value: string | null): string | null {
  if (!value) return null;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const time = new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);

  const calendar = new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replaceAll("/", ".");

  return `${time} - ${calendar}`;
}

function mapHistoryItems(items: HistoryAttemptsResponse["items"]): HistoryAttempt[] {
  return items.map((item) => ({
    id: item.attempt_id,
    startTime: formatDateTime(item.started_at) ?? "--",
    endTime: formatDateTime(item.submitted_at),
    roomName: item.room_name,
    examName: item.exam_name,
    score: item.score,
  }));
}

function HistoryListContent() {
  const searchParams = useSearchParams();
  const pageParam = searchParams.get("page");
  const parsedPage = pageParam ? parseInt(pageParam, 10) : 1;
  const currentPage = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  const [history, setHistory] = useState<HistoryAttemptsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      setIsFetching(true);
      if (!history) setIsLoading(true);
      setError(null);

      try {
        const response = await getAttemptHistory(currentPage, ITEMS_PER_PAGE);
        if (!cancelled) {
          setHistory(response);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Khong the tai lich su thi. Vui long thu lai.";
          setError(message);
          setHistory(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setIsFetching(false);
        }
      }
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [currentPage]);

  const currentData = history ? mapHistoryItems(history.items) : [];
  const safeCurrentPage = history?.currentPage ?? currentPage;
  const totalPages = history?.totalPages ?? 1;

  return (
    <section className="w-full bg-[#f6fbff] py-10 md:py-14">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">
        <div className="max-w-[1248px] mx-auto flex flex-col items-center gap-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-[#0050e2]">Lịch sử luyện thi</h2>
          <div className="h-1 w-16 bg-[#FFD600] mx-auto mt-3 rounded-full"></div>
        </div>

        <div className={`w-full flex flex-col gap-4 transition-opacity duration-300 ${isFetching && !isLoading ? "opacity-50 pointer-events-none" : ""}`}>
          {isLoading && (
            <div className="py-12">
              <BrandedLoadingScreen message="Đang tải lịch sử thi..." />
            </div>
          )}

          {!isLoading && error && (
            <div className="text-center py-12 text-red-600 bg-white/60 rounded-2xl border border-red-100 backdrop-blur-sm">
              <p>{error}</p>
            </div>
          )}

          {!isLoading &&
            !error &&
            currentData.map((item) => <HistoryItem key={item.id} item={item} />)}

          {!isLoading && !error && currentData.length === 0 && (
            <div className="text-center py-12 text-[#0050e2]/60 bg-white/50 rounded-2xl border border-[#0050e2]/10 backdrop-blur-sm">
              <p>Chưa có lịch sử làm bài thi nào.</p>
            </div>
          )}
        </div>

        {!isLoading && !error && totalPages > 1 && (
          <CustomPagination
            currentPage={safeCurrentPage}
            totalPages={totalPages}
            basePath="/history"
          />
        )}
        </div>
      </div>
    </section>
  );
}

export default function HistoryList() {
  return (
    <Suspense fallback={<BrandedLoadingScreen message="Đang tải dữ liệu..." />}>
      <HistoryListContent />
    </Suspense>
  );
}
