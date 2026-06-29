import {
  isPackKey,
  isSubscriptionKey,
  oneTimePacks,
  subscriptionPlans,
} from "@/constants/billing";

describe("billing config", () => {
  it("exposes supported subscription keys", () => {
    expect(isSubscriptionKey("starter_monthly")).toBe(true);
    expect(isSubscriptionKey("starter_yearly")).toBe(true);
    expect(isSubscriptionKey("pack_200")).toBe(false);
  });

  it("exposes supported one-time pack keys", () => {
    expect(isPackKey("pack_200")).toBe(true);
    expect(isPackKey("pro_monthly")).toBe(false);
  });

  it("keeps yearly installment credits aligned with cycle totals", () => {
    const yearlyPlans = Object.values(subscriptionPlans).filter(
      (plan) => plan.grantSchedule?.mode === "installments"
    );

    expect(yearlyPlans.length).toBeGreaterThan(0);

    for (const plan of yearlyPlans) {
      if (plan.grantSchedule?.mode !== "installments") {
        continue;
      }

      expect(plan.grantSchedule.creditsPerGrant).toBeDefined();
      expect(plan.grantSchedule.creditsPerGrant! * plan.grantSchedule.grantsPerCycle).toBe(
        plan.creditsPerCycle
      );
    }
  });

  it("keeps one-time packs positive and purchasable", () => {
    for (const pack of Object.values(oneTimePacks)) {
      expect(pack.credits).toBeGreaterThan(0);
      expect(pack.priceCents).toBeGreaterThan(0);
      expect(pack.creemPriceId).toBeTruthy();
    }
  });
});
