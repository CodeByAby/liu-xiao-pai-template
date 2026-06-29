import {
  PackKey,
  PlanKey,
  oneTimePacks,
  subscriptionPlans,
} from "@/constants/billing";

export const DEFAULT_ONE_TIME_PACK_KEY: PackKey = "pack_200";
export const MARKETING_SUBSCRIPTION_PLAN_FAMILIES = [
  {
    id: "starter",
    monthlyKey: "starter_monthly",
    yearlyKey: "starter_yearly",
    featured: false,
  },
  {
    id: "pro",
    monthlyKey: "pro_monthly",
    yearlyKey: "pro_yearly",
    featured: true,
  },
] as const;

function formatUsdPrice(priceCents: number) {
  return `$${(priceCents / 100).toFixed(0)}`;
}

function formatCredits(credits: number) {
  return new Intl.NumberFormat("en-US").format(credits);
}

function getCreditsPerGrant(planKey: PlanKey) {
  const plan = subscriptionPlans[planKey];

  if (plan.grantSchedule?.mode === "installments") {
    return plan.grantSchedule.creditsPerGrant ?? Math.floor(plan.creditsPerCycle / plan.grantSchedule.grantsPerCycle);
  }

  return plan.creditsPerCycle;
}

export function getDefaultOneTimePack() {
  const pack = oneTimePacks[DEFAULT_ONE_TIME_PACK_KEY];

  return {
    key: DEFAULT_ONE_TIME_PACK_KEY,
    pack,
    displayCredits: formatCredits(pack.credits),
    displayPrice: formatUsdPrice(pack.priceCents),
  };
}

export function getSubscriptionPlanDisplays() {
  return MARKETING_SUBSCRIPTION_PLAN_FAMILIES.map((family) => {
    const monthlyPlan = subscriptionPlans[family.monthlyKey];
    const yearlyPlan = subscriptionPlans[family.yearlyKey];

    return {
      ...family,
      monthlyPlan,
      yearlyPlan,
      displayMonthlyPrice: formatUsdPrice(monthlyPlan.priceCents),
      displayYearlyPrice: formatUsdPrice(yearlyPlan.priceCents),
      displayMonthlyCredits: formatCredits(monthlyPlan.creditsPerCycle),
      displayYearlyCredits: formatCredits(yearlyPlan.creditsPerCycle),
      displayYearlyCreditsPerGrant: formatCredits(getCreditsPerGrant(family.yearlyKey)),
    };
  });
}
