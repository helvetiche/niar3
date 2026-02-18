"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { fetchProfile } from "@/lib/api/profile";
import {
  HouseIcon,
  FileTextIcon,
  StackIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ListBulletsIcon,
  SquaresFourIcon,
  PencilSimpleIcon,
  XIcon,
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

const TOOLS = [
  {
    id: "hub" as const,
    name: "HUB",
    description:
      "Central workspace hub for quick access to all productivity tools.",
    icon: HouseIcon,
  },
  {
    id: "lipa-summary" as const,
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
    icon: FileTextIcon,
  },
  {
    id: "consolidate-ifr" as const,
    name: "CONSOLIDATE LAND PROFILE",
    description:
      "Merge and consolidate land profile documents into a single file.",
    icon: StackIcon,
  },
  {
    id: "merge-files" as const,
    name: "MERGE FILES",
    description:
      "Merge PDF files with page ordering and combine Excel files into one workbook.",
    icon: ArrowsMergeIcon,
  },
  {
    id: "ifr-scanner" as const,
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
    icon: MagnifyingGlassIcon,
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
  const [collapsed, setCollapsed] = useState(loadSidebarCollapsed);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const { selectedTab, setSelectedTab } = useWorkspaceTab();

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
    saveSidebarCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const syncDesktopState = (event?: MediaQueryListEvent) => {
      const matches = event ? event.matches : mediaQuery.matches;
      setIsDesktop(matches);
      if (matches) {
        setIsMobileMenuOpen(false);
      }
    };
    syncDesktopState();
    mediaQuery.addEventListener("change", syncDesktopState);
    return () => {
      mediaQuery.removeEventListener("change", syncDesktopState);
    };
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      setIsMobileMenuOpen(false);
    }
  }, [selectedTab, isDesktop]);

  const toggleCollapsed = () => setCollapsed((c) => !c);
  const handleToggleMobileMenu = () =>
    setIsMobileMenuOpen((isOpen) => !isOpen);

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

  const effectiveCollapsed = collapsed && isDesktop;
  const navItems = effectiveCollapsed ? TOOLS : filteredTools;
  const showSidebarContent = isDesktop || isMobileMenuOpen;
  const mobileNavPanelClassName = isDesktop
    ? "flex min-h-0 flex-1 flex-col"
    : `absolute left-0 right-0 top-full z-40 origin-top border-b border-emerald-800 bg-emerald-900 shadow-2xl shadow-emerald-950/40 transition-all duration-300 ease-out motion-reduce:transition-none ${
        isMobileMenuOpen
          ? "pointer-events-auto translate-y-0 scale-y-100 opacity-100"
          : "pointer-events-none -translate-y-1 scale-y-95 opacity-0"
      }`;
  const mobileBackdropClassName = isDesktop
    ? "hidden"
    : `fixed inset-0 z-20 bg-emerald-950/55 backdrop-blur-sm transition-opacity duration-300 ease-out motion-reduce:transition-none ${
        isMobileMenuOpen
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0"
      }`;

  return (
    <aside
      className={`sticky top-0 z-40 flex w-full shrink-0 flex-col overflow-visible border-b border-emerald-950/50 bg-emerald-900 lg:z-auto lg:h-screen lg:self-start lg:overflow-hidden lg:border-b-0 lg:border-r lg:transition-[width] lg:duration-200 lg:ease-out ${
        effectiveCollapsed ? "lg:w-[72px]" : "lg:w-96"
      }`}
    >
      <div
        className={`relative z-50 border-b border-emerald-800 ${effectiveCollapsed ? "px-2 py-3" : "px-3 py-3 sm:px-4 sm:py-4"}`}
      >
        <div
          className={`flex items-center justify-between ${effectiveCollapsed ? "lg:flex-col lg:gap-2" : "gap-2"}`}
        >
          <div
            className={`flex min-w-0 items-start ${effectiveCollapsed ? "lg:flex-col lg:items-center" : "gap-3"}`}
          >
            <Image
              src="/logo.png"
              alt="NIA Logo"
              width={effectiveCollapsed ? 32 : 40}
              height={effectiveCollapsed ? 32 : 40}
              className={`shrink-0 object-contain ${effectiveCollapsed ? "h-8 w-8" : "h-10 w-auto"}`}
            />
            {!effectiveCollapsed && (
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
            className="hidden shrink-0 rounded-lg p-2 transition hover:bg-emerald-800 lg:inline-flex"
            aria-label={effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {effectiveCollapsed ? (
              <CaretRightIcon size={20} weight="bold" className="text-white" />
            ) : (
              <CaretLeftIcon size={20} weight="bold" className="text-white" />
            )}
          </button>
          <button
            type="button"
            onClick={handleToggleMobileMenu}
            className="inline-flex shrink-0 rounded-lg p-2 transition hover:bg-emerald-800 lg:hidden"
            aria-label={isMobileMenuOpen ? "Close workspace menu" : "Open workspace menu"}
          >
            {isMobileMenuOpen ? (
              <XIcon size={20} weight="bold" className="text-white" />
            ) : (
              <ListBulletsIcon size={20} weight="duotone" className="text-white" />
            )}
          </button>
        </div>
        {!effectiveCollapsed && isDesktop && showSidebarContent && (
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
      <button
        type="button"
        aria-label="Close workspace menu overlay"
        className={mobileBackdropClassName}
        onClick={() => setIsMobileMenuOpen(false)}
      />
      <div className={mobileNavPanelClassName} aria-hidden={!showSidebarContent}>
        <div className="min-h-0 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          {!effectiveCollapsed && showSidebarContent && (
            <div className="flex items-center gap-2 border-b border-emerald-800 p-2 lg:hidden">
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
          <nav className="max-h-[65dvh] flex-1 overflow-y-auto p-2 lg:max-h-none">
            {viewMode === "grid" && !effectiveCollapsed ? (
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
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
                          effectiveCollapsed
                            ? "justify-center px-2 py-3"
                            : "items-start gap-4 px-4 py-3 text-left"
                        } ${isActive ? "bg-emerald-800" : ""}`}
                      >
                        <div
                          className={`flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white ${
                            effectiveCollapsed ? "p-2" : "p-2.5"
                          }`}
                        >
                          <Icon
                            size={effectiveCollapsed ? 20 : 24}
                            weight="duotone"
                            className="text-white"
                          />
                        </div>
                        {!effectiveCollapsed && (
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
            className={`border-t border-emerald-800 ${effectiveCollapsed ? "p-2" : "p-3"}`}
          >
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              title={
                effectiveCollapsed ? `${displayName} (${user.email ?? "—"})` : undefined
              }
              className={`flex w-full items-center rounded-lg transition hover:bg-emerald-800 ${
                effectiveCollapsed
                  ? "justify-center px-2 py-2.5"
                  : "gap-3 px-3 py-2.5 text-left"
              }`}
            >
              <div
                className={`flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-emerald-800 font-semibold text-white ${
                  effectiveCollapsed ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm"
                }`}
              >
                {firstLetter}
              </div>
              {!effectiveCollapsed && (
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
        </div>
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
