import { Hero } from "@/components/layout/hero";
import { Features } from "@/components/layout/features";
import { Footer } from "@/components/layout/footer";
import { PwaInstallPrompt } from "@/components/PwaInstallPrompt";

export default function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Footer />
      <PwaInstallPrompt />
    </main>
  );
}
