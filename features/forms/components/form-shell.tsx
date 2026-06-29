"use client";

import * as React from "react";
import { UseFormReturn, FieldValues } from "react-hook-form";
import { useTranslations } from 'next-intl';

import { Form } from "@/components/ui/form";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/button";
import { cn } from "@/lib/utils";

interface FormShellProps<TFieldValues extends FieldValues> {
  form: UseFormReturn<TFieldValues>;
  title: string;
  description?: string;
  onSubmit: (values: TFieldValues) => Promise<void> | void;
  children: React.ReactNode;
  submitText: string;
  submitLoadingText?: string;
  isLoading?: boolean;
  error?: string | null;
  footer?: React.ReactNode;
  className?: string;
  headerSlot?: React.ReactNode;
  socialSlot?: React.ReactNode;
}

export function FormShell<TFieldValues extends FieldValues>({
  form,
  title,
  description,
  onSubmit,
  children,
  submitText,
  submitLoadingText,
  isLoading,
  error,
  footer,
  className,
  headerSlot,
  socialSlot,
}: FormShellProps<TFieldValues>) {
  const t = useTranslations('auth.social');
  const headerContent = headerSlot !== undefined ? headerSlot : <Logo />;

  return (
    <Form {...form}>
      <div
        className={cn(
          "flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24",
          className
        )}
      >
        <div className="mx-auto w-full max-w-md">
          <div>
            <div className="flex">{headerContent}</div>
            <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-foreground">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>

          <div className="mt-10">
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {children}

              {error ? (
                <div className="rounded-md bg-destructive/10 p-3 text-sm text-red-600">
                  {error}
                </div>
              ) : null}

              <Button className="w-full" disabled={isLoading} type="submit">
                {isLoading ? submitLoadingText ?? submitText : submitText}
              </Button>

              {footer}
            </form>
          </div>

          {socialSlot ? (
            <div className="mt-10">
              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm font-medium leading-6">
                  <span className="bg-background px-6 text-muted-foreground">
                    {t('or')}
                  </span>
                </div>
              </div>
              <div className="mt-6 space-y-3">{socialSlot}</div>
            </div>
          ) : null}
        </div>
      </div>
    </Form>
  );
}
