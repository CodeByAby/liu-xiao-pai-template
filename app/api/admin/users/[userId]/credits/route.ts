import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { user, creditLedger } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";

export async function POST(request: NextRequest, props: { params: Promise<{ userId: string }> }) {
  const params = await props.params;
  try {
    await requireAdmin();
    
    const body = await request.json();
    const { amount, reason } = body;
    const delta = Number(amount);

    if (!Number.isFinite(delta) || delta === 0) {
      return NextResponse.json(
        { error: "Amount is required and must be non-zero" },
        { status: 400 }
      );
    }
    
    // Start transaction
    await db.transaction(async (tx) => {
      // Update user's credits
      await tx
        .update(user)
        .set({
          credits: sql`${user.credits} + ${delta}`,
          updatedAt: new Date(),
        })
        .where(eq(user.id, params.userId));
      
      // Add credit ledger entry
      const ledgerEntry: typeof creditLedger.$inferInsert = {
        id: crypto.randomUUID(),
        userId: params.userId,
        delta,
        reason: reason || "adjustment",
      };

      await tx.insert(creditLedger).values(ledgerEntry);
    });
    
    // Get updated user
    const updatedUser = await db
      .select({ credits: user.credits })
      .from(user)
      .where(eq(user.id, params.userId))
      .limit(1);
    
    return NextResponse.json({ 
      success: true,
      credits: updatedUser[0]?.credits 
    });
  } catch (error) {
    console.error("Failed to update credits:", error);
    return NextResponse.json(
      { error: "Failed to update credits" },
      { status: 500 }
    );
  }
}
