"use client";

import { useEffect, useRef, useState } from "react";
import {
  createAccount,
  updateAccount,
  deleteAccount,
} from "@/lib/api/accounts";
import {
  UsersThreeIcon,
  ShieldCheckIcon,
  UserPlusIcon,
  LockKeyIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { useAccounts } from "./hooks/useAccounts";
import { useAccountForm } from "./hooks/useAccountForm";
import { AccountTable } from "./AccountTable";
import { AccountForm } from "./AccountForm";
import { DeleteModal } from "./DeleteModal";
import { ConfirmModal } from "./ConfirmModal";
import { AVAILABLE_TOOLS, ALL_TOOLS } from "./constants";
import type { AccountUser } from "@/types/account";

export function AccountManagement() {
  const {
    accounts,
    setAccounts,
    loading,
    currentPage,
    totalPages,
    loadAccounts,
  } = useAccounts();
  const formHook = useAccountForm();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState<AccountUser | null>(
    null,
  );
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadAccounts(1);
  }, [loadAccounts]);

  const confirmDeleteAccount = async () => {
    if (!deletingAccount || isDeleting) return;

    try {
      setIsDeleting(true);
      setAccounts((prev) =>
        prev.filter((acc) => acc.uid !== deletingAccount.uid),
      );
      await deleteAccount(deletingAccount.uid);
      toast.success("Account deleted");
      setDeletingAccount(null);
      await loadAccounts(currentPage);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      await loadAccounts(currentPage);
    } finally {
      setIsDeleting(false);
    }
  };

  const submitAccount = async () => {
    if (!formHook.firstName || !formHook.email || !formHook.password) {
      toast.error("First name, email, and password are required");
      return;
    }

    if (
      formHook.password.length !== formHook.confirmPassword.length ||
      formHook.password !== formHook.confirmPassword
    ) {
      toast.error("Passwords do not match");
      return;
    }

    if (formHook.password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (formHook.selectedTools.length === 0) {
      toast.error("Please select at least one tool permission");
      return;
    }

    try {
      setIsCreating(true);
      const displayName = [
        formHook.firstName,
        formHook.middleName,
        formHook.lastName,
      ]
        .filter(Boolean)
        .join(" ");

      if (formHook.editingAccountId) {
        const optimisticUpdate = accounts.find(
          (a) => a.uid === formHook.editingAccountId,
        );
        if (optimisticUpdate) {
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.uid === formHook.editingAccountId
                ? { ...acc, displayName }
                : acc,
            ),
          );
        }

        await updateAccount(formHook.editingAccountId, {
          displayName,
          role: "user",
          disabled: false,
          permissions: formHook.selectedTools,
        });

        toast.success("Account updated successfully");
        formHook.resetForm();
      } else {
        await createAccount({
          email: formHook.email,
          password: formHook.password,
          displayName,
          role: "user",
          permissions: formHook.selectedTools,
        });
        toast.success("Account created successfully");
        formHook.resetForm();
      }

      await loadAccounts(1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong";
      toast.error(message);
      await loadAccounts(currentPage);
    } finally {
      setIsCreating(false);
    }
  };

  const startEditingAccount = (account: AccountUser) => {
    formHook.startEditing(account);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleSelectAll = () => {
    if (formHook.selectedTools.length === AVAILABLE_TOOLS.length) {
      formHook.setSelectedTools([]);
    } else {
      const allToolIds = AVAILABLE_TOOLS.map((t) => t.id);
      const hasAccountManager = allToolIds.includes("accounts");

      if (hasAccountManager && !formHook.selectedTools.includes("accounts")) {
        formHook.setIsConfirmModalOpen(true);
        formHook.setSelectedTools(allToolIds.filter((id) => id !== "accounts"));
      } else {
        formHook.setSelectedTools(allToolIds);
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-3 shadow-xl shadow-emerald-950/30 sm:p-4 lg:p-6">
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-lg font-medium text-white sm:text-xl">
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                <UsersThreeIcon size={18} className="text-white" />
              </span>
              Account Management
            </h2>
            <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white sm:px-3 sm:py-1">
                <ShieldCheckIcon size={12} className="text-white" />
                <span className="hidden sm:inline">Role Management</span>
                <span className="sm:hidden">Roles</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white sm:px-3 sm:py-1">
                <UserPlusIcon size={12} className="text-white" />
                <span className="hidden sm:inline">Create Users</span>
                <span className="sm:hidden">Users</span>
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white sm:px-3 sm:py-1">
                <LockKeyIcon size={12} className="text-white" />
                <span className="hidden sm:inline">Access Control</span>
                <span className="sm:hidden">Access</span>
              </span>
            </div>
            <p className="mt-2 hidden text-justify text-sm text-white/85 lg:block">
              Create, manage, and control user accounts across the system.
              Assign roles, manage permissions, and monitor account status.
              Super admins have full control over user access and can create
              accounts for employees with specific role assignments. This
              centralized management ensures secure access control and
              streamlined user administration for field teams across all
              divisions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAccounts(currentPage)}
            disabled={loading}
            className="inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:ml-4 sm:w-auto"
            title="Refresh accounts list"
          >
            <ArrowClockwiseIcon
              size={18}
              weight="duotone"
              className={loading ? "animate-spin" : ""}
            />
            <span className="sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <AccountTable
        accounts={accounts}
        loading={loading}
        onEdit={startEditingAccount}
        onDelete={setDeletingAccount}
      />

      <div className="mt-4 flex flex-col gap-3 border-t border-white/10 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-center text-sm text-white/70 sm:text-left">
          Page {currentPage} of {totalPages || 1}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void loadAccounts(currentPage - 1);
            }}
            disabled={currentPage === 1 || loading}
            className="flex-1 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              void loadAccounts(currentPage + 1);
            }}
            disabled={currentPage >= totalPages || loading}
            className="flex-1 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none"
          >
            Next
          </button>
        </div>
      </div>

      <AccountForm
        ref={formRef}
        firstName={formHook.firstName}
        setFirstName={formHook.setFirstName}
        middleName={formHook.middleName}
        setMiddleName={formHook.setMiddleName}
        lastName={formHook.lastName}
        setLastName={formHook.setLastName}
        email={formHook.email}
        setEmail={formHook.setEmail}
        password={formHook.password}
        setPassword={formHook.setPassword}
        confirmPassword={formHook.confirmPassword}
        setConfirmPassword={formHook.setConfirmPassword}
        selectedTools={formHook.selectedTools}
        rolePreset={formHook.rolePreset}
        editingAccountId={formHook.editingAccountId}
        isCreating={isCreating}
        onRolePresetChange={formHook.handleRolePresetChange}
        onToggleTool={formHook.toggleToolSelection}
        onSubmit={() => void submitAccount()}
        onCancel={formHook.resetForm}
        onSelectAll={handleSelectAll}
        allToolsSelected={formHook.selectedTools.length === ALL_TOOLS.length}
      />

      <DeleteModal
        account={deletingAccount}
        isDeleting={isDeleting}
        onConfirm={() => void confirmDeleteAccount()}
        onClose={() => setDeletingAccount(null)}
      />

      <ConfirmModal
        isOpen={formHook.isConfirmModalOpen}
        countdown={formHook.confirmCountdown}
        onConfirm={formHook.confirmAccountManagerAccess}
        onClose={() => formHook.setIsConfirmModalOpen(false)}
      />
    </div>
  );
}
