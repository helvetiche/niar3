"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { fetchAccounts, deleteAccount, createAccount, updateAccount } from "@/lib/api/accounts";
import type { AccountUser } from "@/types/account";
import {
  UserPlusIcon,
  PencilSimpleIcon,
  TrashIcon,
  UserCircleIcon,
  ShieldCheckIcon,
  ShieldIcon,
  UserIcon,
  UsersThreeIcon,
  LockKeyIcon,
  EnvelopeIcon,
  CalendarIcon,
  GearIcon,
  CheckCircleIcon,
  FileTextIcon,
  StackIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  WrenchIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react";
import toast from "react-hot-toast";
import { MasonryModal } from "./MasonryModal";

const AVAILABLE_TOOLS = [
  {
    id: "template-manager",
    name: "Template Manager",
    description: "View and update shared templates",
    icon: GearIcon,
    isAdvanced: true,
  },
  {
    id: "lipa-summary",
    name: "LIPA Summary",
    description: "Generate summary reports for LIPA documents",
    icon: FileTextIcon,
    isBasic: true,
  },
  {
    id: "consolidate-ifr",
    name: "Consolidate Billing Unit",
    description: "Merge billing unit documents",
    icon: StackIcon,
    isBasic: true,
  },
  {
    id: "merge-files",
    name: "Merge Files",
    description: "Merge PDF and Excel files",
    icon: ArrowsMergeIcon,
    isBasic: true,
  },
  {
    id: "ifr-scanner",
    name: "IFR Scanner",
    description: "Scan and extract IFR data",
    icon: MagnifyingGlassIcon,
    isBasic: true,
  },
  {
    id: "accounts",
    name: "Account Manager",
    description: "Manage user accounts and permissions (Admin access)",
    icon: UsersThreeIcon,
    requiresConfirmation: true,
    isAdvanced: true,
  },
];

const BASIC_TOOLS = AVAILABLE_TOOLS.filter((t) => t.isBasic).map((t) => t.id);
const ALL_TOOLS = AVAILABLE_TOOLS.map((t) => t.id);

export function AccountManagement() {
  const [accounts, setAccounts] = useState<AccountUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(5);
  const [rolePreset, setRolePreset] = useState<"basic" | "advanced" | "custom">("custom");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [deletingAccount, setDeletingAccount] = useState<AccountUser | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  const loadAccounts = useCallback(async (page: number) => {
    try {
      setLoading(true);
      const data = await fetchAccounts(page, 8);
      setAccounts(data.accounts);
      setTotalPages(data.pagination.totalPages);
      setCurrentPage(data.pagination.page);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server is broken";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleToolSelection = (toolId: string) => {
    const tool = AVAILABLE_TOOLS.find((t) => t.id === toolId);
    if (tool?.requiresConfirmation && !selectedTools.includes(toolId)) {
      setConfirmCountdown(5);
      setIsConfirmModalOpen(true);
      return;
    }
    
    const newTools = selectedTools.includes(toolId)
      ? selectedTools.filter((id) => id !== toolId)
      : [...selectedTools, toolId];
    
    setSelectedTools(newTools);
    updateRolePresetBasedOnTools(newTools);
  };

  const updateRolePresetBasedOnTools = (tools: string[]) => {
    if (tools.length === 0) {
      setRolePreset("custom");
    } else if (tools.length === ALL_TOOLS.length) {
      setRolePreset("advanced");
    } else if (
      tools.length === BASIC_TOOLS.length &&
      BASIC_TOOLS.every((id) => tools.includes(id))
    ) {
      setRolePreset("basic");
    } else {
      setRolePreset("custom");
    }
  };

  const handleRolePresetChange = (preset: "basic" | "advanced" | "custom") => {
    setRolePreset(preset);
    
    if (preset === "basic") {
      setSelectedTools(BASIC_TOOLS);
    } else if (preset === "advanced") {
      const hasAccountManager = selectedTools.includes("accounts");
      if (!hasAccountManager) {
        setConfirmCountdown(5);
        setIsConfirmModalOpen(true);
        setSelectedTools(ALL_TOOLS.filter((id) => id !== "accounts"));
      } else {
        setSelectedTools(ALL_TOOLS);
      }
    } else {
      setSelectedTools([]);
    }
  };

  const confirmAccountManagerAccess = () => {
    setSelectedTools((prev) => [...prev, "accounts"]);
    setIsConfirmModalOpen(false);
  };

  useEffect(() => {
    void loadAccounts(1);
  }, [loadAccounts]);

  useEffect(() => {
    if (isConfirmModalOpen && confirmCountdown > 0) {
      const timer = setTimeout(() => {
        setConfirmCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmModalOpen, confirmCountdown]);

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
        error instanceof Error ? error.message : "Server is broken";
      toast.error(message);
      await loadAccounts(currentPage);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleAccountCreated = async () => {
    if (!firstName || !email || !password) {
      toast.error("First name, email, and password are required");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    if (selectedTools.length === 0) {
      toast.error("Please select at least one tool permission");
      return;
    }

    try {
      setIsCreating(true);
      const displayName = [firstName, middleName, lastName]
        .filter(Boolean)
        .join(" ");

      if (editingAccountId) {
        const optimisticUpdate = accounts.find((a) => a.uid === editingAccountId);
        if (optimisticUpdate) {
          setAccounts((prev) =>
            prev.map((acc) =>
              acc.uid === editingAccountId
                ? { ...acc, displayName }
                : acc
            )
          );
        }

        await updateAccount(editingAccountId, {
          displayName,
          role: "user",
          disabled: false,
          permissions: selectedTools,
        });
        
        toast.success("Account updated successfully");
        cancelEditing();
      } else {
        await createAccount({
          email,
          password,
          displayName,
          role: "user",
          permissions: selectedTools,
        });
        toast.success("Account created successfully");
        setFirstName("");
        setMiddleName("");
        setLastName("");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setSelectedTools([]);
        setRolePreset("custom");
      }
      
      await loadAccounts(1);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Server is broken";
      toast.error(message);
      await loadAccounts(currentPage);
    } finally {
      setIsCreating(false);
    }
  };

  const handleAccountUpdated = (updatedAccount: AccountUser) => {
    setAccounts((prev) =>
      prev.map((acc) => (acc.uid === updatedAccount.uid ? updatedAccount : acc)),
    );
    setEditingAccountId(null);
  };

  const startEditingAccount = (account: AccountUser) => {
    const nameParts = account.displayName?.split(" ") || [];
    setFirstName(nameParts[0] || "");
    setMiddleName(nameParts.length > 2 ? nameParts.slice(1, -1).join(" ") : "");
    setLastName(nameParts.length > 1 ? nameParts[nameParts.length - 1] : "");
    setEmail(account.email);
    setPassword("");
    setConfirmPassword("");
    setSelectedTools(account.permissions || []);
    updateRolePresetBasedOnTools(account.permissions || []);
    setEditingAccountId(account.uid);
    
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const cancelEditing = () => {
    setEditingAccountId(null);
    setFirstName("");
    setMiddleName("");
    setLastName("");
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setSelectedTools([]);
    setRolePreset("custom");
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "super-admin":
        return "bg-emerald-800/50 text-emerald-100 border-emerald-600/40";
      case "admin":
        return "bg-emerald-700/50 text-emerald-100 border-emerald-500/40";
      default:
        return "bg-emerald-900/30 text-emerald-200 border-emerald-700/40";
    }
  };

  const getUserInitials = (displayName: string | null, email: string) => {
    if (displayName && displayName.trim()) {
      const parts = displayName.trim().split(/\s+/);
      if (parts.length >= 2) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
      }
      return displayName[0].toUpperCase();
    }
    
    const emailPart = email.split("@")[0];
    if (emailPart && emailPart.length > 0) {
      return emailPart.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const getDisplayName = (displayName: string | null, email: string) => {
    if (displayName && displayName.trim()) {
      return displayName;
    }
    
    const emailPart = email.split("@")[0];
    if (!emailPart) return "User";
    
    return emailPart
      .split(/[._-]/)
      .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
      .join(" ");
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-emerald-700/60 bg-emerald-900 p-4 shadow-xl shadow-emerald-950/30 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="flex items-center gap-2 text-xl font-medium text-white">
              <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1.5">
                <UsersThreeIcon size={18} className="text-white" />
              </span>
              Account Management
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <ShieldCheckIcon size={12} className="text-white" />
                Role Management
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <UserPlusIcon size={12} className="text-white" />
                Create Users
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 bg-white/10 px-3 py-1 text-xs font-medium text-white">
                <LockKeyIcon size={12} className="text-white" />
                Access Control
              </span>
            </div>
            <p className="mt-2 text-sm text-justify text-white/85">
              Create, manage, and control user accounts across the system. Assign roles, manage permissions, and monitor account status. Super admins have full control over user access and can create accounts for employees with specific role assignments. This centralized management ensures secure access control and streamlined user administration for field teams across all divisions.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadAccounts(currentPage)}
            disabled={loading}
            className="ml-4 inline-flex shrink-0 items-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            title="Refresh accounts list"
          >
            <ArrowClockwiseIcon size={18} weight="duotone" className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
              <col className="w-1/6" />
            </colgroup>
            <thead className="border-b border-white/20 bg-white/5">
              <tr>
                <th className="border-r border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center gap-2">
                    <UserCircleIcon size={14} className="text-white/70" />
                    User
                  </div>
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon size={14} className="text-white/70" />
                    Email
                  </div>
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center gap-2">
                    <ShieldCheckIcon size={14} className="text-white/70" />
                    Role
                  </div>
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center gap-2">
                    <WrenchIcon size={14} className="text-white/70" />
                    Permissions
                  </div>
                </th>
                <th className="border-r border-white/10 px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center gap-2">
                    <CalendarIcon size={14} className="text-white/70" />
                    Created
                  </div>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-white/70">
                  <div className="flex items-center justify-end gap-2">
                    <GearIcon size={14} className="text-white/70" />
                    Actions
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {loading ? (
                Array.from({ length: 8 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
                        <div className="h-4 w-24 rounded bg-white/10" />
                      </div>
                    </td>
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="h-4 w-32 rounded bg-white/10" />
                    </td>
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="h-6 w-20 rounded-full bg-white/10" />
                    </td>
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="h-6 w-full rounded bg-white/10" />
                    </td>
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="h-4 w-20 rounded bg-white/10" />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <div className="h-8 w-8 rounded-lg bg-white/10" />
                        <div className="h-8 w-8 rounded-lg bg-white/10" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <>
                  {accounts.map((account) => (
                    <tr
                      key={account.uid}
                      className="transition hover:bg-white/5"
                    >
                      <td className="border-r border-white/10 px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-sm font-semibold text-white">
                            {getUserInitials(account.displayName, account.email)}
                          </div>
                          <span className="truncate text-sm font-medium text-white">
                            {getDisplayName(account.displayName, account.email)}
                          </span>
                        </div>
                      </td>
                      <td className="border-r border-white/10 px-4 py-3 text-sm text-white/80">
                        {account.email}
                      </td>
                      <td className="border-r border-white/10 px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(account.role)}`}
                        >
                          {account.role === "super-admin" ? (
                            <ShieldCheckIcon size={14} weight="fill" />
                          ) : account.role === "admin" ? (
                            <ShieldIcon size={14} weight="fill" />
                          ) : (
                            <UserIcon size={14} weight="fill" />
                          )}
                          {account.role}
                        </span>
                      </td>
                    <td className="border-r border-white/10 px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {account.permissions && account.permissions.length > 0 ? (
                          account.permissions.map((permId) => {
                            const tool = AVAILABLE_TOOLS.find((t) => t.id === permId);
                            if (!tool) return null;
                            const Icon = tool.icon;
                            return (
                              <span
                                key={permId}
                                title={tool.description}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${
                                  tool.requiresConfirmation
                                    ? "border-rose-500/40 bg-rose-800/30 text-rose-200"
                                    : "border-emerald-600/40 bg-emerald-800/30 text-emerald-200"
                                }`}
                              >
                                <Icon size={12} weight="fill" />
                                {tool.name}
                              </span>
                            );
                          })
                        ) : (
                          <span className="text-xs text-white/50">No permissions</span>
                        )}
                      </div>
                    </td>
                      <td className="border-r border-white/10 px-4 py-3 text-sm text-white/70">
                        {new Date(account.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => startEditingAccount(account)}
                            className="rounded-lg p-2 text-white/70 transition hover:bg-emerald-800/50 hover:text-white"
                            title="Edit account"
                          >
                            <PencilSimpleIcon size={18} weight="duotone" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAccount(account)}
                            className="rounded-lg p-2 text-white/70 transition hover:bg-emerald-800/50 hover:text-white"
                            title="Delete account"
                          >
                            <TrashIcon size={18} weight="duotone" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 8 - accounts.length) }).map((_, idx) => (
                    <tr key={`empty-${idx}`} className="h-[57px]">
                      <td className="border-r border-white/10 px-4 py-3">&nbsp;</td>
                      <td className="border-r border-white/10 px-4 py-3">&nbsp;</td>
                      <td className="border-r border-white/10 px-4 py-3">&nbsp;</td>
                      <td className="border-r border-white/10 px-4 py-3">&nbsp;</td>
                      <td className="border-r border-white/10 px-4 py-3">&nbsp;</td>
                      <td className="px-4 py-3">&nbsp;</td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between pt-4">
        <p className="text-sm text-white/70">
          Page {currentPage} of {totalPages || 1}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              void loadAccounts(currentPage - 1);
            }}
            disabled={currentPage === 1 || loading}
            className="rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            onClick={() => {
              void loadAccounts(currentPage + 1);
            }}
            disabled={currentPage >= totalPages || loading}
            className="rounded-lg border border-white/20 bg-emerald-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      <div ref={formRef} className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm">
        <div className="mb-4">
          <h3 className="flex items-center gap-2 text-sm font-medium text-white">
            <span className="inline-flex items-center justify-center rounded-lg border-2 border-dashed border-white bg-white/10 p-1">
              <UserPlusIcon size={14} className="text-white" />
            </span>
            {editingAccountId ? "Edit Account" : "Create New Account"}
          </h3>
          <p className="mt-1 text-xs text-white/70">
            {editingAccountId
              ? "Update user information and permissions"
              : "Add a new user to the system and assign tool permissions"}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-white/80">
              First Name <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="John"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Middle Name
            </label>
            <input
              type="text"
              value={middleName}
              onChange={(e) => setMiddleName(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="M."
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Last Name
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="Doe"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Email <span className="text-rose-400">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isCreating || !!editingAccountId}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Password {!editingAccountId && <span className="text-rose-400">*</span>}
            </label>
            {editingAccountId && (
              <p className="mt-1 text-xs text-white/60">
                Leave blank to keep current password
              </p>
            )}
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={editingAccountId ? "Leave blank to keep current" : "Min 8 characters"}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Confirm Password {!editingAccountId && <span className="text-rose-400">*</span>}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={editingAccountId ? "Leave blank to keep current" : "Confirm password"}
            />
          </div>

          <div className="col-span-3">
            <label className="block text-xs font-medium text-white/80">
              Role Preset <span className="text-rose-400">*</span>
            </label>
            <p className="mt-1 text-xs text-white/60">
              Choose a preset or customize tool access manually
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => handleRolePresetChange("basic")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "basic"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <UserIcon size={24} weight={rolePreset === "basic" ? "fill" : "regular"} />
                  <div className="text-center">
                    <div className="font-semibold">Basic</div>
                    <div className="mt-1 text-xs opacity-80">
                      Standard tools only
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRolePresetChange("advanced")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "advanced"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <ShieldCheckIcon size={24} weight={rolePreset === "advanced" ? "fill" : "regular"} />
                  <div className="text-center">
                    <div className="font-semibold">Advanced</div>
                    <div className="mt-1 text-xs opacity-80">
                      All tools & admin access
                    </div>
                  </div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleRolePresetChange("custom")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "custom"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <WrenchIcon size={24} weight={rolePreset === "custom" ? "fill" : "regular"} />
                  <div className="text-center">
                    <div className="font-semibold">Custom</div>
                    <div className="mt-1 text-xs opacity-80">
                      Select tools manually
                    </div>
                  </div>
                </div>
              </button>
            </div>
          </div>
          <div className="col-span-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="block text-xs font-medium text-white/80">
                  Tool Permissions
                </label>
                <p className="mt-1 text-xs text-white/60">
                  Select which tools this user can access
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (selectedTools.length === AVAILABLE_TOOLS.length) {
                    setSelectedTools([]);
                  } else {
                    const allToolIds = AVAILABLE_TOOLS.map((t) => t.id);
                    const hasAccountManager = allToolIds.includes("accounts");
                    
                    if (hasAccountManager && !selectedTools.includes("accounts")) {
                      setConfirmCountdown(5);
                      setIsConfirmModalOpen(true);
                      setSelectedTools(allToolIds.filter((id) => id !== "accounts"));
                    } else {
                      setSelectedTools(allToolIds);
                    }
                  }
                }}
                disabled={isCreating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/50 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <WrenchIcon size={14} />
                {selectedTools.length === AVAILABLE_TOOLS.length
                  ? "Deselect All"
                  : "Select All"}
              </button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {AVAILABLE_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isSelected = selectedTools.includes(tool.id);
                return (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => toggleToolSelection(tool.id)}
                    disabled={isCreating}
                    title={tool.description}
                    className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                      isSelected && tool.requiresConfirmation
                        ? "border-rose-500/60 bg-rose-700/50 text-white"
                        : isSelected
                          ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                          : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <Icon size={14} weight={isSelected ? "fill" : "regular"} />
                    {tool.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          {editingAccountId && (
            <button
              type="button"
              onClick={cancelEditing}
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              void handleAccountCreated();
            }}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircleIcon size={18} weight="duotone" />
            {isCreating ? "Saving..." : editingAccountId ? "Update Account" : "Save Account"}
          </button>
        </div>
      </div>

      <MasonryModal
        isOpen={!!deletingAccount}
        onClose={() => !isDeleting && setDeletingAccount(null)}
        animateFrom="center"
        blurToFocus={false}
        panelClassName="max-w-md"
        duration={0.35}
      >
        {(close) => (
          <div className="rounded-2xl border border-white/20 bg-emerald-950 p-5 shadow-2xl">
            <h3 className="text-lg font-medium text-white">Delete Account</h3>
            <p className="mt-2 text-sm text-white/85">
              Are you sure you want to delete{" "}
              <span className="font-medium">{deletingAccount?.email}</span>?
              This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={isDeleting}
                className="rounded-lg border border-white/35 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void confirmDeleteAccount();
                }}
                disabled={isDeleting}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-emerald-700/60"
              >
                <TrashIcon size={16} />
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>

      <MasonryModal
        isOpen={isConfirmModalOpen}
        onClose={() => !isCreating && setIsConfirmModalOpen(false)}
        animateFrom="center"
        blurToFocus={false}
        panelClassName="max-w-md"
        duration={0.35}
      >
        {(close) => (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-950/90 p-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-2 border-rose-500/60 bg-rose-900/50">
                <UsersThreeIcon size={24} weight="duotone" className="text-rose-200" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-white">Warning: Admin Access</h3>
                <p className="mt-0.5 text-xs text-rose-200/80">
                  This grants full account management
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-white/90">
              You are about to grant <span className="font-semibold">Account Manager</span> access. 
              This allows the user to create, edit, and delete accounts, and manage all user permissions.
            </p>
            <p className="mt-2 text-sm font-medium text-rose-200">
              Only grant this to trusted administrators.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                className="rounded-lg border border-white/35 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmAccountManagerAccess();
                  close();
                }}
                disabled={confirmCountdown > 0}
                className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-600 disabled:cursor-not-allowed disabled:bg-rose-700/60"
              >
                <CheckCircleIcon size={16} />
                {confirmCountdown > 0 ? `Wait ${confirmCountdown}s` : "Grant Access"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>
    </div>
  );
}
