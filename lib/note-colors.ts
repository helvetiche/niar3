import type { Icon } from "@phosphor-icons/react";
import {
  FlameIcon,
  SunIcon,
  LightbulbFilamentIcon,
  LeafIcon,
  DropIcon,
  CloudIcon,
  FlowerIcon,
  HeartIcon,
} from "@phosphor-icons/react";

export type NoteColorId =
  | "red"
  | "orange"
  | "amber"
  | "emerald"
  | "teal"
  | "blue"
  | "violet"
  | "pink";

export const NOTE_COLOR_IDS: NoteColorId[] = [
  "red",
  "orange",
  "amber",
  "emerald",
  "teal",
  "blue",
  "violet",
  "pink",
];

export const DEFAULT_NOTE_COLOR: NoteColorId = "emerald";

export type NoteColorConfig = {
  id: NoteColorId;
  bg: string;
  bgDark: string;
  pickerBg: string;
  accent: string;
  icon: Icon;
};

export const NOTE_COLORS: NoteColorConfig[] = [
  { id: "red", bg: "bg-red-100", bgDark: "bg-red-700", pickerBg: "bg-red-600", accent: "from-red-500 to-red-600", icon: FlameIcon },
  { id: "orange", bg: "bg-orange-100", bgDark: "bg-orange-700", pickerBg: "bg-orange-600", accent: "from-orange-500 to-orange-600", icon: SunIcon },
  { id: "amber", bg: "bg-amber-100", bgDark: "bg-amber-700", pickerBg: "bg-amber-600", accent: "from-amber-500 to-amber-600", icon: LightbulbFilamentIcon },
  { id: "emerald", bg: "bg-emerald-100", bgDark: "bg-emerald-700", pickerBg: "bg-emerald-600", accent: "from-emerald-500 to-emerald-600", icon: LeafIcon },
  { id: "teal", bg: "bg-teal-100", bgDark: "bg-teal-700", pickerBg: "bg-teal-600", accent: "from-teal-500 to-teal-600", icon: DropIcon },
  { id: "blue", bg: "bg-blue-100", bgDark: "bg-blue-700", pickerBg: "bg-blue-600", accent: "from-blue-500 to-blue-600", icon: CloudIcon },
  { id: "violet", bg: "bg-violet-100", bgDark: "bg-violet-700", pickerBg: "bg-violet-600", accent: "from-violet-500 to-violet-600", icon: FlowerIcon },
  { id: "pink", bg: "bg-pink-100", bgDark: "bg-pink-700", pickerBg: "bg-pink-600", accent: "from-pink-500 to-pink-600", icon: HeartIcon },
];

const COLOR_MAP = Object.fromEntries(
  NOTE_COLORS.map((c) => [c.id, { bg: c.bg, bgDark: c.bgDark, accent: c.accent }])
) as Record<NoteColorId, { bg: string; bgDark: string; accent: string }>;

const DEFAULT_ENTRY = COLOR_MAP.emerald;

export const getNoteBg = (color: string): string =>
  (COLOR_MAP[color as NoteColorId] ?? DEFAULT_ENTRY).bgDark;

export const getNotePopoverConfig = (
  color: string
): { accent: string; bg: string } => {
  const entry = COLOR_MAP[color as NoteColorId] ?? DEFAULT_ENTRY;
  return { accent: entry.accent, bg: entry.bg };
};

