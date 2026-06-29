import { NextRequest, NextResponse } from "next/server";
import { isPackKey, isSubscriptionKey, oneTimePacks, subscriptionPlans } from "@/constants/billing";
import { createCheckoutSession } from "@/lib/payments/creem";
import { getActiveSessionUser } from "@/lib/auth/session";
import { getErrorMessage } from "@/lib/error-utils";

type Body = {
  kind: "subscription" | "one_time";
  key: string; // plan or pack key
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    const { kind, key } = body;

    // Get user from Better Auth session (do not trust client userId)
    const access = await getActiveSessionUser(req.headers);
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }
    const userId = access.user.id;

    let creemPriceId: string | undefined;
    // Add success=1 so client has a stable success signal on return
    const successUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/dashboard?success=1`;
    const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/pricing`;

    if (kind === "subscription") {
      if (!isSubscriptionKey(key)) {
        return NextResponse.json({ error: "Invalid subscription key" }, { status: 400 });
      }
      const plan = subscriptionPlans[key];
      creemPriceId = plan.creemPriceId;
    } else if (kind === "one_time") {
      if (!isPackKey(key)) {
        return NextResponse.json({ error: "Invalid pack key" }, { status: 400 });
      }
      const pack = oneTimePacks[key];
      creemPriceId = pack.creemPriceId;
    } else {
      return NextResponse.json({ error: "Invalid kind" }, { status: 400 });
    }

    const { url } = await createCheckoutSession({
      userId,
      key,
      kind,
      successUrl,
      cancelUrl,
      creemPriceId,
    });

    return NextResponse.json({ url });
  } catch (error: unknown) {
    console.error("Creem checkout error:", error);
    return NextResponse.json(
      { error: getErrorMessage(error, "Server error") },
      { status: 500 }
    );
  }
}
