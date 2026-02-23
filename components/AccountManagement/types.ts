import type { Icon } from "@phosphor-icons/react";

export type RolePreset = "basic" | "advanced" | "custom";

export type AvailableTool = {
  id: string;
  name: string;
  description: string;
  icon: Icon;
  requiresConfirmation?: boolean;
  isAdvanced?: boolean;
  isBasic?: boolean;
};
