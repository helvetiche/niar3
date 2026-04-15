"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { fetchProfile } from "@/lib/api/profile";
import {
  HouseIcon,
  GearIcon,
  FileTextIcon,
  FileXlsIcon,
  ArrowsMergeIcon,
  MagnifyingGlassIcon,
  CaretLeftIcon,
  CaretRightIcon,
  ListBulletsIcon,
  ListChecksIcon,
  SquaresFourIcon,
  PencilSimpleIcon,
  SignOutIcon,
  XIcon,
  UsersThreeIcon,
  ShieldCheckIcon,
  FolderOpenIcon,
  PackageIcon,
  ArrowsOutIcon,
} from "@phosphor-icons/react";
import type { AuthUser } from "@/types/auth";
import { useWorkspaceTab } from "@/contexts/WorkspaceContext";
import type { UserProfile } from "@/types/profile";
import type { WorkspaceTab } from "@/contexts/WorkspaceContext";
import { useToolOrder } from "@/hooks/useToolOrder";
import { usePinnedTools } from "@/hooks/usePinnedTools";
import { DraggableToolItem } from "./DraggableToolItem";
import { MasonryModal } from "./MasonryModal";
import { ProfileModal } from "./ProfileModal";

const SIDEBAR_COLLAPSED_KEY = "sidebar_collapsed";
const DRAG_MODE_KEY = "sidebar_drag_mode";

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

function loadDragMode(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(DRAG_MODE_KEY) === "1";
  } catch {
    return false;
  }
}

function saveDragMode(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DRAG_MODE_KEY, enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
}

