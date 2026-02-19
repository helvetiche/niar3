"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignInIcon, XIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import { useModalAnimation } from "@/hooks/useModalAnimation";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type ModalView = "login" | "forgot-password";

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const { overlayRef, panelRef, closeWithAnimation } = useModalAnimation(
    isOpen,
    onClose,
  );
  const [view, setView] = useState<ModalView>("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setView("login");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 opacity-0"
      onClick={closeWithAnimation}
      role="dialog"
      aria-modal="true"
      aria-label="Login"
    >
      <div
        ref={panelRef}
        className="absolute bottom-0 left-1/2 w-full min-w-[280px] max-w-[calc(100vw-2rem)] max-h-[60vh] -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-emerald-900 p-4 shadow-xl sm:max-w-[50vw] sm:p-6 md:max-h-[50vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="NIA Logo"
              width={48}
              height={48}
              className="h-10 w-auto object-contain"
            />
            <div>
              <h3 className="text-base font-semibold text-white">
                {view === "login" ? "Login" : "Reset password"}
              </h3>
              <p className="text-xs text-white/70">
                NIA Region 3 — Employee Portal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeWithAnimation}
            className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon size={20} weight="bold" />
          </button>
        </div>
        <p className="mb-4 text-sm text-white/80">
          {view === "login"
            ? "Sign in with your official NIA email to access tools, automations, and workflows."
            : "Enter your NIA email and we’ll send you a link to reset your password."}
        </p>
        {view === "forgot-password" && (
          <p className="mb-4 text-xs text-white/60">
            After submitting, you&apos;ll receive the reset link at the email
            you provide. If you don&apos;t see it within a few minutes, check
            your spam or junk folder—it may have been filtered there.
          </p>
        )}

        {view === "login" ? (
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              const form = e.currentTarget;
              const email = (
                form.querySelector("#email") as HTMLInputElement
              )?.value?.trim();
              const password = (
                form.querySelector("#password") as HTMLInputElement
              )?.value;
              if (!email || !password) {
                setError("Please enter email and password.");
                return;
              }
              setIsSubmitting(true);
              try {
                const { getClientAuth } = await import("@/lib/firebase/config");
                const { signInWithEmailAndPassword, signOut } =
                  await import("firebase/auth");
                const auth = getClientAuth();

                await signOut(auth);

                const cred = await signInWithEmailAndPassword(
                  auth,
                  email,
                  password,
                );

                await new Promise((resolve) => setTimeout(resolve, 1000));

                const token = await cred.user.getIdToken(true);

                const res = await fetch("/api/v1/auth/session", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token }),
                });
                if (!res.ok) {
                  const data = await res.json().catch(() => ({}));
                  throw new Error(data.error ?? "Session setup failed");
                }
                onClose();
                router.push("/workspace");
              } catch (err) {
                const code = (err as { code?: string }).code ?? "";
                const msg =
                  err instanceof Error ? err.message : "Sign in failed";
                if (
                  code.startsWith("auth/") &&
                  (code.includes("invalid-credential") ||
                    code.includes("wrong-password") ||
                    code.includes("user-not-found"))
                ) {
                  setError("Invalid email or password.");
                } else if (msg.includes("Firebase") || msg.includes("config")) {
                  setError("Sign-in is not configured. Add Firebase env vars.");
                } else {
                  setError(msg);
                }
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            {error && <p className="text-sm text-red-300">{error}</p>}
            <input
              id="email"
              name="email"
              type="email"
              placeholder="your.email@nia.gov.ph"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <div>
              <input
                id="password"
                type="password"
                placeholder="Password"
                className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
              />
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => setView("forgot-password")}
                  className="text-xs text-white/70 underline decoration-white/50 underline-offset-2 transition hover:text-white hover:decoration-white"
                >
                  Missing password?
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-sm font-medium text-emerald-900 transition hover:bg-white/90 disabled:opacity-70"
            >
              <SignInIcon size={16} weight="bold" />
              {isSubmitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
        ) : (
          <form className="space-y-3">
            <input
              id="reset-email"
              type="email"
              placeholder="your.email@nia.gov.ph"
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
            />
            <button
              type="submit"
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-sm font-medium text-emerald-900 transition hover:bg-white/90"
            >
              <PaperPlaneRightIcon size={16} weight="bold" />
              Send password reset
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setView("login");
              }}
              className="w-full text-center text-xs text-white/70 underline decoration-white/50 underline-offset-2 transition hover:text-white hover:decoration-white"
            >
              Back to login
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
