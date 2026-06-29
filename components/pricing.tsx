"use client";

import { IconCircleCheckFilled } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useCallback, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { useSession } from "@/lib/auth-client";
import {
  getDefaultOneTimePack,
  getSubscriptionPlanDisplays,
} from "@/lib/billing-display";

type BillingTab = "monthly" | "yearly";

export function Pricing() {
  const [active, setActive] = useState<BillingTab>("monthly");
  const session = useSession();
  const router = useRouter();
  const t = useTranslations("pricing");
  const locale = useLocale();
  const userId = session.data?.user?.id;

  const subscriptionPlans = getSubscriptionPlanDisplays();
  const defaultPack = getDefaultOneTimePack();

  const tabs = [
    { name: t("billing.monthly"), value: "monthly" },
    { name: t("billing.yearly"), value: "yearly" },
  ] satisfies Array<{ name: string; value: BillingTab }>;

  const startCheckout = useCallback(
    async (key: string, kind: "subscription" | "one_time") => {
      if (!userId) {
        router.push(`/${locale}/signup`);
        return;
      }

      const res = await fetch("/api/payments/creem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, kind }),
      });

      if (!res.ok) {
        return;
      }

      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    },
    [locale, router, userId]
  );

  return (
    <div className="relative">
      <div className="mx-auto mb-12 flex w-fit items-center justify-center overflow-hidden rounded-md bg-muted">
        {tabs.map((tab) => (
          <button
            key={tab.value}
            className={cn(
              "relative rounded-md p-4 text-sm font-medium text-muted-foreground",
              active === tab.value ? "text-primary-foreground" : ""
            )}
            onClick={() => setActive(tab.value)}
          >
            {active === tab.value && (
              <motion.span
                layoutId="pricing-billing-tab"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                className="absolute inset-0 bg-primary"
              />
            )}
            <span className="relative z-10">{tab.name}</span>
          </button>
        ))}
      </div>

      <div className="relative z-20 mx-auto mt-4 grid grid-cols-1 items-stretch gap-4 md:mt-20 md:grid-cols-2 xl:grid-cols-3">
        {subscriptionPlans.map((plan) => {
          const currentPlan = active === "monthly" ? plan.monthlyPlan : plan.yearlyPlan;
          const currentPrice =
            active === "monthly" ? plan.displayMonthlyPrice : plan.displayYearlyPrice;
          const currentCredits =
            active === "monthly" ? plan.displayMonthlyCredits : plan.displayYearlyCredits;
          const creditSummary =
            active === "monthly"
              ? t("details.monthlyCredits", { credits: currentCredits })
              : t("details.yearlyCredits", { credits: currentCredits });
          const deliverySummary =
            active === "monthly"
              ? t("details.subscriptionDelivery")
              : t("details.yearlyInstallments", {
                  credits: plan.displayYearlyCreditsPerGrant,
                });

          return (
            <div
              key={plan.id}
              className={cn(
                plan.featured ? "relative bg-primary shadow-2xl" : "bg-card",
                "flex h-full flex-col justify-between rounded-lg px-6 py-8 sm:mx-8 lg:mx-0"
              )}
            >
              <div>
                <h3
                  className={cn(
                    plan.featured ? "text-primary-foreground" : "text-muted-foreground",
                    "text-base font-semibold leading-7"
                  )}
                >
                  {t(`tiers.${plan.id}.name`)}
                </h3>
                <p className="mt-4">
                  <motion.span
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    key={`${plan.id}-${active}`}
                    className={cn(
                      "inline-block text-4xl font-bold tracking-tight",
                      plan.featured ? "text-primary-foreground" : "text-foreground"
                    )}
                  >
                    {currentPrice}
                  </motion.span>
                </p>
                <p
                  className={cn(
                    plan.featured ? "text-primary-foreground/80" : "text-muted-foreground",
                    "mt-3 text-sm font-medium"
                  )}
                >
                  {creditSummary}
                </p>
                <p
                  className={cn(
                    plan.featured ? "text-primary-foreground/80" : "text-muted-foreground",
                    "mt-2 text-sm"
                  )}
                >
                  {deliverySummary}
                </p>
                <p
                  className={cn(
                    plan.featured ? "text-primary-foreground/80" : "text-muted-foreground",
                    "mt-6 min-h-12 text-sm leading-7"
                  )}
                >
                  {t(`tiers.${plan.id}.description`)}
                </p>
                <ul
                  role="list"
                  className={cn(
                    plan.featured ? "text-primary-foreground/80" : "text-muted-foreground",
                    "mt-8 space-y-3 text-sm leading-6 sm:mt-10"
                  )}
                >
                  {(t.raw(`tiers.${plan.id}.features`) as string[]).map((feature) => (
                    <li key={feature} className="flex gap-x-3">
                      <IconCircleCheckFilled
                        className={cn(
                          plan.featured ? "text-primary-foreground" : "text-muted-foreground",
                          "h-6 w-5 flex-none"
                        )}
                        aria-hidden="true"
                      />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <Button
                onClick={() => startCheckout(currentPlan.key, "subscription")}
                className={cn(
                  plan.featured
                    ? "bg-background text-foreground shadow-sm hover:bg-background/90 focus-visible:outline-background"
                    : "",
                  "mt-8 block w-full rounded-full px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10"
                )}
              >
                {t(`tiers.${plan.id}.cta`)}
              </Button>
            </div>
          );
        })}

        <div className="flex h-full flex-col justify-between rounded-lg bg-card px-6 py-8 sm:mx-8 lg:mx-0">
          <div>
            <h3 className="text-base font-semibold leading-7 text-muted-foreground">
              {t("tiers.credits.name")}
            </h3>
            <p className="mt-4">
              <motion.span
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                key={`credits-pack-${defaultPack.key}`}
                className="inline-block text-4xl font-bold tracking-tight text-foreground"
              >
                {defaultPack.displayPrice}
              </motion.span>
            </p>
            <p className="mt-3 text-sm font-medium text-muted-foreground">
              {t("details.oneTimeCredits", { credits: defaultPack.displayCredits })}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("details.oneTimeDelivery")}
            </p>
            <p className="mt-6 min-h-12 text-sm leading-7 text-muted-foreground">
              {t("tiers.credits.description")}
            </p>
            <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-muted-foreground sm:mt-10">
              {(t.raw("tiers.credits.features") as string[]).map((feature) => (
                <li key={feature} className="flex gap-x-3">
                  <IconCircleCheckFilled
                    className="h-6 w-5 flex-none text-muted-foreground"
                    aria-hidden="true"
                  />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          <Button
            onClick={() => startCheckout(defaultPack.key, "one_time")}
            className="mt-8 block w-full rounded-full px-3.5 py-2.5 text-center text-sm font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 sm:mt-10"
          >
            {t("tiers.credits.cta", { credits: defaultPack.displayCredits })}
          </Button>
        </div>
      </div>
    </div>
  );
}
