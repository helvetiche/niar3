import {
  GearIcon,
  FileTextIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  UsersThreeIcon,
  FileXlsIcon,
  FolderOpenIcon,
  ShieldCheckIcon,
  PackageIcon,
  ListChecksIcon,
  EnvelopeSimpleIcon,
  ChartLineUpIcon,
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
    id: "merge-files",
    name: "Merge Files",
    description: "Merge PDF and Excel files",
    icon: ArrowsMergeIcon,
    isBasic: true,
  },
  {
    id: "ifr-scanner",
    name: "Generate Billing Unit",
    description: "Scan and extract IFR data",
    icon: MagnifyingGlassIcon,
    isBasic: true,
  },
  {
    id: "accomplishment-report",
    name: "Accomplishment Report",
    description: "Generate quincena accomplishment reports",
    icon: FileXlsIcon,
    isBasic: true,
  },
  {
    id: "consolidate-land-profiles",
    name: "Consolidate IFR",
    description: "Consolidate multiple IFR files into one",
    icon: FolderOpenIcon,
    isBasic: true,
  },
  {
    id: "ifr-checker",
    name: "IFR Checker",
    description: "Validate consolidated files against source IFR data",
    icon: ShieldCheckIcon,
    isBasic: true,
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Track and manage inventory items with quarterly data",
    icon: PackageIcon,
    isBasic: true,
  },
  {
    id: "task-manager",
    name: "Task Manager",
    description:
      "Check off recurring email schedules for the current day, week, or month",
    icon: ListChecksIcon,
    isBasic: true,
  },
  {
    id: "compose-email",
    name: "Compose email",
    description: "Send manual SMTP emails with formatting and AI assist (nodemailer)",
    icon: EnvelopeSimpleIcon,
    isBasic: true,
  },
  {
    id: "usage",
    name: "Usage",
    description: "Track AI activity logs with tokens, estimated spend, and request status",
    icon: ChartLineUpIcon,
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
