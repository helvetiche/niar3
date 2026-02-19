import type { AccountUser } from "@/types/account";
import {
  UserCircleIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  WrenchIcon,
  CalendarIcon,
  GearIcon,
  PencilSimpleIcon,
  TrashIcon,
  ShieldIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { AVAILABLE_TOOLS } from "./constants";
import { getRoleBadgeColor, getUserInitials, getDisplayName } from "./utils";

type AccountTableProps = {
  accounts: AccountUser[];
  loading: boolean;
  onEdit: (account: AccountUser) => void;
  onDelete: (account: AccountUser) => void;
};

export function AccountTable({
  accounts,
  loading,
  onEdit,
  onDelete,
}: AccountTableProps) {
  return (
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
                  <tr key={account.uid} className="transition hover:bg-white/5">
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
                        {account.permissions &&
                        account.permissions.length > 0 ? (
                          account.permissions.map((permId) => {
                            const tool = AVAILABLE_TOOLS.find(
                              (t) => t.id === permId,
                            );
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
                          <span className="text-xs text-white/50">
                            No permissions
                          </span>
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
                          onClick={() => onEdit(account)}
                          className="rounded-lg p-2 text-white/70 transition hover:bg-emerald-800/50 hover:text-white"
                          title="Edit account"
                        >
                          <PencilSimpleIcon size={18} weight="duotone" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(account)}
                          className="rounded-lg p-2 text-white/70 transition hover:bg-emerald-800/50 hover:text-white"
                          title="Delete account"
                        >
                          <TrashIcon size={18} weight="duotone" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 8 - accounts.length) }).map(
                  (_, idx) => (
                    <tr key={`empty-${idx}`} className="h-[57px]">
                      <td className="border-r border-white/10 px-4 py-3">
                        &nbsp;
                      </td>
                      <td className="border-r border-white/10 px-4 py-3">
                        &nbsp;
                      </td>
                      <td className="border-r border-white/10 px-4 py-3">
                        &nbsp;
                      </td>
                      <td className="border-r border-white/10 px-4 py-3">
                        &nbsp;
                      </td>
                      <td className="border-r border-white/10 px-4 py-3">
                        &nbsp;
                      </td>
                      <td className="px-4 py-3">&nbsp;</td>
                    </tr>
                  ),
                )}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
