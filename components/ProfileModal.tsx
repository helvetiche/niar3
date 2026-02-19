"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { gsap } from "gsap";
import toast from "react-hot-toast";
import {
  XIcon,
  KeyIcon,
  PaperPlaneRightIcon,
  UserIcon,
  CalendarBlankIcon,
  EnvelopeIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import type { AuthUser } from "@/types/auth";
import type { UserProfile } from "@/types/profile";
import { saveProfile } from "@/lib/api/profile";
import { logger } from "@/lib/logger";

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
  const [isMounted, setIsMounted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setProfile(initialProfile);
  }, [initialProfile, isOpen]);

  useEffect(() => {
    if (!overlayRef.current || !panelRef.current) return;
    if (isOpen) {
      gsap.set(overlayRef.current, { display: "block", opacity: 0 });
      gsap.set(panelRef.current, { y: "100%", opacity: 0 });
      gsap.to(overlayRef.current, {
        opacity: 1,
        duration: 0.3,
        ease: "power2.out",
      });
      gsap.to(panelRef.current, {
        y: 0,
        opacity: 1,
        duration: 0.4,
        ease: "power3.out",
      });
    } else {
      gsap.to(panelRef.current, {
        y: "100%",
        opacity: 0,
        duration: 0.3,
        ease: "power3.in",
      });
      gsap.to(overlayRef.current, {
        opacity: 0,
        duration: 0.25,
        delay: 0.15,
        ease: "power2.in",
      });
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

  const handleSave = async () => {
    try {
      await saveProfile(profile);
      onProfileChange(profile);
      toast.success("Profile saved successfully");
      handleClose();
      window.location.reload();
    } catch {
      toast.error("Failed to save profile");
    }
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
      logger.error(err);
    }
  };

  if (!isOpen || !isMounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[200] bg-emerald-900/90 backdrop-blur-sm opacity-0"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-label="Edit profile"
    >
      <div
        ref={panelRef}
        className="absolute bottom-0 left-1/2 z-[201] w-full min-w-[280px] max-w-[calc(100vw-2rem)] -translate-x-1/2 overflow-y-auto rounded-t-2xl border border-emerald-700/60 bg-emerald-900/95 p-6 shadow-xl backdrop-blur-md sm:max-w-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-semibold text-white">
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                <UserIcon size={18} weight="duotone" className="text-white" />
              </span>
              Profile Settings
            </h3>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <UserIcon size={12} className="text-white" />
                Personal Info
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <KeyIcon size={12} className="text-white" />
                Security
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="rounded-full p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label="Close"
          >
            <XIcon size={20} weight="bold" />
          </button>
        </div>
        <p className="mb-6 text-justify text-sm text-white/85">
          Store your details here for quick access across tools. Some features
          will automatically fill forms and credentials based on the information
          you provide. Keep your profile updated for seamless workflow
          integration.
        </p>

        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <UserIcon
                size={16}
                weight="duotone"
                className="text-emerald-300"
              />
              <label className="text-sm font-medium text-white">
                Full Name
              </label>
            </div>
            <p className="mb-3 text-xs text-white/70">
              Enter your complete name as it appears on official documents.
            </p>
            <div className="flex gap-3">
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.first}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, first: e.target.value }))
                  }
                  placeholder="First"
                  className="w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.middle}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, middle: e.target.value }))
                  }
                  placeholder="Middle"
                  className="w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
              <div className="min-w-0 flex-1">
                <input
                  type="text"
                  value={profile.last}
                  onChange={(e) =>
                    setProfile((p) => ({ ...p, last: e.target.value }))
                  }
                  placeholder="Last"
                  className="w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <CalendarBlankIcon
                size={16}
                weight="duotone"
                className="text-emerald-300"
              />
              <label className="text-sm font-medium text-white">
                Date of Birth
              </label>
            </div>
            <p className="mb-3 text-xs text-white/70">
              Your birthday for record keeping and age verification purposes.
            </p>
            <input
              type="date"
              value={profile.birthday}
              onChange={(e) =>
                setProfile((p) => ({ ...p, birthday: e.target.value }))
              }
              className="w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none focus:ring-1 focus:ring-white/40 [color-scheme:dark]"
            />
          </div>

          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
            <div className="mb-3 flex items-center gap-2">
              <EnvelopeIcon
                size={16}
                weight="duotone"
                className="text-emerald-300"
              />
              <label className="text-sm font-medium text-white">
                Email Address
              </label>
            </div>
            <p className="mb-3 text-xs text-white/70">
              Your login email address. This cannot be changed for security
              reasons.
            </p>
            <input
              type="email"
              value={user.email ?? ""}
              readOnly
              className="w-full rounded-lg border border-white/20 bg-emerald-900/20 px-3 py-2 text-sm text-white/70"
            />
          </div>
        </div>

        <div className="mt-6 space-y-3 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
          <div className="mb-2 flex items-center gap-2">
            <KeyIcon size={16} weight="duotone" className="text-emerald-300" />
            <p className="text-sm font-medium text-white">Security Settings</p>
          </div>
          <p className="text-xs text-white/70">
            Receive a password reset link at your email to set a new password
            securely.
          </p>
          <button
            type="button"
            onClick={handleChangePassword}
            disabled={changePasswordSent || !user.email}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {changePasswordSent ? (
              <>
                <PaperPlaneRightIcon size={18} weight="bold" />
                Reset email sent
              </>
            ) : (
              <>
                <KeyIcon size={18} weight="duotone" />
                Send password reset email
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-white/90"
        >
          <CheckCircleIcon size={18} weight="duotone" />
          Save Changes
        </button>
      </div>
    </div>,
    document.body,
  );
}
