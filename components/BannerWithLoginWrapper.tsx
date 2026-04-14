"use client";

import { LockIcon } from "@phosphor-icons/react";

export const BannerWithLoginWrapper = () => {
  return (
    <div className="absolute left-0 right-0 top-0 z-10 flex w-full items-center gap-3 bg-emerald-900/95 px-4 py-3 sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          <LockIcon size={18} weight="duotone" className="shrink-0" />
          <span>Exclusive for NIA O&M Employees</span>
        </div>
        <p className="mt-1 hidden text-xs text-white/90 sm:block">
          Designed for NIA employees to streamline workflows, automate manual tasks, and
          boost productivity across the organization.
        </p>
      </div>
    </div>
  );
};
