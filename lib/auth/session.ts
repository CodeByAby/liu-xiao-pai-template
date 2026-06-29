import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

type AccessUser = {
  banExpires: Date | null;
  banned: boolean;
  emailVerified: boolean;
  id: string;
  role: string;
};

type ActiveSessionResult =
  | {
      ok: true;
      user: AccessUser;
    }
  | {
      ok: false;
      error: string;
      status: 401 | 403;
    };

type AccessResolutionOptions = {
  now?: Date;
};

export function isBanActive(
  targetUser: Pick<AccessUser, "banned" | "banExpires">,
  { now = new Date() }: AccessResolutionOptions = {}
) {
  if (!targetUser.banned) {
    return false;
  }

  if (!targetUser.banExpires) {
    return true;
  }

  return targetUser.banExpires.getTime() > now.getTime();
}

export function resolveSessionAccess(
  targetUser: AccessUser | null,
  options: AccessResolutionOptions = {}
): ActiveSessionResult {
  if (!targetUser) {
    return {
      ok: false,
      error: "Unauthorized",
      status: 401,
    };
  }

  if (isBanActive(targetUser, options)) {
    return {
      ok: false,
      error: "User is banned",
      status: 403,
    };
  }

  return {
    ok: true,
    user: targetUser,
  };
}

export async function getActiveSessionUser(
  requestHeaders: Headers,
  options: AccessResolutionOptions = {}
): Promise<ActiveSessionResult> {
  const session = await auth.api.getSession({
    headers: requestHeaders,
  });

  const userId = session?.session?.userId;
  if (!userId) {
    return {
      ok: false,
      error: "Unauthorized",
      status: 401,
    };
  }

  const dbUsers = await db
    .select({
      id: user.id,
      emailVerified: user.emailVerified,
      banned: user.banned,
      banExpires: user.banExpires,
      role: user.role,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return resolveSessionAccess(dbUsers[0] ?? null, options);
}
