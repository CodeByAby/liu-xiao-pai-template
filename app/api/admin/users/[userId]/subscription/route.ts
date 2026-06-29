import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    
    const body = await request.json();
    const { planKey, status } = body;
    
    if (!planKey || !status) {
      return NextResponse.json(
        { error: "Plan key and status are required" },
        { status: 400 }
      );
    }
    
    // Update user's subscription
    await db
      .update(user)
      .set({
        planKey,
        updatedAt: new Date(),
      })
      .where(eq(user.id, params.userId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update subscription:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    
    // Cancel user's subscription (set to free plan)
    await db
      .update(user)
      .set({
        planKey: "free",
        updatedAt: new Date(),
      })
      .where(eq(user.id, params.userId));
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to cancel subscription:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}