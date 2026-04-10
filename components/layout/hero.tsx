"use client";

import Image from "next/image";
import { Suspense, useState } from "react";
import {
  RobotIcon,
  LightningIcon,
  ChartLineUpIcon,
  MapPinIcon,
  SignInIcon,
  UserIcon,
  LockIcon,
} from "@phosphor-icons/react";
import { BannerWithLoginClient } from "@/components/BannerWithLoginClient";
import { LoginModal } from "@/components/LoginModal";

export function Hero() {
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  return (
    <section className="relative min-h-screen w-screen">
      <Suspense
        fallback={
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
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-emerald-900 transition hover:bg-white/90 sm:gap-3 sm:rounded-full sm:pl-2 sm:pr-4"
            >
              <span className="hidden sm:flex sm:h-8 sm:w-8 sm:shrink-0 sm:items-center sm:justify-center sm:overflow-hidden sm:rounded-full sm:bg-emerald-900">
                <UserIcon size={16} weight="fill" className="text-white" />
              </span>
              <SignInIcon size={16} weight="duotone" className="hidden sm:block" />
              <span>Login</span>
            </button>
          </div>
        }
      >
        <BannerWithLoginClient />
      </Suspense>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "url(/tools-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 bg-gradient-to-b from-transparent to-emerald-900"
        aria-hidden="true"
      />
      {/* Bottom content: stacks vertically on mobile, side-by-side on desktop */}
      <div className="absolute bottom-4 left-4 right-4 z-10 flex flex-col gap-6 md:bottom-12 md:left-8 md:right-8 md:flex-row md:items-end md:justify-between md:gap-8">
        <div className="max-w-2xl space-y-3 md:space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl">
            Work Smarter, Deliver Faster
          </h1>
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
              <RobotIcon size={18} weight="duotone" className="shrink-0" />
              Automations
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
              <LightningIcon size={18} weight="duotone" className="shrink-0" />
              Speed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white backdrop-blur-sm sm:gap-2 sm:px-4 sm:py-1.5 sm:text-sm">
              <ChartLineUpIcon size={18} weight="duotone" className="shrink-0" />
              Efficiency
            </span>
          </div>
          <p
            className="text-sm leading-relaxed text-white/90 sm:hidden"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            Automates manual processes into minute-level results. Streamlines workflows
            so teams focus on meaningful work.
          </p>
          <p
            className="hidden text-base leading-relaxed text-white/90 text-justify sm:block md:text-lg"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            A NIA-based tool that automates manual processes, transforming hour-long
            tasks into minute-level results. Designed to streamline workflows, reduce
            repetitive effort, and help teams focus on meaningful, high-value work every
            day.
          </p>
        </div>
        <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex flex-col gap-2 sm:items-end">
            {/* Login Button */}
            <button
              type="button"
              onClick={() => setIsLoginModalOpen(true)}
              className="inline-flex self-start items-center justify-center gap-2 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:bg-white/20 hover:border-white/30 hover:shadow-lg hover:shadow-white/10 sm:self-end sm:gap-3 sm:rounded-full sm:pl-3 sm:pr-5"
            >
              <span className="hidden sm:flex sm:h-7 sm:w-7 sm:shrink-0 sm:items-center sm:justify-center sm:overflow-hidden sm:rounded-full sm:bg-white/15 sm:backdrop-blur-sm">
                <UserIcon size={14} weight="fill" className="text-white" />
              </span>
              <SignInIcon size={16} weight="duotone" className="hidden sm:block" />
              <span>Login</span>
            </button>
            <h2 className="text-base font-semibold tracking-tight text-white sm:text-right sm:text-lg md:text-xl">
              National Irrigation Administration R3
            </h2>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                <MapPinIcon size={14} weight="duotone" className="shrink-0" />
                Region 3
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-2.5 py-1 text-xs font-medium text-white backdrop-blur-sm sm:px-3">
                <MapPinIcon size={14} weight="duotone" className="shrink-0" />
                Tambubong, San Rafael, Bulacan
              </span>
            </div>
          </div>
          <Image
            src="/logo.png"
            alt="NIA Logo"
            width={200}
            height={80}
            className="hidden h-10 w-auto shrink-0 object-contain sm:block sm:h-12 md:h-14"
          />
        </header>
      </div>
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </section>
  );
}
