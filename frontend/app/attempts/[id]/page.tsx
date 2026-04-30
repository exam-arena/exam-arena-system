"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AttemptFocusViolationDialog } from "@/components/attempt/AttemptFocusViolationDialog";
import { AttemptFullscreenWarningDialog } from "@/components/attempt/AttemptFullscreenWarningDialog";
import { AttemptTabBlockedScreen } from "@/components/attempt/AttemptTabBlockedScreen";
import { ExamLayout } from "@/components/attempt/ExamLayout";
import { Sidebar } from "@/components/attempt/sidebar/Sidebar";
import { ExamHeader } from "@/components/attempt/content/ExamHeader";
import { BottomNav } from "@/components/attempt/content/BottomNav";
import { Question } from "@/components/attempt/content/Question";
import { MultipleChoice } from "@/components/attempt/questions/MultipleChoice";
import { TrueFalse } from "@/components/attempt/questions/TrueFalse";
import { ShortAnswer } from "@/components/attempt/questions/ShortAnswer";
import { BrandedLoadingScreen } from "@/components/shared/BrandedLoadingScreen";
import { LatexText } from "@/components/shared/LatexText";
import { ExplanationCard } from "@/components/attempt/content/ExplanationCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ApiError } from "@/lib/api/client";
import { getAttempt, saveAttemptAnswers, submitAttempt } from "@/lib/api/attempts/api";
import type { AttemptData, AttemptExplanationBlock, SaveAttemptAnswerInput } from "@/lib/api/attempts/types";

interface GroupedQuestion {
  id: string;
  type: string;
  content: string;
  imageUrl: string | null;
  options: { id: string; text: string }[] | null;
  correct_answer?: string | null;
  explanation?: string;
  explanation_blocks?: AttemptExplanationBlock[];
  children?: {
    id: string;
    content: string;
    options: { id: string; text: string }[];
    correct_answer?: string | null;
    explanation?: string;
    explanation_blocks?: AttemptExplanationBlock[];
  }[];
  sTitle: string;
  sDesc: string;
  globalNum: number;
}

type SaveState = "idle" | "saving" | "saved" | "error";
type SubmitState = "idle" | "submitting";

const AUTOSAVE_DEBOUNCE_MS = 5000;
const AUTOSAVE_RETRY_BASE_MS = 1500;
const AUTOSAVE_RETRY_MAX_MS = 8000;
const ATTEMPT_TAB_LOCK_TTL_MS = 5000;
const ATTEMPT_TAB_LOCK_HEARTBEAT_MS = 2000;
const ATTEMPT_TIME_RESYNC_MS = 60000;
const ATTEMPT_MAX_FOCUS_VIOLATIONS = 3;
const TRUE_FALSE_LABELS = ["a", "b", "c", "d", "e", "f"];

function formatCorrectAnswer(answer?: string | null) {
  if (answer === "True") return "Đúng";
  if (answer === "False") return "Sai";
  return answer ?? undefined;
}

interface AttemptTabLockPayload {
  tabId: string;
  updatedAt: number;
}

function buildAttemptTabLockKey(attemptId: string) {
  return `attempt-active-tab:${attemptId}`;
}

