import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/creem";
import { db } from "@/lib/db";
import { creditLedger, payment as paymentTable, subscription as subscriptionTable, user as userTable } from "@/lib/db/schema";
import { isPackKey, isSubscriptionKey, oneTimePacks, subscriptionPlans, PlanKey } from "@/constants/billing";
import {
  computeInitialGrant,
  getGrantSchedule,
  deleteSubscriptionSchedule,
  resetSubscriptionSchedule,
} from "@/lib/billing/subscription";
import { eq, sql } from "drizzle-orm";
import { sendPurchaseEmail } from "@/lib/email";

type CreemMetadata = {
  userId?: string;
  key?: string;
  kind?: "subscription" | "one_time";
  subscriptionId?: string;
};

type CreemDateValue = string | number | Date | null | undefined;

type CreemPeriodInfo = {
  end?: CreemDateValue;
  ends_at?: CreemDateValue;
  end_at?: CreemDateValue;
};

type CreemOrderObject = {
  id?: string;
  amount?: number;
  currency?: string;
  subscription_id?: string;
  subscription?: {
    id?: string;
  };
  subscriptionId?: string;
  current_period_end?: CreemDateValue;
  current_period_end_at?: CreemDateValue;
  current_period?: CreemPeriodInfo;
  billing_period?: CreemPeriodInfo;
  next_payment_at?: CreemDateValue;
  next_payment_date?: CreemDateValue;
  next_billing_at?: CreemDateValue;
  next_billing_date?: CreemDateValue;
};

type CreemWebhookObject = {
  id?: string;
  metadata?: CreemMetadata;
  order?: CreemOrderObject;
  subscription?: {
    id?: string;
  };
  subscriptionId?: string;
  last_transaction?: {
    order?: string;
  };
  product?: {
    price?: number;
    currency?: string;
  };
  current_period_end?: CreemDateValue;
  current_period_end_at?: CreemDateValue;
  currentPeriodEnd?: CreemDateValue;
  currentPeriodEndAt?: CreemDateValue;
  current_period?: CreemPeriodInfo;
  currentPeriod?: CreemPeriodInfo;
  billing_period?: CreemPeriodInfo;
  billingPeriod?: CreemPeriodInfo;
  next_payment_at?: CreemDateValue;
  next_payment_date?: CreemDateValue;
  next_billing_at?: CreemDateValue;
  next_billing_date?: CreemDateValue;
};

type CreemWebhookEvent = {
  id?: string;
  eventType?: string;
  object?: CreemWebhookObject | null;
};

function getErrorMessage(error: unknown, fallback = "Unknown error") {
  return error instanceof Error ? error.message : fallback;
}

