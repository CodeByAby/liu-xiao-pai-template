import { LoginForm } from "@/features/auth/components/login-form";
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
    title: t('login.title'),
    description: t('login.description'),
    openGraph: {
      images: [t('login.ogImage')],
    },
  };
}

export default function LoginPage() {
  return <LoginForm showGoogleAuth={isGoogleAuthEnabled()} />;
}
