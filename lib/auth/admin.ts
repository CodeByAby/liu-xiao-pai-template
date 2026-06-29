import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getActiveSessionUser } from "@/lib/auth/session";

/**
 * Check if the current user is an admin
 * @returns {Promise<boolean>} true if the user is an admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  const access = await getActiveSessionUser(await headers());
  if (!access.ok) {
    return false;
  }

  return access.user.role === "admin";
}

/**
 * Protect a route for admin access only
 * Redirects to dashboard if not an admin
 */
export async function requireAdmin() {
  const adminStatus = await isAdmin();
  
  if (!adminStatus) {
    redirect("/dashboard");
  }
}

/**
 * Get current user with admin status
 */
export async function getCurrentUserWithRole() {
  const access = await getActiveSessionUser(await headers());
  if (!access.ok) {
    return null;
  }

  return access.user;
}
