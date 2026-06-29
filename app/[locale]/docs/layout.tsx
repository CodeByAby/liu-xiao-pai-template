import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';
import { source } from '@/lib/source';
import { getDocsBaseOptions, docsI18nUI } from '@/lib/docs-ui';
import { localizeDocsPageTree } from '@/lib/docs-page-tree';

export default async function Layout({
  params,
  children,
}: {
  params: Promise<{ locale: string }>;
  children: ReactNode;
}) {
  const { locale } = await params;

  return (
    <>
      {/* Loaded outside Tailwind v3/PostCSS to avoid parsing Tailwind v4-specific Fumadocs CSS. */}
      {/* eslint-disable-next-line @next/next/no-css-tags */}
      <link rel="stylesheet" href="/fumadocs-style.css" />
      <RootProvider i18n={docsI18nUI.provider(locale)}>
        <DocsLayout
          {...getDocsBaseOptions(locale)}
          tree={localizeDocsPageTree(locale, source.getPageTree(locale))}
        >
          {children}
        </DocsLayout>
      </RootProvider>
    </>
  );
}
