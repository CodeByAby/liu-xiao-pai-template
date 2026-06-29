import { addMonths } from "date-fns";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { creditLedger, subscriptionCreditSchedule, user as userTable } from "@/lib/db/schema";
import { sql, and, eq, lte, gt } from "drizzle-orm";
import {
  type PlanKey,
  subscriptionPlans,
  type GrantScheduleConfig,
} from "@/constants/billing";

export type InstallmentScheduleConfig = {
  planKey: PlanKey;
  creditsPerCycle: number;
  grantsPerCycle: number;
  intervalMonths: number;
  creditsPerGrant: number;
  initialGrants: number;
};

export type DerivedGrantSchedule = InstallmentScheduleConfig & {
  totalCycleCredits: number;
};

export const SUBSCRIPTION_SCHEDULE_REASON = "subscription_schedule";

export function getGrantSchedule(planKey: PlanKey): DerivedGrantSchedule | null {
  const plan = subscriptionPlans[planKey];
  if (!plan) {
    throw new Error(`Unknown subscription plan: ${planKey}`);
  }

  const schedule = plan.grantSchedule;
  if (!schedule || schedule.mode === "per_cycle") {
    return null;
  }

  return deriveInstallmentConfig(planKey, plan.creditsPerCycle, schedule);
}

function deriveInstallmentConfig(
  planKey: PlanKey,
  creditsPerCycle: number,
  schedule: Extract<GrantScheduleConfig, { mode: "installments" }>,
): DerivedGrantSchedule {
  const grantsPerCycle = Math.max(1, schedule.grantsPerCycle);
  const intervalMonths = Math.max(1, schedule.intervalMonths);
  const initialGrants = Math.min(schedule.initialGrants ?? 1, grantsPerCycle);

  const inferredCreditsPerGrant = schedule.creditsPerGrant ?? Math.floor(creditsPerCycle / grantsPerCycle);
  const creditsPerGrant = Math.max(1, inferredCreditsPerGrant);

  return {
    planKey,
    creditsPerCycle,
    grantsPerCycle,
    intervalMonths,
    creditsPerGrant,
    initialGrants,
    totalCycleCredits: creditsPerCycle,
  };
}

export function computeInitialGrant(schedule: DerivedGrantSchedule) {
  const immediateGrants = Math.min(schedule.initialGrants, schedule.grantsPerCycle);
  const creditsNow = Math.min(schedule.totalCycleCredits, schedule.creditsPerGrant * immediateGrants);
  const grantsRemaining = schedule.grantsPerCycle - immediateGrants;
  const totalCreditsRemaining = schedule.totalCycleCredits - creditsNow;

  return {
    creditsNow,
    grantsRemaining: Math.max(0, grantsRemaining),
    totalCreditsRemaining: Math.max(0, totalCreditsRemaining),
    nextGrantAt: grantsRemaining > 0 ? addMonths(new Date(), schedule.intervalMonths) : null,
  };
}

export type ScheduleCreationPayload = {
  subscriptionId: string;
  userId: string;
  derivedSchedule: DerivedGrantSchedule;
  grantsRemaining: number;
  totalCreditsRemaining: number;
  nextGrantAt: Date | null;
};

type DbExecutor = Pick<typeof db, "delete" | "insert">;

export async function resetSubscriptionSchedule(
  payload: ScheduleCreationPayload,
  executor: DbExecutor = db,
) {
  const { subscriptionId, userId, derivedSchedule, grantsRemaining, totalCreditsRemaining, nextGrantAt } = payload;

  if (grantsRemaining <= 0 || !nextGrantAt) {
    // Clean up any stale schedule if we no longer need installments
    await executor
      .delete(subscriptionCreditSchedule)
      .where(eq(subscriptionCreditSchedule.subscriptionId, subscriptionId));
    return;
  }

  await executor
    .insert(subscriptionCreditSchedule)
    .values({
      id: randomUUID(),
      subscriptionId,
      userId,
      planKey: derivedSchedule.planKey,
      creditsPerGrant: derivedSchedule.creditsPerGrant,
      intervalMonths: derivedSchedule.intervalMonths,
      grantsRemaining,
      totalCreditsRemaining,
      nextGrantAt,
    })
    .onConflictDoUpdate({
      target: subscriptionCreditSchedule.subscriptionId,
      set: {
        userId,
        planKey: derivedSchedule.planKey,
        creditsPerGrant: derivedSchedule.creditsPerGrant,
        intervalMonths: derivedSchedule.intervalMonths,
        grantsRemaining,
        totalCreditsRemaining,
        nextGrantAt,
        updatedAt: new Date(),
      },
    });
}

