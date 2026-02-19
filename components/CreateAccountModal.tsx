"use client";

import { useState } from "react";
import { createAccount } from "@/lib/api/accounts";
import type { AccountUser, UserRole } from "@/types/account";
import { MasonryModal } from "./MasonryModal";
import { UserPlusIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";

type CreateAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onAccountCreated: (account: AccountUser) => void;
};

export function CreateAccountModal({
  isOpen,
  onClose,
  onAccountCreated,
}: CreateAccountModalProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<UserRole>("user");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setDisplayName("");
    setRole("user");
  };

  const submitCreateAccount = async () => {
    if (!email || !password || !displayName) {
      toast.error("All fields are required");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setIsSubmitting(true);
      const newAccount = await createAccount({
        email,
        password,
        displayName,
        role,
      });
      toast.success("Account created successfully");
      onAccountCreated(newAccount);
      resetForm();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server is broken";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    resetForm();
    onClose();
  };

  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={handleClose}
      animateFrom="center"
      blurToFocus={false}
      panelClassName="max-w-lg"
      duration={0.35}
    >
      {(close) => (
        <div className="rounded-2xl border border-white/20 bg-emerald-950 p-6 shadow-2xl">
          <h3 className="text-lg font-medium text-white">Create New Account</h3>
          <p className="mt-1 text-sm text-white/70">
            Add a new user to the system
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-white"
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="user@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-white"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="Minimum 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="displayName"
                className="block text-sm font-medium text-white"
              >
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label
                htmlFor="role"
                className="block text-sm font-medium text-white"
              >
                Role
              </label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="super-admin">Super Admin</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              type="button"
              onClick={close}
              disabled={isSubmitting}
              className="rounded-lg border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/60"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void submitCreateAccount();
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-800/60"
            >
              <UserPlusIcon size={16} />
              {isSubmitting ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
