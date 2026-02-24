import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";
import { Hero } from "@/components/layout/hero";
import { Features } from "@/components/layout/features";
import { Footer } from "@/components/layout/footer";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export default async function Home() {
  const result = await getSession();
  if (result.user) {
    redirect("/workspace");
  }

  return (
    <main>
      <Hero />
      <Features />
      <Footer />
      <PwaInstallPrompt />
    </main>
  );
}
