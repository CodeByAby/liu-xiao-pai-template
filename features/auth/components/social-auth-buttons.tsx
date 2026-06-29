"use client";

import { Button } from "@/components/button";
import { IconBrandGoogle } from "@tabler/icons-react";
import { useTranslations } from 'next-intl';

interface SocialAuthButtonsProps {
  onGoogleSignIn: () => Promise<void> | void;
  isLoading?: boolean;
}

export function SocialAuthButtons({
  onGoogleSignIn,
  isLoading,
}: SocialAuthButtonsProps) {
  const t = useTranslations('auth.social');
  return (
    <Button
      onClick={onGoogleSignIn}
      className="w-full py-1.5"
      variant="outline"
      disabled={isLoading}
      type="button"
    >
      <IconBrandGoogle className="h-5 w-5" />
      <span className="text-sm font-semibold leading-6">{t('googleSignIn')}</span>
    </Button>
  );
}
