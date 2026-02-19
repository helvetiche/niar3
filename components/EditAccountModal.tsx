"use client";

import { useState } from "react";
import { updateAccount } from "@/lib/api/accounts";
import type { AccountUser, UserRole } from "@/types/account";
import { MasonryModal } from "./MasonryModal";
import { PencilSimpleIcon } from "@phosphor-icons/react";
import toast from "react-hot-toast";

type EditAccountModalProps = {
  isOpen: boolean;
  onClose: () => void;
  account: AccountUser;
  onAccountUpdated: (account: AccountUser) => void;
};

export function EditAccountModal({
  isOpen,
  onClose,
  account,
  onAccountUpdated,
}: EditAccountModalProps) {
  const [displayName, setDisplayName] = useState(account.displayName);
  const [role, setRole] = useState<UserRole>(account.role);
  const [disabled, setDisabled] = useState(account.disabled);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitUpdateAccount = async () => {
    if (!displayName) {
      toast.error("Display name is required");
      return;
    }

    try {
      setIsSubmitting(true);

      const optimisticUpdate = {
        ...account,
        displayName,
        role,
        disabled,
      };
      onAccountUpdated(optimisticUpdate);

      const updatedAccount = await updateAccount(account.uid, {
        displayName,
        role,
        disabled,
      });

      onAccountUpdated(updatedAccount);
      toast.success("Account updated successfully");
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server is broken";
      toast.error(message);
      onAccountUpdated(account);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <MasonryModal
      isOpen={isOpen}
      onClose={() => !isSubmitting && onClose()}
      animateFrom="center"
      blurToFocus={false}
      panelClassName="max-w-lg"
      duration={0.35}
    >
      {(close) => (
        <div className="rounded-2xl border border-white/20 bg-emerald-950 p-6 shadow-2xl">
          <h3 className="text-lg font-medium text-white">Edit Account</h3>
          <p className="mt-1 text-sm text-white/70">
            Update user information and permissions
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-white">
                Email
              </label>
              <input
                type="email"
                value={account.email}
                disabled
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/20 px-3 py-2 text-sm text-white/50"
              />
            </div>

            <div>
              <label
                htmlFor="edit-displayName"
                className="block text-sm font-medium text-white"
              >
                Display Name
              </label>
              <input
                id="edit-displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={isSubmitting}
                className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>

            <div>
              <label
                htmlFor="edit-role"
                className="block text-sm font-medium text-white"
              >
                Role
              </label>
              <select
                id="edit-role"
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

            <div className="flex items-center gap-3">
              <input
                id="edit-disabled"
                type="checkbox"
                checked={disabled}
                onChange={(e) => setDisabled(e.target.checked)}
                disabled={isSubmitting}
                className="h-4 w-4 rounded border-white/20 bg-emerald-900/30 text-emerald-600 focus:ring-2 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <label
                htmlFor="edit-disabled"
                className="text-sm font-medium text-white"
              >
                Disable account
              </label>
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
                void submitUpdateAccount();
              }}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-800/60"
            >
              <PencilSimpleIcon size={16} />
              {isSubmitting ? "Updating..." : "Update Account"}
            </button>
          </div>
        </div>
      )}
    </MasonryModal>
  );
}
