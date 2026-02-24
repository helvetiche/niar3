import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/get-session";

/**
 * Login page - redirects to workspace if already logged in,
 * otherwise to home where the login modal is shown.
 * Used by auth guards (requireAuth, requirePermission) when user is unauthenticated.
 */
export default async function LoginPage() {
  const result = await getSession();
  if (result.user) {
    redirect("/workspace");
  }
  redirect("/?login=1");
}
