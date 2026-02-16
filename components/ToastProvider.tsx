"use client";

import { Toaster } from "react-hot-toast";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        containerStyle={{ top: 24, zIndex: 99999 }}
        toastOptions={{
          className: "!bg-emerald-900 !text-white !border-emerald-300/30",
        }}
      />
    </>
  );
}
