"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import toast from "react-hot-toast";
import {
  XIcon,
  KeyIcon,
  PaperPlaneRightIcon,
  UserIcon,
  CalendarBlankIcon,
  EnvelopeIcon,
} from "@phosphor-icons/react";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/types/profile";

const PROFILE_KEY = (uid: string) => `profile_${uid}`;

function loadProfile(uid: string): UserProfile {
  if (typeof window === "undefined")
    return { first: "", middle: "", last: "", birthday: "" };
  try {
    const stored = localStorage.getItem(PROFILE_KEY(uid));
    if (stored) return JSON.parse(stored) as UserProfile;
  } catch {
    /* ignore */
  }
  return { first: "", middle: "", last: "", birthday: "" };
}

function saveProfile(uid: string, profile: UserProfile) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROFILE_KEY(uid), JSON.stringify(profile));
  } catch {
    /* ignore */
  }
}

export function ProfileModal({
  isOpen,
  onClose,
  user,
  profile: initialProfile,
  onProfileChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  profile: UserProfile;
  onProfileChange: (profile: UserProfile) => void;
}) {
  const [profile, setProfile] = useState(initialProfile);
  const [changePasswordSent, setChangePasswordSent] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile, isOpen]);

  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return;
    if (isOpen) {
      gsap.set(overlayRef.current, { display: "block", opacity: 0 });
      gsap.set(panelRef.current, { y: "100%", opacity: 0 });
      gsap.to(overlayRef.current, { opacity: 1, duration: 0.3, ease: "power2.out" });
      gsap.to(panelRef.current, { y: 0, opacity: 1, duration: 0.4, ease: "power3.out" });
    } else {
      gsap.to(panelRef.current, { y: "100%", opacity: 0, duration: 0.3, ease: "power3.in" });
      gsap.to(overlayRef.current, { opacity: 0, duration: 0.25, delay: 0.15, ease: "power2.in" });
    }
  }, [isOpen]);

  const handleClose = () => {
    if (!panelRef.current || !overlayRef.current) return;
    gsap.to(panelRef.current, {
      y: "100%",
      opacity: 0,
      duration: 0.3,
      ease: "power3.in",
      onComplete: onClose,
    });
    gsap.to(overlayRef.current, {
      opacity: 0,
      duration: 0.25,
      delay: 0.1,
      ease: "power2.in",
    });
  };

  const handleSave = () => {
    saveProfile(user.uid, profile);
    onProfileChange(profile);
    toast.success("Profile saved successfully");
    handleClose();
  };

  const handleChangePassword = async () => {
    if (!user.email) return;
    try {
      const { getClientAuth } = await import("@/lib/firebase/config");
      const { sendPasswordResetEmail } = await import("firebase/auth");
      const auth = getClientAuth();
      await sendPasswordResetEmail(auth, user.email);
      setChangePasswordSent(true);
      toast.success("Password reset email sent—check your inbox");
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 bg-black/50 opacity-0"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div
        ref={panelRef}
        className="absolute bottom-0 left-1/2 w-full min-w-[280px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-t-2xl bg-emerald-900 p-6 shadow-xl sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white">Profile settings</h3>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon size={20} weight="bold" />
          </button>
        </div>
        <p className="mb-6 text-sm text-emerald-200/90">
          Store your details here for quick access across tools. Some features will automatically
          fill forms and credentials based on the information you provide.
        </p>

        <div className="space-y-4">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <UserIcon size={16} weight="duotone" className="text-emerald-300" />
              <label className="text-xs font-medium text-emerald-200/80">Name</label>
            </div>
            <p className="mb-1.5 text-xs text-white/60">First, middle, and last name.</p>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.first}
                  onChange={(e) => setProfile((p) => ({ ...p, first: e.target.value }))}
                  placeholder="First"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.middle}
                  onChange={(e) => setProfile((p) => ({ ...p, middle: e.target.value }))}
                  placeholder="Middle"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.last}
                  onChange={(e) => setProfile((p) => ({ ...p, last: e.target.value }))}
                  placeholder="Last"
                  className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <CalendarBlankIcon size={16} weight="duotone" className="text-emerald-300" />
              <label className="text-xs font-medium text-emerald-200/80">Birthday</label>
            </div>
            <p className="mb-1.5 text-xs text-white/60">Date of birth for records.</p>
            <input
              type="date"
              value={profile.birthday}
              onChange={(e) => setProfile((p) => ({ ...p, birthday: e.target.value }))}
              className="w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center gap-2">
              <EnvelopeIcon size={16} weight="duotone" className="text-emerald-300" />
              <label className="text-xs font-medium text-emerald-200/80">Email</label>
            </div>
            <p className="mb-1.5 text-xs text-white/60">Your login email. Cannot be changed.</p>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/70"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3 border-t border-emerald-800 pt-6">
          <p className="mb-2 text-xs font-medium text-emerald-200/80">Utilities</p>
          <div className="mb-1 text-xs text-white/60">
            Receive a reset link at your email to set a new password.
          </div>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changePasswordSent || !user.email}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
          >
            {changePasswordSent ? (
              <>
                <PaperPlaneRightIcon size={18} weight="bold" />
                Reset email sent
              </>
            ) : (
              <>
                <KeyIcon size={18} weight="duotone" />
                Change password (email send)
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-6 w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-white/90"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
