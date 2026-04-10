import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginPageContent } from "@/components/LoginPageContent";
import { getSession } from "@/lib/auth/get-session";

export const metadata: Metadata = {
  title: "Login",
  description: "Sign in to NIA Region 3 productivity tools.",
};

/**
 * Dedicated login page. Auth guards redirect here when the user is not signed in.
 */
export default async function LoginPage() {
  const result = await getSession();
  if (result.user) {
    redirect("/workspace");
  }
  return <LoginPageContent />;
}
