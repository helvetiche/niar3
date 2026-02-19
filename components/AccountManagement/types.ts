export type RolePreset = "basic" | "advanced" | "custom";

export type AvailableTool = {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{
    size?: number;
    weight?: string;
    className?: string;
  }>;
  requiresConfirmation?: boolean;
  isAdvanced?: boolean;
  isBasic?: boolean;
};
