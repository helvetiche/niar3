"use client";

import { useState } from "react";
import { ArrowsClockwiseIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";

export function RefreshSessionButton() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshSession = async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    toast.loading("Refreshing session...", { id: "refresh" });

    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={() => {
        void refreshSession();
      }}
      disabled={isRefreshing}
      className="inline-flex items-center gap-2 rounded-lg border border-white/35 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
    >
      <ArrowsClockwiseIcon size={16} weight="duotone" />
      {isRefreshing ? "Refreshing..." : "Refresh Session"}
    </button>
  );
}
