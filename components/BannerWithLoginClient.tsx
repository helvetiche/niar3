"use client";

import { useSearchParams } from "next/navigation";
import { BannerWithLoginWrapper } from "./BannerWithLoginWrapper";

export function BannerWithLoginClient() {
  const searchParams = useSearchParams();
  const shouldAutoOpen = searchParams.get("login") === "1";

  return <BannerWithLoginWrapper shouldAutoOpen={shouldAutoOpen} />;
}
