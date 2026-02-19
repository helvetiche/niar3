import {
  GearIcon,
  FileTextIcon,
  StackIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import type { AvailableTool } from "./types";

export const AVAILABLE_TOOLS: AvailableTool[] = [
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

export const BASIC_TOOLS = AVAILABLE_TOOLS.filter((t) => t.isBasic).map((t) => t.id);
export const ALL_TOOLS = AVAILABLE_TOOLS.map((t) => t.id);
