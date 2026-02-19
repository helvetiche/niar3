import { useState, useRef, useEffect, useCallback } from "react";

const OVERLAY_OPAQUE_MS = 280;
const OVERLAY_FADE_MS = 320;
const OVERLAY_ERROR_FADE_MS = 240;

const wait = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export function useProcessingTimer() {
  const [isOverlayVisible, setIsOverlayVisible] = useState(false);
  const [isOverlayOpaque, setIsOverlayOpaque] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const elapsedIntervalRef = useRef<number | null>(null);

  const startTimer = useCallback(() => {
    setElapsedSeconds(0);
    setIsFinalizing(false);
    setIsOverlayVisible(true);
    setIsOverlayOpaque(false);
    window.requestAnimationFrame(() => {
      setIsOverlayOpaque(true);
    });

    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
    }
    elapsedIntervalRef.current = window.setInterval(() => {
      setElapsedSeconds((previous) => previous + 1);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (elapsedIntervalRef.current !== null) {
      window.clearInterval(elapsedIntervalRef.current);
      elapsedIntervalRef.current = null;
    }
  }, []);

  const finishSuccess = useCallback(async () => {
    setIsFinalizing(true);
    stopTimer();
    await wait(OVERLAY_OPAQUE_MS);
    setIsOverlayOpaque(false);
    await wait(OVERLAY_FADE_MS);
    setIsOverlayVisible(false);
  }, [stopTimer]);

  const finishError = useCallback(async () => {
    stopTimer();
    setIsOverlayOpaque(false);
    await wait(OVERLAY_ERROR_FADE_MS);
    setIsOverlayVisible(false);
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      if (elapsedIntervalRef.current !== null) {
        window.clearInterval(elapsedIntervalRef.current);
      }
    };
  }, []);

  return {
    isOverlayVisible,
    isOverlayOpaque,
    elapsedSeconds,
    isFinalizing,
    startTimer,
    finishSuccess,
    finishError,
  };
}
