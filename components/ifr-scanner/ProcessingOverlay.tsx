"use client";

import {
  CheckCircleIcon,
  ClockCountdownIcon,
  WrenchIcon,
} from "@phosphor-icons/react";

interface ProcessingOverlayProps {
  isVisible: boolean;
  isOpaque: boolean;
  isFinalizing: boolean;
  elapsedSeconds: number;
}

const formatElapsedTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins <= 0) return `${String(secs)}s`;
  return `${String(mins)}m ${String(secs).padStart(2, "0")}s`;
};

export function ProcessingOverlay({
  isVisible,
  isOpaque,
  isFinalizing,
  elapsedSeconds,
}: ProcessingOverlayProps) {
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-emerald-900/90 backdrop-blur-sm transition-opacity duration-300 ${
        isOpaque ? "opacity-100" : "opacity-0"
      }`}
      aria-live="polite"
    >
      <div className="w-[92%] max-w-lg rounded-2xl border border-white/15 bg-emerald-950/55 p-6 text-white shadow-2xl">
        <div className="mb-4 flex items-center gap-3">
          {isFinalizing ? (
            <CheckCircleIcon size={28} weight="fill" className="text-white" />
          ) : (
            <WrenchIcon size={28} weight="duotone" className="text-white" />
          )}
          <p className="text-lg font-medium">
            {isFinalizing ? "Done" : "Processing IFR"}
          </p>
        </div>

        <div className="relative h-4 overflow-hidden rounded-full bg-emerald-950/80 ring-2 ring-white/20 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
          <div className="scanner-loading-bar absolute left-0 top-0 h-full w-2/5 rounded-full bg-white" />
        </div>

        <div className="mt-3 flex items-center justify-between text-sm text-white/90">
          <p>
            {isFinalizing
              ? "Finalizing and preparing download..."
              : "Please wait..."}
          </p>
          <p className="inline-flex items-center gap-1 tabular-nums font-medium">
            <ClockCountdownIcon size={14} />
            Time Elapsed: {formatElapsedTime(elapsedSeconds)}
          </p>
        </div>

        <p className="mt-2 text-xs text-white/80">
          Do not interrupt or close this window while processing.
        </p>
      </div>
      <style jsx>{`
        .scanner-loading-bar {
          animation: scanner-loading-slide 1.2s ease-in-out infinite;
        }

        @keyframes scanner-loading-slide {
          0% {
            transform: translateX(-120%);
          }
          50% {
            transform: translateX(170%);
          }
          100% {
            transform: translateX(-120%);
          }
        }
      `}</style>
    </div>
  );
}