const TOOLS = [
  {
    id: "hub" as const,
    name: "HUB",
    description: "Central workspace hub for quick access to all productivity tools.",
    icon: HouseIcon,
  },
  {
    id: "template-manager" as const,
    name: "TEMPLATE MANAGER",
    description:
      "View and update shared templates used across IFR and accomplishment report tools.",
    icon: GearIcon,
  },
  {
    id: "lipa-summary" as const,
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
    icon: FileTextIcon,
  },
  {
    id: "merge-files" as const,
    name: "MERGE FILES",
    description:
      "Merge PDF files with page ordering and combine Excel files into one workbook.",
    icon: ArrowsMergeIcon,
  },
  {
    id: "accomplishment-report" as const,
    name: "ACCOMPLISHMENT REPORT",
    description: "Generate quincena accomplishment reports.",
    icon: FileXlsIcon,
  },
  {
    id: "ifr-scanner" as const,
    name: "GENERATE BILLING UNIT",
    description: "Scan and extract data from IFR documents automatically.",
    icon: MagnifyingGlassIcon,
  },
  {
    id: "consolidate-land-profiles" as const,
    name: "CONSOLIDATE IFR",
    description:
      "Consolidate multiple IFR files into a single output file with automatic calculations.",
    icon: FolderOpenIcon,
  },
  {
    id: "ifr-checker" as const,
    name: "IFR CHECKER",
    description:
      "Validate consolidated files against source IFR data and identify discrepancies.",
    icon: ShieldCheckIcon,
  },
  {
    id: "accounts" as const,
    name: "ACCOUNTS",
    description: "Manage user accounts and permissions in the system.",
    icon: UsersThreeIcon,
    requiresSuperAdmin: true,
  },
  {
    id: "inventory" as const,
    name: "INVENTORY",
    description: "Track and manage inventory items with quarterly data.",
    icon: PackageIcon,
  },
  {
    id: "calendar" as const,
    name: "CALENDAR",
    description: "Manage your schedule with color-coded calendar notes and deadlines.",
    icon: ListBulletsIcon,
  },
  {
    id: "schedules" as const,
    name: "SCHEDULES",
    description: "Email schedules with automatic reminders and deadline tracking.",
    icon: SquaresFourIcon,
  },
  {
    id: "task-manager" as const,
    name: "TASK MANAGER",
    description:
      "Check off recurring schedules for the current period with period-based completion tracking.",
    icon: ListChecksIcon,
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
  const [isDesktop, setIsDesktop] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [isMounted, setIsMounted] = useState(false);
  const [isDragMode, setIsDragMode] = useState(false);
  const skipPersistCollapsed = useRef(true);
  const skipPersistDragMode = useRef(true);
  const { selectedTab, setSelectedTab } = useWorkspaceTab();
  const { toolOrder, updateToolOrder, resetToolOrder } = useToolOrder(
    TOOLS.map((t) => t.id)
  );
  const { isPinned, togglePin } = usePinnedTools();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    setCollapsed(loadSidebarCollapsed());
    setIsDragMode(loadDragMode());
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchProfile()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile({ first: "", middle: "", last: "", birthday: "" });
      });
    return () => {
      cancelled = true;
    };
  }, [user.uid]);

  useEffect(() => {
    if (skipPersistCollapsed.current) {
      skipPersistCollapsed.current = false;
      return;
    }
    saveSidebarCollapsed(collapsed);
  }, [collapsed]);

  useEffect(() => {
    if (skipPersistDragMode.current) {
      skipPersistDragMode.current = false;
      return;
    }
    saveDragMode(isDragMode);
  }, [isDragMode]);

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

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const activeId = active.id as WorkspaceTab;
      const overId = over.id as WorkspaceTab;
      const oldIndex = toolOrder.indexOf(activeId);
      const newIndex = toolOrder.indexOf(overId);
      updateToolOrder(arrayMove(toolOrder, oldIndex, newIndex));
    }
  };

  const toggleCollapsed = () => setCollapsed((c) => !c);
  const handleToggleMobileMenu = () => setIsMobileMenuOpen((isOpen) => !isOpen);
  const handleToggleDragMode = () => setIsDragMode((mode) => !mode);
  const handleResetToolOrder = () => {
    resetToolOrder();
    setIsDragMode(false);
  };
  const handleOpenLogoutModal = () => {
    setLogoutError("");
    setIsLogoutModalOpen(true);
  };
  const handleCloseLogoutModal = () => {
    if (isLoggingOut) return;
    setIsLogoutModalOpen(false);
    setLogoutError("");
  };
  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    setLogoutError("");
    try {
      const response = await fetch("/api/v1/auth/session", {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Failed to logout");
      }
      window.location.assign("/login");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to logout. Please try again.";
      setLogoutError(message);
      setIsLoggingOut(false);
    }
  };

  const displayName = getDisplayName(profile, user.email);
  const firstLetter = (profile.first?.[0] || user.email?.[0] || "U").toUpperCase();
  const isSuperAdmin = user.customClaims?.role === "super-admin";
  const userPermissions = user.customClaims?.permissions || [];

  // Sort tools based on saved order
  const sortedTools = TOOLS.filter((tool) => {
    // Always show hub
    if (tool.id === "hub") {
      return true;
    }

    // Super admins have access to everything
    if (isSuperAdmin) {
      return true;
    }

    // Check if user has permission for this tool
    if (!userPermissions.includes(tool.id)) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // First, sort by pinned status (pinned items first)
    const aPinned = isPinned(a.id);
    const bPinned = isPinned(b.id);

    if (aPinned && !bPinned) return -1;
    if (!aPinned && bPinned) return 1;

    // Then sort by saved order
    return toolOrder.indexOf(a.id) - toolOrder.indexOf(b.id);
  });

  // Apply search filter if not in drag mode
  const displayedTools = isDragMode
    ? sortedTools
    : sortedTools.filter(
        (tool) =>
          tool.name.toLowerCase().includes(search.toLowerCase()) ||
          tool.description.toLowerCase().includes(search.toLowerCase())
      );

  const effectiveCollapsed = collapsed && isDesktop;
  const navItems = effectiveCollapsed ? TOOLS : displayedTools;
  const showSidebarContent = isDesktop || isMobileMenuOpen;
  const mobileNavPanelClassName = isDesktop
    ? "flex min-h-0 flex-1 flex-col"
    : `absolute left-0 right-0 top-full z-40 flex max-h-[calc(100dvh-var(--mobile-workspace-chrome,4.75rem)-env(safe-area-inset-bottom,0px))] flex-col overflow-hidden origin-top border-b border-emerald-800 bg-emerald-900 shadow-2xl shadow-emerald-950/40 transition-all duration-300 ease-out motion-reduce:transition-none ${
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
      className={`sticky top-0 z-40 flex w-full shrink-0 flex-col self-start overflow-visible border-b border-emerald-950/50 bg-emerald-900 pt-[env(safe-area-inset-top,0px)] lg:z-auto lg:h-screen lg:overflow-hidden lg:border-b-0 lg:border-r lg:pt-0 lg:transition-[width] lg:duration-200 lg:ease-out ${
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
          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
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
              aria-label={
                isMobileMenuOpen ? "Close workspace menu" : "Open workspace menu"
              }
            >
              {isMobileMenuOpen ? (
                <XIcon size={20} weight="bold" className="text-white" />
              ) : (
                <ListBulletsIcon size={20} weight="duotone" className="text-white" />
              )}
            </button>
          </div>
        </div>
        {!effectiveCollapsed && isDesktop && showSidebarContent && (
          <div className="mt-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
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
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleDragMode}
                title={isDragMode ? "Exit arrange mode" : "Arrange tools"}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isDragMode
                    ? "bg-emerald-700 text-white"
                    : "border border-white/60 bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
                }`}
              >
                <ArrowsOutIcon size={16} weight="duotone" />
                {isDragMode ? "Arranging..." : "Arrange"}
              </button>
              {isDragMode && (
                <button
                  type="button"
                  onClick={handleResetToolOrder}
                  title="Reset to default order"
                  className="rounded-lg border border-white/60 bg-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/20 hover:text-white"
                >
                  Reset
                </button>
              )}
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
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden lg:flex lg:min-h-0 lg:flex-1 lg:flex-col">
          {!effectiveCollapsed && showSidebarContent && (
            <div className="flex shrink-0 items-center gap-2 border-b border-emerald-800 p-2 lg:hidden">
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
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:px-2 lg:pb-2 lg:pt-0">
            <nav aria-label="Workspace tools">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {viewMode === "grid" && !effectiveCollapsed ? (
                  <ul className="grid grid-cols-3 gap-2">
                    {navItems.map((item) => {
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
                              <item.icon
                                size={24}
                                weight="duotone"
                                className="text-white"
                              />
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
                  <SortableContext
                    items={navItems.map((item) => item.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <ul className="space-y-1">
                      {navItems.map((item) => {
                        const isActive = selectedTab === item.id;
                        return (
                          <DraggableToolItem
                            key={item.id}
                            id={item.id}
                            name={item.name}
                            description={item.description}
                            icon={item.icon}
                            isActive={isActive}
                            isCollapsed={effectiveCollapsed}
                            isDragEnabled={isDragMode}
                            isPinned={isPinned(item.id)}
                            onTogglePin={(id) => togglePin(id as WorkspaceTab)}
                            onClick={() => setSelectedTab(item.id)}
                          />
                        );
                      })}
                    </ul>
                  </SortableContext>
                )}
              </DndContext>
            </nav>
            <div
              className={`mt-2 border-t border-emerald-800 ${effectiveCollapsed ? "p-2" : "p-3"}`}
            >
              <button
                type="button"
                onClick={() => setIsProfileOpen(true)}
                title={
                  effectiveCollapsed
                    ? `${displayName} (${user.email ?? "—"})`
                    : undefined
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
                      {isMounted && (
                        <p className="mt-0.5 truncate text-xs font-medium text-emerald-300/90">
                          {isSuperAdmin
                            ? "Super Admin"
                            : user.customClaims?.role === "admin"
                              ? "Admin"
                              : "User"}
                        </p>
                      )}
                    </div>
                    <PencilSimpleIcon
                      size={18}
                      weight="duotone"
                      className="shrink-0 text-white/70"
                    />
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={handleOpenLogoutModal}
                title={effectiveCollapsed ? "Logout" : undefined}
                aria-label="Open logout confirmation"
                className={`mt-2 flex w-full items-center rounded-lg border border-white/35 transition hover:bg-emerald-800 ${
                  effectiveCollapsed
                    ? "justify-center px-2 py-2.5"
                    : "gap-3 px-3 py-2.5 text-left"
                }`}
              >
                <div
                  className={`flex shrink-0 items-center justify-center rounded-full border border-white/30 text-white ${
                    effectiveCollapsed ? "h-9 w-9" : "h-10 w-10"
                  }`}
                >
                  <SignOutIcon size={effectiveCollapsed ? 18 : 20} />
                </div>
                {!effectiveCollapsed && (
                  <div className="min-w-0 flex-1 overflow-hidden">
                    <p className="truncate text-sm font-medium text-white">Logout</p>
                    <p className="truncate text-xs text-emerald-200/80">
                      End current session safely
                    </p>
                  </div>
                )}
              </button>
            </div>
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
      <MasonryModal
        isOpen={isLogoutModalOpen}
        onClose={handleCloseLogoutModal}
        animateFrom="center"
        blurToFocus={false}
        panelClassName="max-w-md"
        duration={0.35}
      >
        {(close) => (
          <div
            className="rounded-2xl border border-white/20 bg-emerald-950 p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-label="Logout confirmation"
          >
            <h3 className="text-lg font-medium text-white">Confirm Logout</h3>
            <p className="mt-2 text-sm text-white/85">
              Are you sure you want to logout from this account?
            </p>
            {logoutError && (
              <p className="mt-3 rounded-lg border border-rose-300/40 bg-rose-900/20 px-3 py-2 text-xs text-rose-100">
                {logoutError}
              </p>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={close}
                disabled={isLoggingOut}
                aria-label="Cancel logout"
                className="rounded-lg border border-white/35 px-3 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:text-white/60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  void handleConfirmLogout();
                }}
                disabled={isLoggingOut}
                aria-label="Confirm logout"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:bg-white/60"
              >
                <SignOutIcon size={16} />
                {isLoggingOut ? "Logging out..." : "Yes, Logout"}
              </button>
            </div>
          </div>
        )}
      </MasonryModal>
    </aside>
  );
}
