import { SignupForm } from "@/features/auth/components/signup-form";
import { Metadata } from "next";
import { getTranslations } from 'next-intl/server';
import type { Locale } from "@/i18n.config";
import { isGoogleAuthEnabled } from "@/lib/auth/google-auth";

export async function generateMetadata(
  props: {
    params: Promise<{ locale: Locale }>
  }
): Promise<Metadata> {
  const params = await props.params;
  const t = await getTranslations({ locale: params.locale, namespace: 'seo' });

  return {
    title: t('signup.title'),
    description: t('signup.description'),
    openGraph: {
      images: [t('signup.ogImage')],
    },
  };
}

export default function SignupPage() {
  return <SignupForm showGoogleAuth={isGoogleAuthEnabled()} />;
}
