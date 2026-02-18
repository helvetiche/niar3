import { redirect } from "next/navigation";

/**
 * Login page - redirects to home where the login modal is shown.
 * Used by auth guards (requireAuth, requirePermission) when user is unauthenticated.
 */
export default function LoginPage() {
  redirect("/?login=1");
}