export async function POST(req: NextRequest) {
  // Read raw body for signature verification
  const rawBody = await req.text();
  
  // Verify signature
  const ok = verifyWebhookSignature(req.headers, rawBody);
  if (!ok) {
    // Silent fail for signature verification to avoid log spam from retries
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Parse the webhook event
  let event: CreemWebhookEvent;
  try {
    const parsedEvent = JSON.parse(rawBody) as unknown;
    if (!parsedEvent || typeof parsedEvent !== "object") {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    event = parsedEvent as CreemWebhookEvent;
  } catch (error: unknown) {
    console.error("[Creem Webhook] Failed to parse JSON:", getErrorMessage(error));
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Event id (used for idempotency)
  const eventId = event?.id as string | undefined;

  try {
    // Handle Creem webhook structure
    const type = event.eventType;
    
    // Only log important events
    if (type === "checkout.completed" || type === "subscription.paid") {
      console.log(`[Creem Webhook] Processing payment: ${type}`);
    }
    
    // Get the main object
    const mainObject: CreemWebhookObject = event.object ?? {};
    
    // Extract metadata from the correct location based on event type
    let metadata: CreemMetadata = {};
    let paymentId: string | undefined;
    let subscriptionId: string | undefined;
    let amountCents = 0;
    let currency = "usd";
    
    if (type === "checkout.completed") {
      // For checkout.completed, metadata is in the checkout object
      metadata = mainObject?.metadata || {};
      paymentId = mainObject?.order?.id || mainObject?.id;
      subscriptionId =
        mainObject?.order?.subscription_id ??
        mainObject?.subscription?.id ??
        mainObject?.order?.subscription?.id ??
        mainObject?.order?.subscriptionId ??
        mainObject?.subscriptionId ??
        metadata?.subscriptionId;
      amountCents = mainObject?.order?.amount || 0;
      currency = mainObject?.order?.currency || "USD";
    } else if (type === "subscription.paid" || type === "subscription.active") {
      // For subscription events, metadata should be in the subscription object
      metadata = mainObject?.metadata || {};
      subscriptionId = mainObject?.id;
      const transactionOrderId = mainObject?.last_transaction?.order;
      // Use transaction order id when available so checkout.completed and subscription.paid dedupe correctly
      paymentId = transactionOrderId || eventId;
      amountCents = mainObject?.product?.price || 0;
      currency = mainObject?.product?.currency || "USD";
    }
    
    // Silent processing - no need to log metadata
    
    const userId = metadata.userId;
    const key = metadata.key;
    const kind = metadata.kind;

    if (!userId || !key || !kind) {
      // Don't log details to avoid PII exposure
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Fallback to event id if no payment/order id provided
    if (!paymentId) paymentId = eventId;
    if (!paymentId) return NextResponse.json({ error: "Missing payment ID" }, { status: 400 });

    // Only process payment-related events
    const shouldProcessPayment = type === "checkout.completed" || type === "subscription.paid";
    
    if (!shouldProcessPayment) {
      // For subscription.active, only update if it's actually a subscription event (not one-time)
      if (type === "subscription.active" && subscriptionId && kind === "subscription") {
        await db
          .update(subscriptionTable)
          .set({ status: "active" })
          .where(eq(subscriptionTable.providerSubId, subscriptionId));
      }
      return NextResponse.json({ received: true });
    }

    // Idempotency: if payment already recorded, skip
    const existing = await db
      .select()
      .from(paymentTable)
      .where(eq(paymentTable.providerPaymentId, paymentId));
    if (existing.length > 0) {
      return NextResponse.json({ received: true });
    }

    let creditsToGrant = 0;
    let planKey: PlanKey | null = null;
    const paymentType: "one_time" | "subscription" = kind;
    let scheduleResetContext: {
      subscriptionId: string;
      schedule: NonNullable<ReturnType<typeof getGrantSchedule>>;
      grantsRemaining: number;
      totalCreditsRemaining: number;
      nextGrantAt: Date | null;
    } | null = null;

    if (kind === "one_time" && isPackKey(key)) {
      creditsToGrant = oneTimePacks[key].credits;
    } else if (kind === "subscription" && isSubscriptionKey(key)) {
      planKey = key;
      const plan = subscriptionPlans[key];
      const schedule = getGrantSchedule(key);

      if (schedule && subscriptionId) {
        const initialGrant = computeInitialGrant(schedule);
        creditsToGrant = initialGrant.creditsNow;
        scheduleResetContext = {
          subscriptionId,
          schedule,
          grantsRemaining: initialGrant.grantsRemaining,
          totalCreditsRemaining: initialGrant.totalCreditsRemaining,
          nextGrantAt: initialGrant.nextGrantAt,
        };
      } else {
        creditsToGrant = plan.creditsPerCycle;
      }
    } else {
      return NextResponse.json({ error: "Invalid key" }, { status: 400 });
    }

    const parseDateValue = (value: unknown): Date | null => {
      if (!value) return null;
      if (value instanceof Date) {
        return isNaN(value.getTime()) ? null : value;
      }
      if (typeof value === "number") {
        const timestamp = value > 1e12 ? value : value * 1000;
        const parsed = new Date(timestamp);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      if (typeof value === "string") {
        const parsed = new Date(value);
        return isNaN(parsed.getTime()) ? null : parsed;
      }
      return null;
    };

    const extractCurrentPeriodEnd = (): Date | null => {
      const candidates = [
        mainObject?.current_period_end,
        mainObject?.current_period_end_at,
        mainObject?.currentPeriodEnd,
        mainObject?.currentPeriodEndAt,
        mainObject?.current_period?.end,
        mainObject?.current_period?.ends_at,
        mainObject?.current_period?.end_at,
        mainObject?.currentPeriod?.end,
        mainObject?.currentPeriod?.ends_at,
        mainObject?.billing_period?.end,
        mainObject?.billing_period?.ends_at,
        mainObject?.billing_period?.end_at,
        mainObject?.billingPeriod?.end,
        mainObject?.billingPeriod?.ends_at,
        mainObject?.billingPeriod?.end_at,
        mainObject?.next_payment_at,
        mainObject?.next_payment_date,
        mainObject?.next_billing_at,
        mainObject?.next_billing_date,
        mainObject?.order?.current_period_end,
        mainObject?.order?.current_period_end_at,
        mainObject?.order?.current_period?.end,
        mainObject?.order?.current_period?.ends_at,
        mainObject?.order?.current_period?.end_at,
        mainObject?.order?.billing_period?.end,
        mainObject?.order?.billing_period?.ends_at,
        mainObject?.order?.billing_period?.end_at,
        mainObject?.order?.next_payment_at,
        mainObject?.order?.next_payment_date,
        mainObject?.order?.next_billing_at,
        mainObject?.order?.next_billing_date,
      ];

      for (const candidate of candidates) {
        const parsed = parseDateValue(candidate);
        if (parsed) return parsed;
      }
      return null;
    };

    const derivePeriodEndFromPlan = (): Date | null => {
      if (!planKey) return null;
      const cycle = subscriptionPlans[planKey].cycle;
      const result = new Date();
      if (cycle === "month") {
        result.setMonth(result.getMonth() + 1);
      } else {
        result.setFullYear(result.getFullYear() + 1);
      }
      return result;
    };

    const currentPeriodEnd = extractCurrentPeriodEnd() ?? derivePeriodEndFromPlan();

    // Insert payment record
    await db.insert(paymentTable).values({
      id: paymentId,
      provider: "creem",
      providerPaymentId: paymentId,
      userId,
      amountCents,
      currency: currency.toLowerCase(),
      status: "succeeded",
      type: paymentType,
      planKey: planKey ?? undefined,
      creditsGranted: creditsToGrant,
      raw: JSON.stringify(event).slice(0, 65000),
    });

    // Only upsert subscription record for actual subscription payments
    // NOT for one-time purchases even if they have a subscription_id
    if (kind === "subscription" && paymentType === "subscription" && planKey && subscriptionId) {
      const subRows = await db
        .select()
        .from(subscriptionTable)
        .where(eq(subscriptionTable.providerSubId, subscriptionId));

      if (subRows.length === 0) {
        await db.insert(subscriptionTable).values({
          id: subscriptionId,
          provider: "creem",
          providerSubId: subscriptionId,
          userId,
          planKey,
          status: "active",
          currentPeriodEnd: currentPeriodEnd ?? null,
          raw: JSON.stringify(mainObject).slice(0, 65000),
        });
      } else {
        const updatePayload: Partial<typeof subscriptionTable.$inferInsert> = {
          status: "active",
          planKey,
        };

        if (currentPeriodEnd) {
          updatePayload.currentPeriodEnd = currentPeriodEnd;
        }

        await db
          .update(subscriptionTable)
          .set(updatePayload)
          .where(eq(subscriptionTable.providerSubId, subscriptionId));
      }
    }

    await db.transaction(async tx => {
      if (creditsToGrant > 0) {
        await tx
          .update(userTable)
          .set({ credits: sql`${userTable.credits} + ${creditsToGrant}` })
          .where(eq(userTable.id, userId));

        await tx.insert(creditLedger).values({
          id: paymentId,
          userId,
          delta: creditsToGrant,
          reason: paymentType === "one_time" ? "one_time_pack" : "subscription_cycle",
          paymentId,
        });
      }

      if (planKey && kind === "subscription") {
        await tx
          .update(userTable)
          .set({ planKey })
          .where(eq(userTable.id, userId));
      }

      if (kind === "subscription" && subscriptionId) {
        if (scheduleResetContext) {
          await resetSubscriptionSchedule(
            {
              subscriptionId: scheduleResetContext.subscriptionId,
              userId,
              derivedSchedule: scheduleResetContext.schedule,
              grantsRemaining: scheduleResetContext.grantsRemaining,
              totalCreditsRemaining: scheduleResetContext.totalCreditsRemaining,
              nextGrantAt: scheduleResetContext.nextGrantAt,
            },
            tx,
          );
        } else {
          await deleteSubscriptionSchedule(subscriptionId, tx);
        }
      }
    });

    // Get user email for sending notification
    const userResult = await db
      .select({ email: userTable.email })
      .from(userTable)
      .where(eq(userTable.id, userId))
      .limit(1);

    if (userResult && userResult.length > 0) {
      const userEmail = userResult[0].email;
      
      // Prepare order details
      const orderDetails = {
        orderId: paymentId,
        plan: planKey || key,
        amount: `$${(amountCents / 100).toFixed(2)} ${currency.toUpperCase()}`,
        credits: creditsToGrant,
        type: paymentType,
      };

      // Send purchase confirmation email
      try {
        await sendPurchaseEmail(userEmail, orderDetails);
      } catch (emailError) {
        // Don't fail the webhook if email fails
        console.error("[Payment Email] Failed to send purchase email:", emailError);
      }
    }

    return NextResponse.json({ received: true });
  } catch (error: unknown) {
    // Log only critical errors
    console.error("[Creem Webhook] Critical error:", getErrorMessage(error));
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}
