"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useLocale } from 'next-intl';

interface LocaleLinkProps extends Omit<ComponentProps<typeof Link>, "href"> {
  href: string;
  children: ReactNode;
}

export function LocaleLink({ href, children, ...props }: LocaleLinkProps) {
  const locale = useLocale();

  if (href.startsWith('http') || href.startsWith('//')) {
    return <Link href={href} {...props}>{children}</Link>;
  }

  const normalizedHref = href.startsWith('/') ? href : `/${href}`;

  if (
    normalizedHref === `/${locale}` ||
    normalizedHref.startsWith(`/${locale}/`)
  ) {
    return <Link href={normalizedHref} {...props}>{children}</Link>;
  }

  const localizedHref = `/${locale}${normalizedHref === '/' ? '' : normalizedHref}`;

  return <Link href={localizedHref} {...props}>{children}</Link>;
}
