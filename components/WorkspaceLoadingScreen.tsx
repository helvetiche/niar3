"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { WrenchIcon, CheckCircleIcon } from "@phosphor-icons/react";

const DURATION_MS = 2000;

const QUOTES = [
  "Excellence is not a destination; it's a continuous journey.",
  "The only way to do great work is to love what you do.",
  "Productivity is never an accident. It is always the result of a commitment to excellence.",
  "Do what you can, with what you have, where you are.",
  "Simplicity is the ultimate sophistication.",
  "The secret of getting ahead is getting started.",
  "Quality is not an act, it is a habit.",
  "Efficiency is doing things right; effectiveness is doing the right things.",
  "Small steps lead to big changes.",
  "The best time to plant a tree was 20 years ago. The second best time is now.",
];

export function WorkspaceLoadingScreen({
  onComplete,
  durationMs = DURATION_MS,
}: {
  onComplete?: () => void;
  durationMs?: number;
}) {
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const progressTweenRef = useRef<gsap.core.Tween | null>(null);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [quote] = useState(
    () => QUOTES[Math.floor(Math.random() * QUOTES.length)] ?? QUOTES[0],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setProgress(0);
      setIsDone(false);
    }, 0);
    const progressState = { value: 0 };
    progressTweenRef.current = gsap.to(progressState, {
      value: 100,
      duration: Math.max(0.1, durationMs / 1000),
      ease: "none",
      onUpdate: () => {
        setProgress(Math.round(progressState.value));
      },
      onComplete: () => {
        setProgress(100);
        setIsDone(true);
      },
    });

    return () => {
      clearTimeout(timeoutId);
      progressTweenRef.current?.kill();
      progressTweenRef.current = null;
    };
  }, [durationMs]);

  useEffect(() => {
    if (!isDone) return;

    const timer = setTimeout(() => {
      if (!overlayRef.current) {
        setIsVisible(false);
        onComplete?.();
        return;
      }
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          setIsVisible(false);
          onComplete?.();
        },
      });
    }, 400);

    return () => {
      clearTimeout(timer);
      if (overlayRef.current) {
        gsap.killTweensOf(overlayRef.current);
      }
    };
  }, [isDone, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-900/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          {isDone ? (
            <CheckCircleIcon
              size={32}
              weight="fill"
              className="shrink-0 text-white"
            />
          ) : (
            <WrenchIcon size={32} weight="duotone" className="shrink-0" />
          )}
          <p className="text-xl font-semibold sm:text-2xl">
            {isDone ? "Done" : "Preparing Your Tools"}
          </p>
        </div>
        <div className="relative w-72 sm:w-96">
          <div className="h-4 overflow-hidden rounded-full bg-emerald-950/80 ring-2 ring-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
            <div
              className="h-full origin-left rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,255,255,0.2)] transition-transform duration-75 ease-out"
              style={{
                transform: `scaleX(${Math.min(1, Math.max(0, progress / 100))})`,
              }}
            />
          </div>
        </div>
        <p className="tabular-nums text-sm font-medium text-white/90">
          {progress}%
        </p>
        <p className="max-w-[15.5rem] px-2 text-center text-sm italic text-white/70 sm:max-w-md sm:px-0">
          {quote}
        </p>
      </div>
    </div>
  );
}
