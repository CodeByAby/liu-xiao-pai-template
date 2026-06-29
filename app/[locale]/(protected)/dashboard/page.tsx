"use client";

import { useSession, signOut } from "@/lib/auth-client";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from 'next-intl';
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { Background } from "@/components/background";
import { motion } from "framer-motion";
import { useCallback, useEffect, useState } from "react";
import { getDefaultOneTimePack } from "@/lib/billing-display";
import { getSubscriptionPlanTranslationKey } from "@/lib/account-settings";
import type { ClientUserProfile, UserProfileResponse } from "@/lib/client-api";

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useSession();
  const locale = useLocale();
  const t = useTranslations('dashboard');
  const tCommon = useTranslations('common');
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [userProfile, setUserProfile] = useState<ClientUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const defaultPack = getDefaultOneTimePack();

  // Fetch user profile with credits and subscription
  const fetchUserProfile = useCallback(async () => {
    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = (await response.json()) as UserProfileResponse;
        setUserProfile(data.user);
      }
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setLoading(false);
    }
  }, []);


  useEffect(() => {
    if (session.data?.user?.id) {
      fetchUserProfile();
    }
  }, [session.data?.user?.id, fetchUserProfile]);
  
  useEffect(() => {
    // Check if returning from successful payment
    const success = searchParams.get("success");
    const checkoutId = searchParams.get("checkout_id");
    const orderId = searchParams.get("order_id");
    const subscriptionId = searchParams.get("subscription_id");
    
    if (success === "1" || checkoutId || orderId || subscriptionId) {
      setPaymentSuccess(true);
      
      // Refresh user profile to get updated credits
      setTimeout(() => {
        fetchUserProfile();
      }, 1000);
      
      // Clean up URL after showing success
      setTimeout(() => {
        router.replace(`/${locale}/dashboard`);
      }, 5000);
    }
  }, [searchParams, router, fetchUserProfile, locale]);
  
  const startCheckout = useCallback(
    async () => {
      const userId = session.data?.user?.id;
      if (!userId) return;
      const res = await fetch("/api/payments/creem/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: defaultPack.key, kind: "one_time" }),
      });
      if (!res.ok) return;
      const { url } = (await res.json()) as { url: string };
      window.location.href = url;
    },
    [defaultPack.key, session.data?.user?.id]
  );

  // Authentication is already handled in the layout
  const user = session.data?.user;
  const displayUser = userProfile || user;
  const credits = userProfile?.credits ?? 0;
  const subscriptionPlanKey = getSubscriptionPlanTranslationKey(
    userProfile?.subscription?.planKey
  );

  if (loading && !user) {
    return (
      <div className="relative min-h-screen">
        <Background />
        <Container className="relative z-10 py-20">
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">{tCommon('status.loading')}</p>
          </div>
        </Container>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <Background />
      <Container className="relative z-10 py-20">
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-4">
            {t('title')}
          </h1>
          <p className="text-xl text-muted-foreground mb-12">
            {t('welcome')}, {displayUser?.name || displayUser?.email}
          </p>

          {paymentSuccess && (
            <div className="mb-8 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
              <p className="text-green-600 font-medium">
                {t('paymentSuccess')}
              </p>
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 0.5, delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {/* Personal Info Card */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border">
            <h3 className="text-xl font-semibold text-card-foreground mb-4">
              {t('cards.personalInfo.title')}
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.personalInfo.labels.name')}</span>
                <span className="text-base font-medium text-card-foreground">
                  {displayUser?.name || t('cards.personalInfo.labels.notSet')}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.personalInfo.labels.email')}</span>
                <span className="text-base font-medium text-card-foreground">
                  {displayUser?.email}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.personalInfo.labels.status')}</span>
                <span className="text-base font-medium text-green-500">
                  {tCommon('status.verified')}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border">
            <h3 className="text-xl font-semibold text-card-foreground mb-4">
              {t('cards.quickActions.title')}
            </h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start transition-colors"
                onClick={() => router.push(`/${locale}/settings#profile`)}
              >
                {t('cards.quickActions.editProfile')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start transition-colors"
                onClick={() => router.push(`/${locale}/settings#billing`)}
              >
                {t('cards.quickActions.accountSettings')}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start transition-colors"
                onClick={() => router.push(`/${locale}/settings#security`)}
              >
                {t('cards.quickActions.securitySettings')}
              </Button>
            </div>
          </div>

          {/* Statistics Card */}
          <div className="bg-card/50 backdrop-blur-md rounded-2xl p-6 border border-border">
            <h3 className="text-xl font-semibold text-card-foreground mb-4">
              {t('cards.statistics.title')}
            </h3>
            <div className="space-y-3">
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.statistics.labels.loginCount')}</span>
                <span className="text-2xl font-bold text-card-foreground">1</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.statistics.labels.memberSince')}</span>
                <span className="text-base font-medium text-card-foreground">{t('cards.statistics.labels.today')}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.statistics.labels.plan')}</span>
                <span className="text-base font-medium text-card-foreground">
                  {t(`cards.statistics.plans.${subscriptionPlanKey}`)}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-sm text-muted-foreground">{t('cards.statistics.labels.credits')}</span>
                <span className="text-2xl font-bold text-card-foreground">{credits}</span>
              </div>
              <div className="pt-2 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start transition-colors"
                  onClick={() => router.push(`/${locale}/credits`)}
                >
                  {t('cards.statistics.viewCredits')}
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start transition-colors"
                  onClick={startCheckout}
                >
                  {t('cards.statistics.buyCredits', {
                    credits: defaultPack.displayCredits,
                    price: defaultPack.displayPrice,
                  })}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ ease: "easeOut", duration: 0.5, delay: 0.3 }}
          className="mt-12 flex justify-center"
        >
          <Button
            onClick={async () => {
              await signOut();
              router.push("/");
              router.refresh();
            }}
            variant="simple"
            className="px-8"
          >
            Sign Out
          </Button>
        </motion.div>
      </Container>
    </div>
  );
}
