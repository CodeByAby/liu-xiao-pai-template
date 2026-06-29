import { db } from "@/lib/db";
import { user as userTable, creditLedger } from "@/lib/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const CHAT_CREDIT_COST = 10; // 每次对话消耗10积分

export async function getUserCredits(userId: string): Promise<number> {
  const users = await db
    .select({ credits: userTable.credits })
    .from(userTable)
    .where(eq(userTable.id, userId));
  
  return users[0]?.credits ?? 0;
}

export async function canUserChat(userId: string): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits >= CHAT_CREDIT_COST;
}

// Check if user has enough credits for a specific action
export async function canUserAfford(userId: string, creditsNeeded: number): Promise<boolean> {
  const credits = await getUserCredits(userId);
  return credits >= creditsNeeded;
}

export async function deductCredits(
  userId: string, 
  amount: number = CHAT_CREDIT_COST,
  reason: string = "chat_usage",
  referenceId?: string
): Promise<{ success: boolean; remainingCredits: number; error?: string }> {
  try {
    // Check if user has enough credits
    const currentCredits = await getUserCredits(userId);
    if (currentCredits < amount) {
      return { 
        success: false, 
        remainingCredits: currentCredits,
        error: "Insufficient credits" 
      };
    }

    // Start transaction
    await db.transaction(async (tx) => {
      // Deduct credits
      await tx
        .update(userTable)
        .set({ 
          credits: sql`${userTable.credits} - ${amount}` 
        })
        .where(eq(userTable.id, userId));

      // Record in ledger
      const ledgerId = randomUUID();
      await tx.insert(creditLedger).values({
        id: ledgerId,
        userId,
        delta: -amount,
        reason,
        paymentId: referenceId,
      });
    });

    // Get updated credits
    const newCredits = await getUserCredits(userId);
    
    return { 
      success: true, 
      remainingCredits: newCredits 
    };
  } catch (error) {
    console.error("Error deducting credits:", error);
    return { 
      success: false, 
      remainingCredits: await getUserCredits(userId),
      error: "Failed to deduct credits" 
    };
  }
}

export async function refundCredits(
  userId: string,
  amount: number,
  reason: string = "refund",
  referenceId?: string
): Promise<{ success: boolean; remainingCredits: number }> {
  try {
    await db.transaction(async (tx) => {
      // Add credits back
      await tx
        .update(userTable)
        .set({ 
          credits: sql`${userTable.credits} + ${amount}` 
        })
        .where(eq(userTable.id, userId));

      // Record in ledger
      const ledgerId = randomUUID();
      await tx.insert(creditLedger).values({
        id: ledgerId,
        userId,
        delta: amount,
        reason,
        paymentId: referenceId,
      });
    });

    const newCredits = await getUserCredits(userId);
    return { success: true, remainingCredits: newCredits };
  } catch (error) {
    console.error("Error refunding credits:", error);
    return { 
      success: false, 
      remainingCredits: await getUserCredits(userId) 
    };
  }
}