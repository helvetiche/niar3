"use client";

import { useState } from "react";
import Image from "next/image";
import {
  FileTextIcon,
  StackIcon,
  MagnifyingGlassIcon,
  EnvelopeSimpleIcon,
  UserIcon,
} from "@phosphor-icons/react";
import type { AuthUser } from "@/types/auth";

const TOOLS = [
  {
    id: "lipa-summary",
    name: "LIPA SUMMARY",
    description: "Generate summary reports for LIPA documents and records.",
    icon: FileTextIcon,
  },
  {
    id: "consolidate-ifr",
    name: "CONSOLIDATE IFR",
    description: "Merge and consolidate IFR documents into a single file.",
    icon: StackIcon,
  },
  {
    id: "ifr-scanner",
    name: "IFR SCANNER",
    description: "Scan and extract data from IFR documents automatically.",
    icon: MagnifyingGlassIcon,
  },
  {
    id: "email-automation",
    name: "EMAIL AUTOMATION",
    description: "Automate email workflows and bulk email tasks.",
    icon: EnvelopeSimpleIcon,
  },
] as const;

function getDisplayName(email: string | null): string {
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
  const displayName = getDisplayName(user.email);

  const filteredTools = TOOLS.filter(
    (tool) =>
      tool.name.toLowerCase().includes(search.toLowerCase()) ||
      tool.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-emerald-950/50 bg-emerald-900">
      <div className="border-b border-emerald-800 px-4 py-4">
        <div className="flex items-start gap-3">
          <Image
            src="/logo.png"
            alt="NIA Logo"
            width={40}
            height={40}
            className="h-10 w-auto shrink-0 object-contain"
          />
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-white">
              NIA Productivity Tools
            </h2>
            <p className="mt-1 text-xs text-emerald-200/80">
              Work smarter, deliver faster.
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/60 bg-white/10 px-3 py-2">
          <MagnifyingGlassIcon size={18} weight="duotone" className="shrink-0 text-white" />
          <input
            type="search"
            placeholder="Search tools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder:text-white/70 focus:outline-none"
          />
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto p-2">
        <ul className="space-y-1">
          {filteredTools.map((tool) => {
            const Icon = tool.icon;
            return (
              <li key={tool.id}>
                <button
                  type="button"
                  className="flex w-full items-start gap-4 rounded-lg px-4 py-3 text-left transition hover:bg-emerald-800"
                >
                  <div className="flex shrink-0 items-center justify-center rounded-lg border-2 border-dashed border-white p-2.5">
                    <Icon
                      size={24}
                      weight="duotone"
                      className="text-white"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">{tool.name}</p>
                    <p className="mt-0.5 text-xs text-emerald-200/80 line-clamp-2">
                      {tool.description}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="border-t border-emerald-800 p-3">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-800">
            <UserIcon size={22} weight="fill" className="text-white" />
          </div>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-white">{displayName}</p>
            <p className="truncate text-xs text-emerald-200/80">{user.email ?? "—"}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
