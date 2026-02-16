"use client";

import { useEffect, useState } from "react";
import { gsap } from "gsap";
import { WrenchIcon, CheckCircleIcon } from "@phosphor-icons/react";

const DURATION_MS = 1000;

export function WorkspaceLoadingScreen({
  onComplete,
}: {
  onComplete?: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

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
      </div>
    </div>
  );
}
