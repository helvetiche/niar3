"use client";

import { forwardRef } from "react";
import {
  UserPlusIcon,
  CheckCircleIcon,
  UserIcon,
  ShieldCheckIcon,
  WrenchIcon,
} from "@phosphor-icons/react";
import type { RolePreset } from "./types";
import { AVAILABLE_TOOLS } from "./constants";

type AccountFormProps = {
  firstName: string;
  setFirstName: (value: string) => void;
  middleName: string;
  setMiddleName: (value: string) => void;
  lastName: string;
  setLastName: (value: string) => void;
  email: string;
  setEmail: (value: string) => void;
  password: string;
  setPassword: (value: string) => void;
  confirmPassword: string;
  setConfirmPassword: (value: string) => void;
  selectedTools: string[];
  rolePreset: RolePreset;
  editingAccountId: string | null;
  isCreating: boolean;
  onRolePresetChange: (preset: RolePreset) => void;
  onToggleTool: (toolId: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  onSelectAll: () => void;
  allToolsSelected: boolean;
};

export const AccountForm = forwardRef<HTMLDivElement, AccountFormProps>(
  (
    {
      firstName,
      setFirstName,
      middleName,
      setMiddleName,
      lastName,
      setLastName,
      email,
      setEmail,
      password,
      setPassword,
      confirmPassword,
      setConfirmPassword,
      selectedTools,
      rolePreset,
      editingAccountId,
      isCreating,
      onRolePresetChange,
      onToggleTool,
      onSubmit,
      onCancel,
      onSelectAll,
      allToolsSelected,
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm"
      >
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
              Password{" "}
              {!editingAccountId && <span className="text-rose-400">*</span>}
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
              placeholder={
                editingAccountId
                  ? "Leave blank to keep current"
                  : "Min 8 characters"
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-white/80">
              Confirm Password{" "}
              {!editingAccountId && <span className="text-rose-400">*</span>}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={isCreating}
              className="mt-1 w-full rounded-lg border border-white/20 bg-emerald-900/30 px-3 py-2 text-sm text-white placeholder:text-white/50 focus:border-white/40 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
              placeholder={
                editingAccountId
                  ? "Leave blank to keep current"
                  : "Confirm password"
              }
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
                onClick={() => onRolePresetChange("basic")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "basic"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <UserIcon
                    size={24}
                    weight={rolePreset === "basic" ? "fill" : "regular"}
                  />
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
                onClick={() => onRolePresetChange("advanced")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "advanced"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <ShieldCheckIcon
                    size={24}
                    weight={rolePreset === "advanced" ? "fill" : "regular"}
                  />
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
                onClick={() => onRolePresetChange("custom")}
                disabled={isCreating}
                className={`flex-1 rounded-lg border px-4 py-3 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
                  rolePreset === "custom"
                    ? "border-emerald-500/60 bg-emerald-700/50 text-white"
                    : "border-white/30 bg-white/5 text-white/70 hover:border-white/50 hover:bg-white/10 hover:text-white"
                }`}
              >
                <div className="flex flex-col items-center gap-2">
                  <WrenchIcon
                    size={24}
                    weight={rolePreset === "custom" ? "fill" : "regular"}
                  />
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
                onClick={onSelectAll}
                disabled={isCreating}
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/80 transition hover:border-white/50 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <WrenchIcon size={14} />
                {allToolsSelected ? "Deselect All" : "Select All"}
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
                    onClick={() => onToggleTool(tool.id)}
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
              onClick={onCancel}
              disabled={isCreating}
              className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onSubmit}
            disabled={isCreating}
            className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-emerald-800 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircleIcon size={18} weight="duotone" />
            {isCreating
              ? "Saving..."
              : editingAccountId
                ? "Update Account"
                : "Save Account"}
          </button>
        </div>
      </div>
    );
  },
);

AccountForm.displayName = "AccountForm";
