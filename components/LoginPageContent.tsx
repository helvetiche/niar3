"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  SignInIcon,
  PaperPlaneRightIcon,
} from "@phosphor-icons/react";
import { Footer } from "@/components/layout/footer";

type PageView = "login" | "forgot-password";

export const LoginPageContent = () => {
  const router = useRouter();
  const [view, setView] = useState<PageView>("login");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotMessage, setForgotMessage] = useState<string | null>(null);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const email = (form.querySelector("#email") as HTMLInputElement)?.value?.trim();
    const password = (form.querySelector("#password") as HTMLInputElement)?.value;
    if (!email || !password) {
      setError("Please enter email and password.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { getClientAuth } = await import("@/lib/firebase/config");
      const { signInWithEmailAndPassword, signOut } = await import("firebase/auth");
      const auth = getClientAuth();

      await signOut(auth);

      const cred = await signInWithEmailAndPassword(auth, email, password);

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
      router.push("/workspace");
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      const msg = err instanceof Error ? err.message : "Sign in failed";
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
  };

  const handleForgotSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setForgotMessage(null);
    const form = e.currentTarget;
    const email = (form.querySelector("#reset-email") as HTMLInputElement)?.value?.trim();
    if (!email) {
      setError("Please enter your email.");
      return;
    }
    setIsSubmitting(true);
    try {
      const { getClientAuth } = await import("@/lib/firebase/config");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      await sendPasswordResetEmail(getClientAuth(), email);
      setForgotMessage(
        "If an account exists for that email, you will receive reset instructions shortly."
      );
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/invalid-email") {
        setError("Please enter a valid email address.");
      } else if (code === "auth/user-not-found") {
        setForgotMessage(
          "If an account exists for that email, you will receive reset instructions shortly."
        );
      } else {
        const msg = err instanceof Error ? err.message : "Could not send reset email.";
        setError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="relative flex min-h-screen flex-col">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/tools-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-900"
        aria-hidden="true"
      />

      <div className="relative z-10 flex min-h-0 flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center px-4 py-6 sm:px-6">
          <div className="mx-auto w-full max-w-lg pb-2">
          <div className="rounded-2xl border border-white/15 bg-emerald-900/95 p-5 shadow-xl backdrop-blur-sm sm:p-8">
            <div className="mb-5 border-b border-white/10 pb-4">
              <Link
                href="/"
                className="inline-flex w-fit items-center gap-2 rounded-lg px-1 py-0.5 text-sm font-medium text-white/90 transition hover:bg-white/10 hover:text-white"
                aria-label="Back to home"
              >
                <ArrowLeftIcon size={18} weight="bold" aria-hidden />
                Back to home
              </Link>
            </div>
            <div className="mb-6 flex items-start gap-3">
                <Image
                  src="/logo.png"
                  alt="NIA Logo"
                  width={48}
                  height={48}
                  className="h-10 w-auto object-contain"
                />
                <div>
                  <h1 className="text-lg font-semibold text-white sm:text-xl">
                    {view === "login" ? "Login" : "Reset password"}
                  </h1>
                  <p className="text-xs text-white/70 sm:text-sm">
                    NIA Region 3 — Employee Portal
                  </p>
                </div>
              </div>

              <p className="mb-4 text-sm text-white/80">
                {view === "login"
                  ? "Sign in with your official NIA email to access tools, automations, and workflows."
                  : "Enter your NIA email and we’ll send you a link to reset your password."}
              </p>
              {view === "forgot-password" && (
                <p className="mb-4 text-xs text-white/60">
                  After submitting, you&apos;ll receive the reset link at the email you
                  provide. If you don&apos;t see it within a few minutes, check your spam
                  or junk folder—it may have been filtered there.
                </p>
              )}

              {view === "login" ? (
                <form className="space-y-3" onSubmit={handleLoginSubmit}>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@nia.gov.ph"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                  />
                  <div>
                    <input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      placeholder="Password"
                      className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                    />
                    <div className="mt-1.5 flex justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          setView("forgot-password");
                          setError(null);
                        }}
                        className="text-xs text-white/70 underline decoration-white/50 underline-offset-2 transition hover:text-white hover:decoration-white"
                      >
                        Missing password?
                      </button>
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-white/90 disabled:opacity-70"
                  >
                    <SignInIcon size={16} weight="bold" aria-hidden />
                    {isSubmitting ? "Signing in…" : "Sign in"}
                  </button>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handleForgotSubmit}>
                  {error && <p className="text-sm text-red-300">{error}</p>}
                  {forgotMessage && (
                    <p className="text-sm text-emerald-200/90">{forgotMessage}</p>
                  )}
                  <input
                    id="reset-email"
                    name="reset-email"
                    type="email"
                    autoComplete="email"
                    placeholder="your.email@nia.gov.ph"
                    className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white py-2.5 text-sm font-medium text-emerald-900 transition hover:bg-white/90 disabled:opacity-70"
                  >
                    <PaperPlaneRightIcon size={16} weight="bold" aria-hidden />
                    {isSubmitting ? "Sending…" : "Send password reset"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setView("login");
                      setError(null);
                      setForgotMessage(null);
                    }}
                    className="w-full text-center text-xs text-white/70 underline decoration-white/50 underline-offset-2 transition hover:text-white hover:decoration-white"
                  >
                    Back to login
                  </button>
                </form>
              )}
          </div>
          </div>
        </div>
        <Footer />
      </div>
    </main>
  );
};
