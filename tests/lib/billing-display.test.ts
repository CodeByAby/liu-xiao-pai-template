import {
  DEFAULT_ONE_TIME_PACK_KEY,
  getDefaultOneTimePack,
  getSubscriptionPlanDisplays,
  MARKETING_SUBSCRIPTION_PLAN_FAMILIES,
} from "@/lib/billing-display";

describe("getDefaultOneTimePack", () => {
  it("returns the configured default pack key", () => {
    expect(DEFAULT_ONE_TIME_PACK_KEY).toBe("pack_200");
  });

  it("returns the pack values from billing config", () => {
    expect(getDefaultOneTimePack()).toEqual({
      key: "pack_200",
      pack: {
        key: "pack_200",
        kind: "one_time",
        priceCents: 500,
        currency: "usd",
        credits: 200,
        creemPriceId: "prod_3SiroZeMbMQidMVFDMUzKy",
      },
      displayCredits: "200",
      displayPrice: "$5",
    });
  });
});

describe("getSubscriptionPlanDisplays", () => {
  it("only exposes subscription families that exist in billing config", () => {
    expect(MARKETING_SUBSCRIPTION_PLAN_FAMILIES).toEqual([
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
    ]);
  });

  it("derives marketing prices and credits from the real billing plans", () => {
    expect(getSubscriptionPlanDisplays()).toEqual([
      {
        id: "starter",
        monthlyKey: "starter_monthly",
        yearlyKey: "starter_yearly",
        featured: false,
        monthlyPlan: {
          key: "starter_monthly",
          kind: "subscription",
          priceCents: 2900,
          currency: "usd",
          creditsPerCycle: 1000,
          cycle: "month",
          creemPriceId: "prod_6oSIwPL8m6scklr3fwdkC9",
          grantSchedule: { mode: "per_cycle" },
        },
        yearlyPlan: {
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
        displayMonthlyPrice: "$29",
        displayYearlyPrice: "$290",
        displayMonthlyCredits: "1,000",
        displayYearlyCredits: "12,000",
        displayYearlyCreditsPerGrant: "1,000",
      },
      {
        id: "pro",
        monthlyKey: "pro_monthly",
        yearlyKey: "pro_yearly",
        featured: true,
        monthlyPlan: {
          key: "pro_monthly",
          kind: "subscription",
          priceCents: 9900,
          currency: "usd",
          creditsPerCycle: 10000,
          cycle: "month",
          creemPriceId: "prod_5Xzh9qV5TWeTQtRxjZPEHM",
          grantSchedule: { mode: "per_cycle" },
        },
        yearlyPlan: {
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
        displayMonthlyPrice: "$99",
        displayYearlyPrice: "$990",
        displayMonthlyCredits: "10,000",
        displayYearlyCredits: "120,000",
        displayYearlyCreditsPerGrant: "10,000",
      },
    ]);
  });
});
