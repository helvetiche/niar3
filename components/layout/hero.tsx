import Image from "next/image";
import {
  RobotIcon,
  LightningIcon,
  ChartLineUpIcon,
  MapPinIcon,
} from "@phosphor-icons/react/dist/ssr";
import { BannerWithLogin } from "@/components/BannerWithLogin";

export function Hero() {
  return (
    <section className="relative min-h-screen w-screen overflow-hidden">
      <BannerWithLogin />
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
              <ChartLineUpIcon
                size={18}
                weight="duotone"
                className="shrink-0"
              />
              Efficiency
            </span>
          </div>
          <p
            className="text-sm leading-relaxed text-white/90 sm:hidden"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            Automates manual processes into minute-level results. Streamlines
            workflows so teams focus on meaningful work.
          </p>
          <p
            className="hidden text-base leading-relaxed text-white/90 text-justify sm:block md:text-lg"
            style={{ fontFamily: "var(--font-jetbrains-mono)" }}
          >
            A NIA-based tool that automates manual processes, transforming
            hour-long tasks into minute-level results. Designed to streamline
            workflows, reduce repetitive effort, and help teams focus on
            meaningful, high-value work every day.
          </p>
        </div>
        <header className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-end sm:gap-4">
          <div className="flex flex-col gap-2 sm:items-end">
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
    </section>
  );
}
