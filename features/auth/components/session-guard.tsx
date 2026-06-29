"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useLocale } from 'next-intl';

import { useSession } from "@/lib/auth-client";

export function SessionGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const session = useSession();
  const locale = useLocale();

  React.useEffect(() => {
    if (!session.isPending && !session.data) {
      router.replace(`/${locale}/login`);
    }
  }, [locale, router, session.data, session.isPending]);

  if (session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  if (!session.data?.user) {
    return null;
  }

  return <>{children}</>;
}
