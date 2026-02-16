"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchProfile } from "@/lib/api/profile";
import {
  FileTextIcon,
  StackIcon,
  MagnifyingGlassIcon,
  EnvelopeSimpleIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ListBulletsIcon,
  SquaresFourIcon,
  PencilSimpleIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import type { AuthUser } from "@/types/auth";
import { useWorkspaceTab } from "@/contexts/WorkspaceContext";
import type { UserProfile } from "@/types/profile";
import { ProfileModal } from "./ProfileModal";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";

function loadSidebarCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function saveSidebarCollapsed(collapsed: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const CALENDAR = {
  id: "calendar" as const,
  name: "CALENDAR",
  description: "View your schedule and important dates.",
  icon: CalendarBlankIcon,
};

const TOOLS = [
  {
    id: "lipa-summary" as const,
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
    icon: FileTextIcon,
  },
  {
    id: "consolidate-ifr" as const,
    name: "CONSOLIDATE IFR",
    description: "Merge and consolidate IFR documents into a single file.",
    icon: StackIcon,
  },
  {
    id: "ifr-scanner" as const,
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
    icon: MagnifyingGlassIcon,
  },
  {
    id: "email-automation" as const,
    name: "EMAIL AUTOMATION",
    description: "Automate email workflows and bulk email tasks.",
    icon: EnvelopeSimpleIcon,
  },
] as const;

function getDisplayName(profile: UserProfile, email: string | null): string {
  const parts = [profile.first, profile.middle, profile.last].filter(Boolean);
  if (parts.length > 0) return parts.join(" ").trim();
  if (!email) return "User";
  const beforeAt = email.split("@")[0];
  if (!beforeAt) return "User";
  return beforeAt
    .split(/[._-]/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
    .join(" ");
}

export function WorkspaceSidebar({ user }: { user: AuthUser }) {
  const [search, setSearch] = useState("");
  const [profile, setProfile] = useState<UserProfile>({
    first: "",
    middle: "",
    last: "",
    birthday: "",
  });
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled)
          setProfile({ first: "", middle: "", last: "", birthday: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    setCollapsed(loadSidebarCollapsed());
  }, []);

  useEffect(() => {
    saveSidebarCollapsed(collapsed);
  }, [collapsed]);

  const toggleCollapsed = () => setCollapsed((c) => !c);

  const displayName = getDisplayName(profile, user.email);
  const firstLetter = (
    profile.first?.[0] ||
    user.email?.[0] ||
    "U"
  ).toUpperCase();

  const filteredTools = TOOLS.filter(
    (tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase()),
  );

  const navItems = collapsed
    ? [CALENDAR, ...TOOLS]
    : [CALENDAR, ...filteredTools];
  const { selectedTab, setSelectedTab } = useWorkspaceTab();

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-emerald-950/50 bg-emerald-900 transition-[width] duration-200 ease-out ${
        collapsed ? "w-[72px]" : "w-96"
      }`}
    >
      <div
        className={`border-b border-emerald-800 ${collapsed ? "px-2 py-3" : "px-4 py-4"}`}
      >
        <div
          className={`flex items-center justify-between ${collapsed ? "flex-col gap-2" : "gap-2"}`}
        >
          <div
            className={`flex min-w-0 items-start ${collapsed ? "flex-col items-center" : "gap-3"}`}
          >
            <Image
              src="/logo.png"
              alt="NIA Logo"
              width={collapsed ? 32 : 40}
              height={collapsed ? 32 : 40}
              className={`shrink-0 object-contain ${collapsed ? "h-8 w-8" : "h-10 w-auto"}`}
            />
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
                  NIA Productivity Tools
                </h2>
                <p className="mt-1 text-xs text-emerald-200/80">
                  Work smarter, deliver faster.
                </p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="shrink-0 rounded-lg p-2 transition hover:bg-emerald-800"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <CaretRightIcon size={20} weight="bold" className="text-white" />
            ) : (
              <CaretLeftIcon size={20} weight="bold" className="text-white" />
            )}
          </button>
        </div>
        {!collapsed && (
          <div className="mt-3 flex items-center gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-white/60 bg-white/10 px-3 py-2">
              <MagnifyingGlassIcon
                size={18}
                weight="duotone"
                className="shrink-0 text-white"
              />
              <input
                type="search"
                placeholder="Search tools..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
              />
            </div>
            <div className="flex shrink-0 rounded-lg border border-white/60 bg-white/10 p-1">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                title="List view"
                className={`rounded-md p-1.5 transition ${
                  viewMode === "list"
                    ? "bg-emerald-700 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <ListBulletsIcon size={18} weight="duotone" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                title="Grid view"
                className={`rounded-md p-1.5 transition ${
                  viewMode === "grid"
                    ? "bg-emerald-700 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <SquaresFourIcon size={18} weight="duotone" />
              </button>
            </div>
          </div>
        )}
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        {viewMode === "grid" && !collapsed ? (
          <ul className="grid grid-cols-3 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTab(item.id)}
                    title={"description" in item ? item.description : undefined}
                    className={`flex w-full flex-col items-center gap-2 rounded-lg p-3 transition hover:bg-emerald-800 ${
                      isActive ? "bg-emerald-800" : ""
                    }`}
                  >
                    <div className="flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white p-2.5">
                      <Icon size={24} weight="duotone" className="text-white" />
                    </div>
                    <p className="text-center text-xs font-medium text-white line-clamp-2">
                      {item.name}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = selectedTab === item.id;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedTab(item.id)}
                    title={item.name}
                    className={`flex w-full items-center rounded-lg transition hover:bg-emerald-800 ${
                      collapsed
                        ? "justify-center px-2 py-3"
                        : "items-start gap-4 px-4 py-3 text-left"
                    } ${isActive ? "bg-emerald-800" : ""}`}
                  >
                    <div
                      className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white ${
                        collapsed ? "p-2" : "p-2.5"
                      }`}
                    >
                      <Icon
                        size={collapsed ? 20 : 24}
                        weight="duotone"
                        className="text-white"
                      />
                    </div>
                    {!collapsed && (
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-white">
                          {item.name}
                        </p>
                        <p className="mt-0.5 text-xs text-emerald-200/80 line-clamp-2">
                          {"description" in item ? item.description : ""}
                        </p>
                      </div>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
      <div
        className={`border-t border-emerald-800 ${collapsed ? "p-2" : "p-3"}`}
      >
        <button
          type="button"
          onClick={() => setIsProfileOpen(true)}
          title={
            collapsed ? `${displayName} (${user.email ?? "—"})` : undefined
          }
          className={`flex w-full items-center rounded-lg transition hover:bg-emerald-800 ${
            collapsed
              ? "justify-center px-2 py-2.5"
              : "gap-3 px-3 py-2.5 text-left"
          }`}
        >
          <div
            className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-800 font-semibold text-white ${
              collapsed ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm"
            }`}
          >
            {firstLetter}
          </div>
          {!collapsed && (
            <>
              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-medium text-white">
                  {displayName}
                </p>
                <p className="truncate text-xs text-emerald-200/80">
                  {user.email ?? "—"}
                </p>
              </div>
              <PencilSimpleIcon
                size={18}
                weight="duotone"
                className="shrink-0 text-white/70"
              />
            </>
          )}
        </button>
      </div>
      <ProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        user={user}
        profile={profile}
        onProfileChange={setProfile}
      />
    </aside>
  );
}
