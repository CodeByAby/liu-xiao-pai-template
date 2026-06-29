"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocale, useTranslations } from 'next-intl';
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import { signIn } from "@/lib/auth-client";
import Password from "@/components/password";
import { FormShell } from "@/features/forms/components/form-shell";
import { FormTextField } from "@/features/forms/components/form-text-field";
import { SocialAuthButtons } from "@/features/auth/components/social-auth-buttons";
import { LoginInput, loginSchema } from "@/features/auth/schemas";

interface LoginFormProps {
  showGoogleAuth?: boolean;
}

export function LoginForm({ showGoogleAuth = true }: LoginFormProps) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations('auth.login');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: LoginInput) {
    try {
      setIsLoading(true);
      setError(null);

      const { error } = await signIn.email({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setError(error.message || t('errors.loginFailed'));
        return;
      }

      router.push(`/${locale}/`);
    } catch {
      setError(t('errors.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    try {
      setIsLoading(true);
      await signIn.social({
        provider: "google",
        callbackURL: "/",
      });
    } catch {
      setError(t('errors.googleLoginFailed'));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <FormShell<LoginInput>
      form={form}
      title={t('title')}
      onSubmit={onSubmit}
      submitText={t('signInButton')}
      submitLoadingText={t('signingIn')}
      isLoading={isLoading}
      error={error}
      footer={
        <p className="mt-4 text-center text-sm text-muted-foreground">
          {t('noAccount')}{" "}
          <Link href={`/${locale}/signup`} className="text-foreground hover:underline">
            {t('signUpLink')}
          </Link>
        </p>
      }
      socialSlot={
        showGoogleAuth ? (
          <SocialAuthButtons onGoogleSignIn={handleGoogleSignIn} isLoading={isLoading} />
        ) : undefined
      }
    >
      <FormTextField
        control={form.control}
        name="email"
        type="email"
        label={t('emailLabel')}
        placeholder={t('emailPlaceholder')}
        autoComplete="email"
      />
      <FormTextField
        control={form.control}
        name="password"
        label={t('passwordLabel')}
        placeholder={t('passwordPlaceholder')}
        component={Password}
        autoComplete="current-password"
      />
      <div className="flex items-center justify-between">
        <Link href={`/${locale}/forgot-password`} className="text-sm font-normal text-muted-foreground hover:text-foreground">
          {t('forgotPassword')}
        </Link>
      </div>
    </FormShell>
  );
}
