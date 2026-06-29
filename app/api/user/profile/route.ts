import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user as userTable, subscription as subscriptionTable } from "@/lib/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getActiveSessionUser } from "@/lib/auth/session";
import {
  normalizeProfileName,
  updateProfileSchema,
} from "@/lib/account-settings";

export async function GET(req: NextRequest) {
  try {
    // Get session from Better Auth
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const userId = access.user.id;

    // Get user with credits
    const users = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        image: userTable.image,
        credits: userTable.credits,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .where(eq(userTable.id, userId));

    if (users.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = users[0];

    // Get active subscription
    const subscriptions = await db
      .select()
      .from(subscriptionTable)
      .where(
        and(
          eq(subscriptionTable.userId, userId),
          eq(subscriptionTable.status, "active")
        )
      )
      .orderBy(desc(subscriptionTable.updatedAt))
      .limit(1);

    const activeSubscription = subscriptions[0];

    return NextResponse.json({
      user: {
        ...user,
        subscription: activeSubscription ? {
          planKey: activeSubscription.planKey,
          status: activeSubscription.status,
          currentPeriodEnd: activeSubscription.currentPeriodEnd,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid profile data" },
        { status: 400 }
      );
    }

    const normalizedName = normalizeProfileName(parsed.data.name);

    const updatedUsers = await db
      .update(userTable)
      .set({ name: normalizedName, updatedAt: new Date() })
      .where(eq(userTable.id, access.user.id))
      .returning({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        emailVerified: userTable.emailVerified,
        image: userTable.image,
        credits: userTable.credits,
        createdAt: userTable.createdAt,
      });

    const updatedUser = updatedUsers[0];

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ user: updatedUser });
  } catch (error) {
    console.error("Error updating user profile:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
