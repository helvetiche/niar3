"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockIcon, SignInIcon, UserIcon } from "@phosphor-icons/react";
import { LoginModal } from "./LoginModal";

export function BannerWithLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (searchParams.get("login") === "1") {
      setIsModalOpen(true);
      router.replace("/", { scroll: false });
    }
  }, [searchParams, router]);

  return (
    <>
      <div className="absolute left-0 right-0 top-0 z-10 flex w-full items-center justify-between gap-3 bg-emerald-900/95 px-4 py-3 sm:px-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm font-medium text-white">
            <LockIcon size={18} weight="duotone" className="shrink-0" />
            <span>Exclusive for NIA O&M Employees</span>
          </div>
          <p className="mt-1 hidden text-xs text-white/90 sm:block">
            Designed for NIA employees to streamline workflows, automate manual
            tasks, and boost productivity across the organization.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-white/90 sm:gap-3 sm:rounded-full sm:pl-2 sm:pr-4"
        >
          <span className="hidden sm:flex sm:h-8 sm:w-8 sm:shrink-0 sm:items-center sm:justify-center sm:overflow-hidden sm:rounded-full sm:bg-emerald-900">
            <UserIcon size={16} weight="fill" className="text-white" />
          </span>
          <SignInIcon size={16} weight="duotone" className="hidden sm:block" />
          <span>Login</span>
        </button>
      </div>
      <LoginModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </>
  );
}