function parseAttemptTabLockPayload(raw: string | null): AttemptTabLockPayload | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AttemptTabLockPayload;
    if (!parsed?.tabId || typeof parsed.updatedAt !== "number") {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function isAttemptTabLockFresh(lock: AttemptTabLockPayload | null) {
  if (!lock) {
    return false;
  }

  return Date.now() - lock.updatedAt < ATTEMPT_TAB_LOCK_TTL_MS;
}

export default function AttemptPage() {
  const params = useParams();
  const id = params?.id as string;
  const router = useRouter();

  const [examData, setExamData] = useState<AttemptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [dirtyAnswers, setDirtyAnswers] = useState<Record<string, string>>({});
  const [savedAnswers, setSavedAnswers] = useState<Record<string, string>>({});
  const [savingAnswers, setSavingAnswers] = useState<Record<string, true>>({});
  const [retryingAnswers, setRetryingAnswers] = useState<Record<string, string>>({});
  const [invalidAnswerErrors, setInvalidAnswerErrors] = useState<Record<string, string>>({});
  const [terminalAnswerErrors, setTerminalAnswerErrors] = useState<Record<string, string>>({});
  const [bookmarks, setBookmarks] = useState<Set<number>>(new Set());
  const [mode] = useState<"exam" | "review">("exam");
  const [, setSaveState] = useState<SaveState>("idle");
  const [, setSaveError] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false);
  const [isFullscreenWarningOpen, setIsFullscreenWarningOpen] = useState(false);
  const [isFocusViolationDialogOpen, setIsFocusViolationDialogOpen] = useState(false);
  const [fullscreenCountdown, setFullscreenCountdown] = useState(10);
  const [focusViolationCount, setFocusViolationCount] = useState(0);
  const [isTabBlocked, setIsTabBlocked] = useState(false);
  const [attemptClockMs, setAttemptClockMs] = useState(0);
  const [attemptServerOffsetMs, setAttemptServerOffsetMs] = useState<number | null>(null);

  const answersRef = useRef<Record<string, string>>({});
  const dirtyAnswersRef = useRef<Record<string, string>>({});
  const savedAnswersRef = useRef<Record<string, string>>({});
  const submitStateRef = useRef<SubmitState>("idle");
  const autosaveTimerRef = useRef<number | null>(null);
  const retryTimerRef = useRef<number | null>(null);
  const retryAttemptsRef = useRef<Record<string, number>>({});
  const fullscreenCountdownTimerRef = useRef<number | null>(null);
  const wasFullscreenActiveRef = useRef(false);
  const suppressNextFullscreenWarningRef = useRef(false);
  const submitAttemptFlowRef = useRef<(() => Promise<void>) | null>(null);
  const tabLockHeartbeatRef = useRef<number | null>(null);
  const attemptTimeTickRef = useRef<number | null>(null);
  const attemptTimeResyncRef = useRef<number | null>(null);
  const hydratedAttemptIdRef = useRef<string | null>(null);
  const focusViolationCountRef = useRef(0);
  const isFocusAwayRef = useRef(false);
  const shouldReportFocusViolationRef = useRef(false);
  const [tabId] = useState(() =>
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : "attempt-tab-fallback"
  );
  const tabIdRef = useRef(tabId);

  const stopAttemptTabHeartbeat = useCallback(() => {
    if (tabLockHeartbeatRef.current !== null) {
      window.clearInterval(tabLockHeartbeatRef.current);
      tabLockHeartbeatRef.current = null;
    }
  }, []);

  const stopAttemptTimeSync = useCallback(() => {
    if (attemptTimeTickRef.current !== null) {
      window.clearInterval(attemptTimeTickRef.current);
      attemptTimeTickRef.current = null;
    }
    if (attemptTimeResyncRef.current !== null) {
      window.clearInterval(attemptTimeResyncRef.current);
      attemptTimeResyncRef.current = null;
    }
  }, []);

  const releaseAttemptTabLock = useCallback(() => {
    if (typeof window === "undefined" || !id) {
      return;
    }

    const lockKey = buildAttemptTabLockKey(id);
    const currentLock = parseAttemptTabLockPayload(window.localStorage.getItem(lockKey));
    if (currentLock?.tabId === tabIdRef.current) {
      window.localStorage.removeItem(lockKey);
    }
  }, [id]);

  const acquireAttemptTabLock = useCallback(() => {
    if (typeof window === "undefined" || !id) {
      return true;
    }

    const lockKey = buildAttemptTabLockKey(id);
    const currentLock = parseAttemptTabLockPayload(window.localStorage.getItem(lockKey));

    if (
      currentLock &&
      currentLock.tabId !== tabIdRef.current &&
      isAttemptTabLockFresh(currentLock)
    ) {
      setIsTabBlocked(true);
      return false;
    }

    const nextLock: AttemptTabLockPayload = {
      tabId: tabIdRef.current,
      updatedAt: Date.now(),
    };

    window.localStorage.setItem(lockKey, JSON.stringify(nextLock));

    const persistedLock = parseAttemptTabLockPayload(window.localStorage.getItem(lockKey));
    const acquired = persistedLock?.tabId === tabIdRef.current;
    setIsTabBlocked(!acquired);
    if (!acquired) {
      setIsLeaveDialogOpen(false);
      setIsFullscreenWarningOpen(false);
      setIsFocusViolationDialogOpen(false);
    }
    return acquired;
  }, [id]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    dirtyAnswersRef.current = dirtyAnswers;
  }, [dirtyAnswers]);

  useEffect(() => {
    savedAnswersRef.current = savedAnswers;
  }, [savedAnswers]);

  useEffect(() => {
    submitStateRef.current = submitState;
  }, [submitState]);

  useEffect(() => {
    focusViolationCountRef.current = focusViolationCount;
  }, [focusViolationCount]);

  useEffect(() => {
    if (!id) {
      return;
    }

    const trySyncAttemptTabLock = () => {
      if (submitStateRef.current === "submitting") {
        return;
      }

      acquireAttemptTabLock();
    };

    trySyncAttemptTabLock();
    stopAttemptTabHeartbeat();
    tabLockHeartbeatRef.current = window.setInterval(
      trySyncAttemptTabLock,
      ATTEMPT_TAB_LOCK_HEARTBEAT_MS
    );

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== buildAttemptTabLockKey(id)) {
        return;
      }

      trySyncAttemptTabLock();
    };

    const handlePageHide = () => {
      releaseAttemptTabLock();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("pagehide", handlePageHide);
      stopAttemptTabHeartbeat();
      releaseAttemptTabLock();
    };
  }, [acquireAttemptTabLock, id, releaseAttemptTabLock, stopAttemptTabHeartbeat]);

  useEffect(() => {
    if (!id) return;

    let isMounted = true;

    getAttempt(id)
      .then((res) => {
        if (!isMounted) return;
        if (res.status && res.status !== "in_progress") {
          router.replace(`/attempts/${id}/result`);
          return;
        }

        if (hydratedAttemptIdRef.current !== res.attempt_id) {
          const restoredAnswers = res.user_answers ?? {};
          setAnswers(restoredAnswers);
          setDirtyAnswers({});
          setSavedAnswers(restoredAnswers);
          hydratedAttemptIdRef.current = res.attempt_id ?? null;
        }

        setAttemptClockMs(Date.now());
        setAttemptServerOffsetMs(
          res.server_time ? Date.parse(res.server_time) - Date.now() : null
        );
        setExamData(res);
      })
      .catch(() => {
        if (!isMounted) return;
        setLoadError("Không thể tải dữ liệu bài thi. Vui lòng thử lại.");
      })
      .finally(() => {
        if (!isMounted) return;
        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [id, router]);

  useEffect(() => {
    const startedAt = examData?.started_at ? Date.parse(examData.started_at) : NaN;
    const serverTime = examData?.server_time ? Date.parse(examData.server_time) : NaN;
    const durationSeconds = examData?.duration_seconds ?? 0;

    if (!Number.isFinite(startedAt) || !Number.isFinite(serverTime) || durationSeconds <= 0) {
      stopAttemptTimeSync();
      return;
    }

    stopAttemptTimeSync();

    attemptTimeTickRef.current = window.setInterval(() => {
      setAttemptClockMs(Date.now());
    }, 1000);

    return () => {
      stopAttemptTimeSync();
    };
  }, [
    examData?.duration_seconds,
    examData?.server_time,
    examData?.started_at,
    stopAttemptTimeSync,
  ]);

  const remainingSeconds = useMemo(() => {
    const startedAt = examData?.started_at ? Date.parse(examData.started_at) : NaN;
    const durationSeconds = examData?.duration_seconds ?? 0;

    if (
      !Number.isFinite(startedAt) ||
      durationSeconds <= 0 ||
      attemptServerOffsetMs === null ||
      attemptClockMs === 0
    ) {
      return null;
    }

    const endAtMs = startedAt + durationSeconds * 1000;
    return Math.max(0, Math.ceil((endAtMs - (attemptClockMs + attemptServerOffsetMs)) / 1000));
  }, [attemptClockMs, attemptServerOffsetMs, examData]);

  useEffect(() => {
    if (!id || !examData?.attempt_id || isTabBlocked) {
      if (attemptTimeResyncRef.current !== null) {
        window.clearInterval(attemptTimeResyncRef.current);
        attemptTimeResyncRef.current = null;
      }
      return;
    }

    const syncAttemptTiming = async () => {
      try {
        const latest = await getAttempt(id);
        if (latest.status && latest.status !== "in_progress") {
          router.replace(`/attempts/${id}/result`);
          return;
        }

        setAttemptClockMs(Date.now());
        setAttemptServerOffsetMs(
          latest.server_time ? Date.parse(latest.server_time) - Date.now() : null
        );
        setExamData((prev) => {
          if (!prev) {
            return latest;
          }

          return {
            ...prev,
            status: latest.status,
            started_at: latest.started_at,
            duration_seconds: latest.duration_seconds,
            server_time: latest.server_time,
            user_answers: latest.user_answers ?? prev.user_answers,
          };
        });
      } catch {
        // Keep local countdown running; later events can resync again.
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void syncAttemptTiming();
      }
    };

    const handleOnline = () => {
      void syncAttemptTiming();
    };

    if (attemptTimeResyncRef.current !== null) {
      window.clearInterval(attemptTimeResyncRef.current);
    }

    attemptTimeResyncRef.current = window.setInterval(() => {
      void syncAttemptTiming();
    }, ATTEMPT_TIME_RESYNC_MS);

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      if (attemptTimeResyncRef.current !== null) {
        window.clearInterval(attemptTimeResyncRef.current);
        attemptTimeResyncRef.current = null;
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
    };
  }, [examData?.attempt_id, id, isTabBlocked, router]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverflow = html.style.overflow;
    const prevBodyOverflow = body.style.overflow;

    html.style.setProperty("overflow", "hidden", "important");
    body.style.setProperty("overflow", "hidden", "important");

    return () => {
      html.style.overflow = prevHtmlOverflow;
      body.style.overflow = prevBodyOverflow;
    };
  }, [releaseAttemptTabLock, stopAttemptTabHeartbeat]);

  useEffect(() => {
    return () => {
      stopAttemptTabHeartbeat();
      stopAttemptTimeSync();
      releaseAttemptTabLock();
      if (autosaveTimerRef.current !== null) {
        window.clearTimeout(autosaveTimerRef.current);
      }
      if (retryTimerRef.current !== null) {
        window.clearTimeout(retryTimerRef.current);
      }
      if (fullscreenCountdownTimerRef.current !== null) {
        window.clearInterval(fullscreenCountdownTimerRef.current);
      }
    };
  }, [releaseAttemptTabLock, stopAttemptTabHeartbeat, stopAttemptTimeSync]);

  useEffect(() => {
    const markFocusViolationStart = () => {
      if (submitStateRef.current === "submitting" || isTabBlocked) {
        return;
      }

      if (!isFocusAwayRef.current) {
        isFocusAwayRef.current = true;
        shouldReportFocusViolationRef.current = true;
      }
    };

    const handleFocusReturn = () => {
      if (!isFocusAwayRef.current || !shouldReportFocusViolationRef.current) {
        isFocusAwayRef.current = false;
        return;
      }

      isFocusAwayRef.current = false;
      shouldReportFocusViolationRef.current = false;

      const nextViolationCount = focusViolationCountRef.current + 1;
      focusViolationCountRef.current = nextViolationCount;
      setFocusViolationCount(nextViolationCount);

      if (nextViolationCount >= ATTEMPT_MAX_FOCUS_VIOLATIONS) {
        setIsFocusViolationDialogOpen(false);
        void submitAttemptFlowRef.current?.();
        return;
      }

      if (!isFullscreenWarningOpen) {
        setIsFocusViolationDialogOpen(true);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        markFocusViolationStart();
        return;
      }

      if (document.visibilityState === "visible") {
        handleFocusReturn();
      }
    };

    const handleWindowBlur = () => {
      markFocusViolationStart();
    };

    const handleWindowFocus = () => {
      handleFocusReturn();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [isFullscreenWarningOpen, isTabBlocked]);

  useEffect(() => {
    const historyState = { attemptId: id, examLock: true };

    window.history.pushState(historyState, "", window.location.href);

    const handlePopState = () => {
      if (submitStateRef.current === "submitting") {
        return;
      }

      if (isTabBlocked) {
        window.history.pushState(historyState, "", window.location.href);
        return;
      }

      window.history.pushState(historyState, "", window.location.href);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [id, isTabBlocked]);

  useEffect(() => {
    wasFullscreenActiveRef.current = Boolean(document.fullscreenElement);

    const handleFullscreenChange = () => {
      const isFullscreenActive = Boolean(document.fullscreenElement);

      if (isFullscreenActive) {
        wasFullscreenActiveRef.current = true;
        suppressNextFullscreenWarningRef.current = false;
        setIsFullscreenWarningOpen(false);
        setFullscreenCountdown(10);
        if (fullscreenCountdownTimerRef.current !== null) {
          window.clearInterval(fullscreenCountdownTimerRef.current);
          fullscreenCountdownTimerRef.current = null;
        }
        return;
      }

      if (suppressNextFullscreenWarningRef.current) {
        suppressNextFullscreenWarningRef.current = false;
        return;
      }

      if (!wasFullscreenActiveRef.current || submitStateRef.current === "submitting") {
        return;
      }

      setIsFullscreenWarningOpen(true);
      setFullscreenCountdown(10);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    if (!isFullscreenWarningOpen) {
      if (fullscreenCountdownTimerRef.current !== null) {
        window.clearInterval(fullscreenCountdownTimerRef.current);
        fullscreenCountdownTimerRef.current = null;
      }
      return;
    }

    if (fullscreenCountdownTimerRef.current !== null) {
      window.clearInterval(fullscreenCountdownTimerRef.current);
    }

    fullscreenCountdownTimerRef.current = window.setInterval(() => {
      setFullscreenCountdown((prev) => {
        if (prev <= 1) {
          if (fullscreenCountdownTimerRef.current !== null) {
            window.clearInterval(fullscreenCountdownTimerRef.current);
            fullscreenCountdownTimerRef.current = null;
          }
          setIsFullscreenWarningOpen(false);
          void submitAttemptFlowRef.current?.();
          return 0;
        }

        return prev - 1;
      });
    }, 1000);

    return () => {
      if (fullscreenCountdownTimerRef.current !== null) {
        window.clearInterval(fullscreenCountdownTimerRef.current);
        fullscreenCountdownTimerRef.current = null;
      }
    };
  }, [isFullscreenWarningOpen]);

  useEffect(() => {
    if (remainingSeconds !== 0 || submitStateRef.current === "submitting" || isTabBlocked) {
      return;
    }

    void submitAttemptFlowRef.current?.();
  }, [isTabBlocked, remainingSeconds]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (submitStateRef.current === "submitting") {
        return;
      }

      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (submitStateRef.current === "submitting" || isTabBlocked) {
        return;
      }

      const key = event.key.toLowerCase();
      const isRefreshShortcut =
        event.key === "F5" ||
        ((event.ctrlKey || event.metaKey) && key === "r");

      if (!isRefreshShortcut) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
    };

    window.addEventListener("keydown", handleKeyDown, true);

    return () => {
      window.removeEventListener("keydown", handleKeyDown, true);
    };
  }, [isTabBlocked]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (submitStateRef.current === "submitting") {
        return;
      }

      if (event.defaultPrevented || event.button !== 0) {
        return;
      }

      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) {
        return;
      }

      if (anchor.target && anchor.target !== "_self") {
        return;
      }

      if (anchor.hasAttribute("download")) {
        return;
      }

      const nextUrl = new URL(anchor.href, window.location.href);
      const currentUrl = new URL(window.location.href);

      if (nextUrl.origin !== currentUrl.origin) {
        return;
      }

      if (nextUrl.href === currentUrl.href) {
        return;
      }

      event.preventDefault();
      setIsLeaveDialogOpen(true);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, []);

  const clearAutosaveTimer = useCallback(() => {
    if (autosaveTimerRef.current !== null) {
      window.clearTimeout(autosaveTimerRef.current);
      autosaveTimerRef.current = null;
    }
  }, []);

  const clearRetryTimer = useCallback(() => {
    if (retryTimerRef.current !== null) {
      window.clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const clearQuestionFeedback = useCallback((questionIds: string[]) => {
    if (questionIds.length === 0) return;

    setSavingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });

    setRetryingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });

    setInvalidAnswerErrors((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });

    setTerminalAnswerErrors((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });
  }, []);

  const markQuestionsSaving = useCallback((questionIds: string[]) => {
    clearRetryTimer();

    setSavingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        next[questionId] = true;
      });
      return next;
    });

    setRetryingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });
  }, [clearRetryTimer]);

  const handleSaveSuccess = useCallback((pendingAnswers: Record<string, string>) => {
    const questionIds = Object.keys(pendingAnswers);

    setSaveState("saved");
    setSaveError(null);
    clearQuestionFeedback(questionIds);

    setSavedAnswers((prev) => {
      const next = { ...prev };
      for (const [questionId, selectedAns] of Object.entries(pendingAnswers)) {
        if (answersRef.current[questionId] === selectedAns) {
          next[questionId] = selectedAns;
        }
      }
      return next;
    });

    setDirtyAnswers((prev) => {
      const next = { ...prev };
      for (const [questionId, selectedAns] of Object.entries(pendingAnswers)) {
        if (answersRef.current[questionId] === selectedAns) {
          delete next[questionId];
          retryAttemptsRef.current[questionId] = 0;
        }
      }
      return next;
    });
  }, [clearQuestionFeedback]);

  const scheduleRetry = useCallback((questionIds: string[]) => {
    if (questionIds.length === 0) return;

    clearRetryTimer();

    const nextAttempt = Math.max(
      ...questionIds.map((questionId) => {
        const value = (retryAttemptsRef.current[questionId] ?? 0) + 1;
        retryAttemptsRef.current[questionId] = value;
        return value;
      })
    );

    const delay = Math.min(
      AUTOSAVE_RETRY_BASE_MS * 2 ** Math.max(0, nextAttempt - 1),
      AUTOSAVE_RETRY_MAX_MS
    );

    retryTimerRef.current = window.setTimeout(() => {
      retryTimerRef.current = null;
      setDirtyAnswers((prev) => ({ ...prev }));
    }, delay);
  }, [clearRetryTimer]);

  const handleSaveFailure = useCallback((error: unknown, pendingAnswers: Record<string, string>) => {
    const questionIds = Object.keys(pendingAnswers);

    setSaveState("error");
    setSavingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        delete next[questionId];
      });
      return next;
    });

    if (error instanceof ApiError) {
      if (error.status === 422) {
        const message =
          error.details?.[0]?.message || "Câu trả lời chưa hợp lệ. Vui lòng kiểm tra lại.";
        setSaveError(message);
        setInvalidAnswerErrors((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            next[questionId] = message;
            retryAttemptsRef.current[questionId] = 0;
          });
          return next;
        });
        setRetryingAnswers((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            delete next[questionId];
          });
          return next;
        });
        setDirtyAnswers((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            delete next[questionId];
          });
          return next;
        });
        return false;
      }

      if ([401, 403, 404, 409].includes(error.status)) {
        const message =
          error.status === 409
            ? "Bài làm không còn ở trạng thái cho phép lưu."
            : error.message || "Không thể lưu đáp án lúc này.";
        setSaveError(message);
        setTerminalAnswerErrors((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            next[questionId] = message;
            retryAttemptsRef.current[questionId] = 0;
          });
          return next;
        });
        setRetryingAnswers((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            delete next[questionId];
          });
          return next;
        });
        setDirtyAnswers((prev) => {
          const next = { ...prev };
          questionIds.forEach((questionId) => {
            delete next[questionId];
          });
          return next;
        });
        return false;
      }
    }

    const message = "Lưu thất bại tạm thời. Hệ thống sẽ tự động thử lại.";
    setSaveError(message);
    setRetryingAnswers((prev) => {
      const next = { ...prev };
      questionIds.forEach((questionId) => {
        next[questionId] = message;
      });
      return next;
    });
    scheduleRetry(questionIds);
    return false;
  }, [scheduleRetry]);

  const flushPendingAnswersNow = useCallback(async (snapshot?: Record<string, string>) => {
    if (!examData?.attempt_id || mode !== "exam") return true;
    if (isTabBlocked) return false;

    clearAutosaveTimer();

    const pendingAnswers = snapshot ?? dirtyAnswersRef.current;
    const entries = Object.entries(pendingAnswers);
    if (entries.length === 0) return true;
    const validQuestionIds = new Set(
      (examData.questions ?? []).map((question) => question.question_id).filter(Boolean)
    );
    const filteredEntries = entries.filter(([questionId]) => validQuestionIds.has(questionId));
    if (filteredEntries.length === 0) {
      return true;
    }

    const payload: SaveAttemptAnswerInput[] = filteredEntries.map(([questionId, selectedAns]) => ({
      question_id: questionId,
      selected_ans: selectedAns,
    }));
    const questionIds = filteredEntries.map(([questionId]) => questionId);

    setSaveState("saving");
    setSaveError(null);
    markQuestionsSaving(questionIds);

    try {
      for (let i = 0; i < payload.length; i += 20) {
        const chunk = payload.slice(i, i + 20);
        await saveAttemptAnswers(examData.attempt_id, chunk);
      }
      handleSaveSuccess(pendingAnswers);
      return true;
    } catch (error) {
      return handleSaveFailure(error, pendingAnswers);
    }
  }, [
    clearAutosaveTimer,
    examData,
    handleSaveFailure,
    handleSaveSuccess,
    isTabBlocked,
    markQuestionsSaving,
    mode,
  ]);

  useEffect(() => {
    if (!examData?.attempt_id || mode !== "exam") return;

    const entries = Object.entries(dirtyAnswers);
    if (entries.length === 0) {
      clearAutosaveTimer();
      return;
    }

    clearAutosaveTimer();

    autosaveTimerRef.current = window.setTimeout(async () => {
      autosaveTimerRef.current = null;

      if (submitStateRef.current === "submitting") return;

      const snapshot = Object.fromEntries(entries);
      await flushPendingAnswersNow(snapshot);
    }, AUTOSAVE_DEBOUNCE_MS);

    return () => {
      clearAutosaveTimer();
    };
  }, [
    clearAutosaveTimer,
    dirtyAnswers,
    examData?.attempt_id,
    flushPendingAnswersNow,
    mode,
  ]);

  const { durationMinutes, questions } = examData || {};

  const allQuestionsArray = useMemo(() => {
    if (!questions) return [];

    const grouped: GroupedQuestion[] = [];
    const childrenMap = new Map<string, AttemptData["questions"]>();

    questions.forEach((question) => {
      if (!question.parent_id) return;

      const siblings = childrenMap.get(question.parent_id) ?? [];
      siblings.push(question);
      childrenMap.set(question.parent_id, siblings);
    });

    questions.forEach((question) => {
      if (question.parent_id) return;

      const cleanContent = question.content.replace(/^Pháº§n\s+[IVX]+\.\s*/i, "");
      const item: GroupedQuestion = {
        id: question.question_id,
        type: question.type,
        content: cleanContent,
        imageUrl: question.image_url,
        options: question.options ?? null,
        correct_answer: question.correct_answer,
        explanation: question.explanation,
        explanation_blocks: question.explanation_blocks,
        sTitle: "",
        sDesc: "",
        globalNum: 0,
      };

      if (question.type === "cluster_context") {
        item.children = (childrenMap.get(question.question_id) ?? []).map((child) => ({
          id: child.question_id,
          content: child.content,
          options: child.options ?? [],
          correct_answer: child.correct_answer,
          explanation: child.explanation,
          explanation_blocks: child.explanation_blocks,
        }));
      }

      grouped.push(item);
    });

    const sectionOne = grouped.filter((question) => question.type === "single_choice");
    const sectionTwo = grouped.filter((question) => question.type === "cluster_context");
    const sectionThree = grouped.filter((question) => question.type === "short_answer");

    const flat = [
      ...sectionOne.map((question) => ({
        ...question,
        sTitle: "Phần I: Câu trắc nghiệm nhiều phương án lựa chọn",
        sDesc: "Thí sinh trả lời các câu hỏi. Mỗi câu hỏi thí sinh chỉ chọn một phương án.",
      })),
      ...sectionTwo.map((question) => ({
        ...question,
        sTitle: "Phần II: Câu trắc nghiệm Đúng - Sai",
        sDesc: "Trong mỗi ý a, b, c, d ở mỗi câu, thí sinh chọn đúng hoặc sai.",
      })),
      ...sectionThree.map((question) => ({
        ...question,
        sTitle: "Phần III: Câu trắc nghiệm trả lời ngắn",
        sDesc: "Thí sinh điền đáp án dạng số vào ô trống.",
      })),
    ];

    return flat.map((question, index) => ({
      ...question,
      globalNum: index + 1,
    }));
  }, [questions]);

  const results = useMemo(() => {
    if (mode !== "review") return undefined;

    const value: Record<number, boolean> = {};
    allQuestionsArray.forEach((question) => {
      if (question.type === "single_choice" || question.type === "short_answer") {
        value[question.globalNum] = answers[question.id] === question.correct_answer;
        return;
      }

      if (question.type === "cluster_context" && question.children) {
        value[question.globalNum] = question.children.every(
          (child) => answers[child.id] === child.correct_answer
        );
      }
    });

    return value;
  }, [allQuestionsArray, answers, mode]);

  const answeredQuestions = useMemo(() => {
    return allQuestionsArray
      .filter((question) => {
        if (question.type === "single_choice" || question.type === "short_answer") {
          return Boolean(answers[question.id]);
        }

        if (question.type === "cluster_context" && question.children) {
          return question.children.some((child) => Boolean(answers[child.id]));
        }

        return false;
      })
      .map((question) => question.globalNum);
  }, [allQuestionsArray, answers]);

  const bookmarkedQuestions = useMemo(() => Array.from(bookmarks), [bookmarks]);

  const handleAnswer = (questionId: string, value: string) => {
    if (isTabBlocked) {
      return;
    }

    clearRetryTimer();
    retryAttemptsRef.current[questionId] = 0;
    answersRef.current = { ...answersRef.current, [questionId]: value };
    dirtyAnswersRef.current = { ...dirtyAnswersRef.current, [questionId]: value };

    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setDirtyAnswers((prev) => ({ ...prev, [questionId]: value }));
    setSavedAnswers((prev) => {
      const next = { ...prev };
      delete next[questionId];
      return next;
    });
    clearQuestionFeedback([questionId]);
    setSaveState("idle");
    setSaveError(null);
  };

  const toggleBookmark = (questionNumber: number) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(questionNumber)) {
        next.delete(questionNumber);
      } else {
        next.add(questionNumber);
      }
      return next;
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!examData?.attempt_id || submitState === "submitting" || isTabBlocked) return;

    setSubmitState("submitting");
    clearAutosaveTimer();
    clearRetryTimer();

    const submitSnapshot: Record<string, string> = { ...dirtyAnswersRef.current };
    for (const [questionId, value] of Object.entries(answersRef.current)) {
      const normalized = value?.trim() ?? "";
      if (!normalized) {
        continue;
      }
      if ((savedAnswersRef.current[questionId] ?? "") !== normalized) {
        submitSnapshot[questionId] = normalized;
      }
    }

    const didSave = await flushPendingAnswersNow(submitSnapshot);
    if (!didSave) {
      setSubmitState("idle");
      return;
    }

    try {
      await submitAttempt(examData.attempt_id);
    } catch {
      setSubmitState("idle");
      setSaveState("error");
      setSaveError("Không thể nộp bài lúc này. Vui lòng thử lại.");
      return;
    }

    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch {
        // Ignore exit errors and continue with submit navigation.
      }
    }

    router.replace(`/attempts/${id}/result`);
  }, [
    clearAutosaveTimer,
    clearRetryTimer,
    examData,
    flushPendingAnswersNow,
    id,
    isTabBlocked,
    router,
    submitState,
  ]);

  useEffect(() => {
    submitAttemptFlowRef.current = handleSubmit;
  }, [handleSubmit]);

  const handleReturnToFullscreen = async () => {
    if (typeof document === "undefined") {
      return;
    }

    const root = document.documentElement;
    if (!root.requestFullscreen) {
      return;
    }

    try {
      suppressNextFullscreenWarningRef.current = true;
      await root.requestFullscreen();
      suppressNextFullscreenWarningRef.current = false;
      setIsFullscreenWarningOpen(false);
      setFullscreenCountdown(10);
    } catch {
      suppressNextFullscreenWarningRef.current = false;
    }
  };

  if (!id) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#f7fbff] px-6 text-center">
        <p className="text-base font-medium text-[#0f172a]">Không tìm thấy mã bài thi.</p>
      </div>
    );
  }

  if (isLoading) {
    return <BrandedLoadingScreen message="Đang tải dữ liệu bài thi..." />;
  }

  if (loadError || !examData) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center gap-4 bg-[#f7fbff] px-6 text-center">
        <p className="text-base font-medium text-[#0f172a]">
          {loadError ?? "Không thể mở bài thi này."}
        </p>
        <button
          type="button"
          onClick={() => router.refresh()}
          className="rounded-full bg-mediumslateblue px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#003bb0]"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (isTabBlocked) {
    return <AttemptTabBlockedScreen onGoHome={() => router.replace("/")} />;
  }

  const currentQuestion = allQuestionsArray[currentIndex];
  const { user } = examData;

  const currentQuestionAnswerIds = currentQuestion
    ? currentQuestion.type === "cluster_context" && currentQuestion.children
      ? currentQuestion.children.map((child) => child.id)
      : [currentQuestion.id]
    : [];

  const hasCurrentQuestionAnswer = currentQuestionAnswerIds.some((questionId) => Boolean(answers[questionId]));
  const hasCurrentQuestionDirtyAnswer = currentQuestionAnswerIds.some((questionId) => {
    const value = answers[questionId];
    return Boolean(value) && dirtyAnswers[questionId] === value;
  });
  const hasCurrentQuestionSavedAnswer = currentQuestionAnswerIds.some((questionId) => {
    const value = answers[questionId];
    return Boolean(value) && savedAnswers[questionId] === value;
  });
  const currentQuestionSaving = currentQuestionAnswerIds.some((questionId) => Boolean(savingAnswers[questionId]));
  const currentQuestionRetrying = currentQuestionAnswerIds.some((questionId) => Boolean(retryingAnswers[questionId]));
  const currentQuestionInvalidError =
    currentQuestionAnswerIds.map((questionId) => invalidAnswerErrors[questionId]).find(Boolean) ?? null;
  const currentQuestionTerminalError =
    currentQuestionAnswerIds.map((questionId) => terminalAnswerErrors[questionId]).find(Boolean) ?? null;

  const currentQuestionBadgeText =
    submitState === "submitting"
      ? "Đang nộp bài..."
      : currentQuestionTerminalError
        ? currentQuestionTerminalError
        : currentQuestionInvalidError
          ? currentQuestionInvalidError
          : currentQuestionSaving
            ? "Đang lưu đáp án..."
            : currentQuestionRetrying
              ? "Đang thử lưu lại..."
              : hasCurrentQuestionDirtyAnswer
                ? "Chờ lưu..."
                : hasCurrentQuestionSavedAnswer
                  ? "Đã lưu"
                  : null;

  const currentQuestionBadgeClass =
    submitState === "submitting" || currentQuestionSaving || currentQuestionRetrying
      ? "bg-[#e0ecff] text-[#004edc]"
      : currentQuestionInvalidError || currentQuestionTerminalError
        ? "bg-[#fff1f2] text-[#be123c]"
        : hasCurrentQuestionDirtyAnswer
          ? "bg-[#f1f5f9] text-[#475569]"
          : hasCurrentQuestionSavedAnswer
            ? "bg-[#e8fff1] text-[#15803d]"
            : "";

  const header = (
    <ExamHeader
      sectionTitle={currentQuestion?.sTitle ?? ""}
      sectionDesc={currentQuestion?.sDesc ?? ""}
      mode={mode}
    />
  );

  const sidebar = (
    <Sidebar
      time={
        remainingSeconds === null
          ? `${durationMinutes}:00`
          : `${String(Math.floor(remainingSeconds / 60)).padStart(2, "0")}:${String(
              remainingSeconds % 60
            ).padStart(2, "0")}`
      }
      totalQuestions={allQuestionsArray.length}
      answeredQuestions={answeredQuestions}
      bookmarkedQuestions={bookmarkedQuestions}
      currentIndex={currentIndex}
      onSelectQuestion={setCurrentIndex}
      onSubmit={handleSubmit}
      user={user}
      mode={mode}
      results={results}
    />
  );

  const bottomBar = (
    <BottomNav
      currentIndex={currentIndex}
      totalQuestions={allQuestionsArray.length}
      onPrev={() => setCurrentIndex((index) => Math.max(0, index - 1))}
      onNext={() => setCurrentIndex((index) => Math.min(allQuestionsArray.length - 1, index + 1))}
    />
  );

  const content = currentQuestion ? (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-end">
        {hasCurrentQuestionAnswer && currentQuestionBadgeText && (
          <div className={`rounded-full px-3 py-1 text-xs font-medium ${currentQuestionBadgeClass}`}>
            {currentQuestionBadgeText}
          </div>
        )}
      </div>

      <Question
        key={currentQuestion.id}
        number={currentQuestion.globalNum}
        text={<LatexText content={currentQuestion.content} />}
        imageUrl={currentQuestion.imageUrl}
        isBookmarked={bookmarks.has(currentQuestion.globalNum)}
        onToggleBookmark={() => toggleBookmark(currentQuestion.globalNum)}
      >
        {currentQuestion.type === "single_choice" && currentQuestion.options && (
          <MultipleChoice
            name={currentQuestion.id}
            options={currentQuestion.options}
            value={answers[currentQuestion.id]}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            mode={mode}
            correctAnswer={currentQuestion.correct_answer ?? undefined}
          />
        )}

        {currentQuestion.type === "cluster_context" && currentQuestion.children && (
          <>
            <TrueFalse
              parentId={currentQuestion.id}
              statements={currentQuestion.children}
              answers={answers}
              onChange={(childId, value) => handleAnswer(childId, value)}
              mode={mode}
              correctAnswers={currentQuestion.children.reduce<Record<string, string | undefined>>(
                (acc, child) => {
                  acc[child.id] = child.correct_answer ?? undefined;
                  return acc;
                },
                {}
              )}
            />

            {mode === "review" && (
              <div className="mt-2 flex flex-col gap-2">
                {currentQuestion.children.map((child, index) => (
                  <ExplanationCard
                    key={child.id}
                    correctAnswerText={`${TRUE_FALSE_LABELS[index] ?? index + 1}. ${formatCorrectAnswer(child.correct_answer) ?? ""}`}
                    explanation={child.explanation}
                    explanationBlocks={child.explanation_blocks}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {currentQuestion.type === "short_answer" && (
          <ShortAnswer
            name={currentQuestion.id}
            value={answers[currentQuestion.id] || ""}
            onChange={(value) => handleAnswer(currentQuestion.id, value)}
            mode={mode}
            correctAnswer={currentQuestion.correct_answer ?? undefined}
          />
        )}

        {mode === "review" &&
          (currentQuestion.type !== "cluster_context" ||
            currentQuestion.explanation ||
            (currentQuestion.explanation_blocks?.length ?? 0) > 0) && (
          <ExplanationCard
            correctAnswerText={formatCorrectAnswer(currentQuestion.correct_answer)}
            explanation={
              currentQuestion.explanation || "Lời giải chi tiết cho câu hỏi này chưa có sẳn."
            }
            explanationBlocks={currentQuestion.explanation_blocks}
          />
        )}
      </Question>

      <div className="h-6" />
    </div>
  ) : null;

  return (
    <>
      <ExamLayout
        header={header}
        content={content}
        sidebar={sidebar}
        bottomBar={bottomBar}
      />

      <AlertDialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận rời bài thi</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn đang trong thời gian làm bài. Nếu rời khỏi màn hình này, cách an toàn là nộp bài ngay bây giờ. Hoặc bạn có thể quay lại tiếp tục làm bài.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Quay lại bài làm</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                setIsLeaveDialogOpen(false);
                void handleSubmit();
              }}
            >
              Xác nhận nộp bài
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isFullscreenWarningOpen && (
        <AttemptFullscreenWarningDialog
          countdown={fullscreenCountdown}
          onReturnToFullscreen={() => {
            void handleReturnToFullscreen();
          }}
        />
      )}

      {isFocusViolationDialogOpen && !isFullscreenWarningOpen && (
        <AttemptFocusViolationDialog
          violationCount={focusViolationCount}
          maxViolations={ATTEMPT_MAX_FOCUS_VIOLATIONS}
          onResume={() => {
            setIsFocusViolationDialogOpen(false);
          }}
        />
      )}
    </>
  );
}
