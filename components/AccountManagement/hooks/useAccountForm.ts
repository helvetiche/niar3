import { useState, useEffect } from "react";
import type { AccountUser } from "@/types/account";
import type { RolePreset } from "../types";
import { AVAILABLE_TOOLS, BASIC_TOOLS, ALL_TOOLS } from "../constants";

export function useAccountForm() {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedTools, setSelectedTools] = useState<string[]>([]);
  const [rolePreset, setRolePreset] = useState<RolePreset>("custom");
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmCountdown, setConfirmCountdown] = useState(5);

  useEffect(() => {
    if (isConfirmModalOpen && confirmCountdown > 0) {
      const timer = setTimeout(() => {
        setConfirmCountdown((prev) => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [isConfirmModalOpen, confirmCountdown]);

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

  const handleRolePresetChange = (preset: RolePreset) => {
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

  const startEditing = (account: AccountUser) => {
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
  };

  const resetForm = () => {
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

  return {
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
    setSelectedTools,
    rolePreset,
    setRolePreset,
    editingAccountId,
    isConfirmModalOpen,
    setIsConfirmModalOpen,
    confirmCountdown,
    toggleToolSelection,
    handleRolePresetChange,
    confirmAccountManagerAccess,
    startEditing,
    resetForm,
    updateRolePresetBasedOnTools,
  };
}