export async function deleteSubscriptionSchedule(
  subscriptionId: string,
  executor: DbExecutor = db,
) {
  await executor
    .delete(subscriptionCreditSchedule)
    .where(eq(subscriptionCreditSchedule.subscriptionId, subscriptionId));
}

export async function processDueSchedules(limit = 50, catchUpPerSchedule: number | undefined = 12) {
  catchUpPerSchedule = catchUpPerSchedule ?? 12;
  if (catchUpPerSchedule < 1) {
    catchUpPerSchedule = 1;
  }

  const now = new Date();

  return db.transaction(async tx => {
    const schedules = await tx
      .select()
      .from(subscriptionCreditSchedule)
      .where(
        and(
          lte(subscriptionCreditSchedule.nextGrantAt, now),
          gt(subscriptionCreditSchedule.grantsRemaining, 0),
        ),
      )
      .orderBy(subscriptionCreditSchedule.nextGrantAt)
      .limit(limit)
      .for("update", { skipLocked: true });

    const results: Array<{
      scheduleId: string;
      subscriptionId: string;
      userId: string;
      totalGranted: number;
      grantsProcessed: number;
      remainingGrants: number;
    }> = [];

    for (const schedule of schedules) {
      let grantsRemaining = schedule.grantsRemaining;
      let creditsRemaining = schedule.totalCreditsRemaining;
      let nextGrantAt = schedule.nextGrantAt ?? now;
      let processed = 0;
      let grantedSum = 0;

      while (
        grantsRemaining > 0 &&
        creditsRemaining > 0 &&
        nextGrantAt <= now &&
        processed < catchUpPerSchedule
      ) {
        const grantAmount = grantsRemaining > 1
          ? Math.min(schedule.creditsPerGrant, creditsRemaining)
          : creditsRemaining;

        if (grantAmount <= 0) {
          break;
        }

        await tx
          .update(userTable)
          .set({ credits: sql`${userTable.credits} + ${grantAmount}` })
          .where(eq(userTable.id, schedule.userId));

        await tx.insert(creditLedger).values({
          id: randomUUID(),
          userId: schedule.userId,
          delta: grantAmount,
          reason: SUBSCRIPTION_SCHEDULE_REASON,
        });

        grantsRemaining -= 1;
        creditsRemaining = Math.max(0, creditsRemaining - grantAmount);
        grantedSum += grantAmount;
        processed += 1;
        nextGrantAt = addMonths(nextGrantAt, schedule.intervalMonths);
      }

      if (grantedSum > 0) {
        if (grantsRemaining <= 0 || creditsRemaining <= 0) {
          await tx
            .delete(subscriptionCreditSchedule)
            .where(eq(subscriptionCreditSchedule.id, schedule.id));
        } else {
          await tx
            .update(subscriptionCreditSchedule)
            .set({
              grantsRemaining,
              totalCreditsRemaining: creditsRemaining,
              nextGrantAt,
              updatedAt: new Date(),
            })
            .where(eq(subscriptionCreditSchedule.id, schedule.id));
        }

        results.push({
          scheduleId: schedule.id,
          subscriptionId: schedule.subscriptionId,
          userId: schedule.userId,
          totalGranted: grantedSum,
          grantsProcessed: processed,
          remainingGrants: Math.max(0, grantsRemaining),
        });
      }
    }

    return results;
  });
}
