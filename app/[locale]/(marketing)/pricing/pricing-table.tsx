"use client";

import React from "react";
import { useTranslations } from "next-intl";
import {
  getDefaultOneTimePack,
  getSubscriptionPlanDisplays,
} from "@/lib/billing-display";

type ComparisonCell = string;

export function PricingTable() {
  const t = useTranslations("pricing");
  const subscriptionPlans = getSubscriptionPlanDisplays();
  const defaultPack = getDefaultOneTimePack();
  const [starterPlan, proPlan] = subscriptionPlans;

  if (!starterPlan || !proPlan) {
    return null;
  }

  const tiers = [
    ...[starterPlan, proPlan].map((plan) => ({
      id: plan.id,
      name: t(`tiers.${plan.id}.name`),
    })),
    {
      id: defaultPack.key,
      name: t("tiers.credits.name"),
    },
  ];

  const tableRows: Array<{
    title: string;
    values: Record<string, ComparisonCell>;
  }> = [
    {
      title: t("comparison.rows.purchaseType"),
      values: {
        starter: t("comparison.values.subscription"),
        pro: t("comparison.values.subscription"),
        [defaultPack.key]: t("comparison.values.oneTime"),
      },
    },
    {
      title: t("comparison.rows.monthlyPrice"),
      values: {
        starter: starterPlan.displayMonthlyPrice,
        pro: proPlan.displayMonthlyPrice,
        [defaultPack.key]: defaultPack.displayPrice,
      },
    },
    {
      title: t("comparison.rows.yearlyPrice"),
      values: {
        starter: starterPlan.displayYearlyPrice,
        pro: proPlan.displayYearlyPrice,
        [defaultPack.key]: t("comparison.values.notApplicable"),
      },
    },
    {
      title: t("comparison.rows.monthlyCredits"),
      values: {
        starter: t("comparison.values.creditsPerMonth", {
          credits: starterPlan.displayMonthlyCredits,
        }),
        pro: t("comparison.values.creditsPerMonth", {
          credits: proPlan.displayMonthlyCredits,
        }),
        [defaultPack.key]: t("comparison.values.oneTimeCredits", {
          credits: defaultPack.displayCredits,
        }),
      },
    },
    {
      title: t("comparison.rows.yearlyCredits"),
      values: {
        starter: t("comparison.values.creditsPerYear", {
          credits: starterPlan.displayYearlyCredits,
        }),
        pro: t("comparison.values.creditsPerYear", {
          credits: proPlan.displayYearlyCredits,
        }),
        [defaultPack.key]: t("comparison.values.notApplicable"),
      },
    },
    {
      title: t("comparison.rows.delivery"),
      values: {
        starter: t("comparison.values.yearlyInstallments", {
          credits: starterPlan.displayYearlyCreditsPerGrant,
        }),
        pro: t("comparison.values.yearlyInstallments", {
          credits: proPlan.displayYearlyCreditsPerGrant,
        }),
        [defaultPack.key]: t("comparison.values.instantAfterPayment"),
      },
    },
    {
      title: t("comparison.rows.bestFor"),
      values: {
        starter: t("comparison.values.bestForStarter"),
        pro: t("comparison.values.bestForPro"),
        [defaultPack.key]: t("comparison.values.bestForCredits"),
      },
    },
  ];

  return (
    <div className="relative z-20 mx-auto w-full px-4 py-40">
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="max-w-xs py-3.5 pl-4 pr-3 text-left text-3xl font-extrabold text-foreground sm:pl-0" />
                  {tiers.map((tier) => (
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-center text-lg font-semibold text-foreground"
                      key={tier.id}
                    >
                      {tier.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tableRows.map((row) => (
                  <tr key={row.title}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-foreground sm:pl-0">
                      {row.title}
                    </td>
                    {tiers.map((tier) => (
                      <td
                        key={`${row.title}-${tier.id}`}
                        className="whitespace-nowrap px-3 py-4 text-center text-sm text-muted-foreground"
                      >
                        {row.values[tier.id]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
