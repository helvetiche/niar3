"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Root error boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-emerald-950 px-4">
      <div className="max-w-md rounded-xl border-2 border-dashed border-emerald-700/60 bg-emerald-900/50 p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-white/80">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-emerald-900"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
