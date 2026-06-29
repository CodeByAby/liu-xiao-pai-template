import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { getActiveSessionUser } from "@/lib/auth/session";

export async function GET() {
  try {
    const access = await getActiveSessionUser(await headers());
    if (!access.ok) {
      return NextResponse.json({ isAdmin: false });
    }

    return NextResponse.json({ isAdmin: access.user.role === "admin" });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false });
  }
}
