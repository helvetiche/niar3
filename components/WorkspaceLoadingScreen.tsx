"use client";

import { useEffect, useState } from "react";
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
}: {
  onComplete?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [quote, setQuote] = useState(QUOTES[0]);

  useEffect(() => {
    setQuote(QUOTES[Math.floor(Math.random() * QUOTES.length)]);
  }, []);

  useEffect(() => {
    const start = performance.now();

    const tick = () => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, (elapsed / DURATION_MS) * 100);
      setProgress(Math.floor(p));

      if (p >= 100) {
        setIsDone(true);
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    if (!isDone) return;

    const timer = setTimeout(() => {
      gsap.to("#workspace-loading-overlay", {
        opacity: 0,
        duration: 0.4,
        ease: "power2.out",
        onComplete: () => {
          setIsVisible(false);
          onComplete?.();
        },
      });
    }, 400);

    return () => clearTimeout(timer);
  }, [isDone, onComplete]);

  if (!isVisible) return null;

  return (
    <div
      id="workspace-loading-overlay"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-900/90 backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 text-white">
          {isDone ? (
            <CheckCircleIcon size={32} weight="fill" className="shrink-0 text-white" />
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
              className="flex h-full items-center justify-end overflow-hidden rounded-full pr-1 transition-[width] duration-75 ease-out"
              style={{ width: `${progress}%` }}
            >
              <div className="h-[85%] w-full rounded-full bg-white shadow-[0_0_20px_rgba(255,255,255,0.5),0_0_40px_rgba(255,255,255,0.2)]" />
            </div>
          </div>
        </div>
        <p className="tabular-nums text-sm font-medium text-white/90">
          {progress}%
        </p>
        <p className="max-w-md text-center text-sm italic text-white/70">
          {quote}
        </p>
      </div>
    </div>
  );
}
