"use client";

import { Suspense, useEffect, useState } from "react";
import HistoryItem, { type HistoryAttempt } from "./HistoryItem";
import { BrandedLoadingScreen } from "@/components/shared/BrandedLoadingScreen";
import { ApiError } from "@/lib/api/client";
import { getAttemptHistory } from "@/lib/api/history/api";
import type { HistoryAttemptsResponse } from "@/lib/api/history/types";
import { Button } from "@/components/ui/button";

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

export default function HistoryList() {
  return (
    <Suspense fallback={<BrandedLoadingScreen message="Đang tải dữ liệu..." />}>
      <HistoryListContent />
    </Suspense>
  );
}

function HistoryListContent() {
  const [items, setItems] = useState<HistoryAttempt[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadInitialHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await getAttemptHistory(null, ITEMS_PER_PAGE);
        if (!cancelled) {
          setItems(mapHistoryItems(response.items));
          setNextCursor(response.nextCursor ?? null);
          setHasNextPage(response.hasNextPage);
        }
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof ApiError
              ? err.message
              : "Không thể tải lịch sử thi. Vui lòng thử lại.";
          setError(message);
          setItems([]);
          setNextCursor(null);
          setHasNextPage(false);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialHistory();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLoadMore() {
    if (!hasNextPage || !nextCursor || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      const response = await getAttemptHistory(nextCursor, ITEMS_PER_PAGE);
      setItems((prev) => [...prev, ...mapHistoryItems(response.items)]);
      setNextCursor(response.nextCursor ?? null);
      setHasNextPage(response.hasNextPage);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : "Không thể tải thêm lịch sử thi. Vui lòng thử lại.";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }

  return (
    <section className="w-full bg-[#f6fbff] py-10 md:py-14">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-[96px]">
        <div className="max-w-[1248px] mx-auto flex flex-col items-center gap-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-[#0050e2]">Lịch sử luyện thi</h2>
            <div className="h-1 w-16 bg-[#FFD600] mx-auto mt-3 rounded-full"></div>
          </div>

          <div className="w-full flex flex-col gap-4">
            {isLoading && (
              <div className="py-12">
                <BrandedLoadingScreen message="Đang tải lịch sử thi..." />
              </div>
            )}

            {!isLoading && error && items.length === 0 && (
              <div className="text-center py-12 text-red-600 bg-white/60 rounded-2xl border border-red-100 backdrop-blur-sm">
                <p>{error}</p>
              </div>
            )}

            {!isLoading && items.map((item) => <HistoryItem key={item.id} item={item} />)}

            {!isLoading && !error && items.length === 0 && (
              <div className="text-center py-12 text-[#0050e2]/60 bg-white/50 rounded-2xl border border-[#0050e2]/10 backdrop-blur-sm">
                <p>Chưa có lịch sử làm bài thi nào.</p>
              </div>
            )}
          </div>

          {!isLoading && error && items.length > 0 && (
            <div className="w-full text-center text-sm text-red-600">
              <p>{error}</p>
            </div>
          )}

          {!isLoading && hasNextPage && (
            <div className="mt-2">
              <Button
                type="button"
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="bg-[#004EDC] text-white hover:bg-[#004EDC]/90 px-6"
              >
                {isLoadingMore ? "Đang tải thêm..." : "Tải thêm"}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
