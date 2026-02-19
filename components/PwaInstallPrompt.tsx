"use client";

import { useEffect, useState } from "react";
import { X, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);

      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (!dismissed) {
        setShowPrompt(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  const installPwa = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setShowPrompt(false);
    }

    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    localStorage.setItem("pwa-install-dismissed", "true");
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 animate-in slide-in-from-bottom-5">
      <button
        onClick={dismissPrompt}
        className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-10 h-10 bg-[#004e3b] rounded-lg flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </div>

        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 text-sm mb-1">
            Install NIA Tools
          </h3>
          <p className="text-xs text-gray-600 mb-3">
            Get quick access to productivity tools right from your home screen
          </p>

          <button
            onClick={installPwa}
            className="w-full bg-[#004e3b] hover:bg-[#003d2e] text-white text-sm font-medium py-2 px-4 rounded-md transition-colors"
          >
            Install App
          </button>
        </div>
      </div>
    </div>
  );
}
