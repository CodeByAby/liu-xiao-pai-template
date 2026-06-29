export type BillingKind = "subscription" | "one_time";

export type PlanKey =
  | "starter_monthly"
  | "starter_yearly"
  | "pro_monthly"
  | "pro_yearly";

export type PackKey = "pack_200";

export type GrantScheduleConfig =
  | {
      mode: "per_cycle";
    }
  | {
      mode: "installments";
      grantsPerCycle: number;
      intervalMonths: number;
      creditsPerGrant?: number;
      initialGrants?: number;
    };

type SubscriptionPlan = {
  key: PlanKey;
  kind: "subscription";
  priceCents: number;
  currency: "usd";
  creditsPerCycle: number;
  cycle: "month" | "year";
  // To be filled when Creem IDs are available
  creemPriceId?: string;
  grantSchedule?: GrantScheduleConfig;
};

type OneTimePack = {
  key: PackKey;
  kind: "one_time";
  priceCents: number;
  currency: "usd";
  credits: number;
  creemPriceId?: string;
};

export const subscriptionPlans: Record<PlanKey, SubscriptionPlan> = {
  starter_monthly: {
    key: "starter_monthly",
    kind: "subscription",
    priceCents: 2900,
    currency: "usd",
    creditsPerCycle: 1000,
    cycle: "month",
    creemPriceId: "prod_6oSIwPL8m6scklr3fwdkC9",
    grantSchedule: { mode: "per_cycle" },
  },
  starter_yearly: {
    key: "starter_yearly",
    kind: "subscription",
    priceCents: 29000,
    currency: "usd",
    creditsPerCycle: 12000,
    cycle: "year",
    creemPriceId: "prod_2V1LbGt2bLmZpKgmASTiCN",
    grantSchedule: {
      mode: "installments",
      grantsPerCycle: 12,
      intervalMonths: 1,
      creditsPerGrant: 1000,
      initialGrants: 1,
    },
  },
  pro_monthly: {
    key: "pro_monthly",
    kind: "subscription",
    priceCents: 9900,
    currency: "usd",
    creditsPerCycle: 10000,
    cycle: "month",
    creemPriceId: "prod_5Xzh9qV5TWeTQtRxjZPEHM",
    grantSchedule: { mode: "per_cycle" },
  },
  pro_yearly: {
    key: "pro_yearly",
    kind: "subscription",
    priceCents: 99000,
    currency: "usd",
    creditsPerCycle: 120000,
    cycle: "year",
    creemPriceId: "prod_2xyljTJW1IlT8FUDrucU3X",
    grantSchedule: {
      mode: "installments",
      grantsPerCycle: 12,
      intervalMonths: 1,
      creditsPerGrant: 10000,
      initialGrants: 1,
    },
  },
};

export const oneTimePacks: Record<PackKey, OneTimePack> = {
  pack_200: {
    key: "pack_200",
    kind: "one_time",
    priceCents: 500,
    currency: "usd",
    credits: 200,
    creemPriceId: "prod_3SiroZeMbMQidMVFDMUzKy",
  },
};

export function isSubscriptionKey(key: string): key is PlanKey {
  return (key as PlanKey) in subscriptionPlans;
}

export function isPackKey(key: string): key is PackKey {
  return (key as PackKey) in oneTimePacks;
}
