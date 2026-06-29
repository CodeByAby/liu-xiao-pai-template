import { defineI18nUI } from 'fumadocs-ui/i18n';
import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { defaultLocale, localeNames } from '@/i18n.config';
import { docsI18n } from '@/lib/docs-i18n';
import { websiteConfig } from '@/constants/website';

export const docsI18nUI = defineI18nUI(docsI18n, {
  translations: {
    en: {
      displayName: localeNames.en,
      search: 'Search docs',
    },
    zh: {
      displayName: localeNames.zh,
      search: '搜索文档',
      searchNoResult: '没有找到结果',
      previousPage: '上一页',
      nextPage: '下一页',
      chooseLanguage: '切换语言',
    },
  },
});

export function getDocsBaseOptions(locale: string): BaseLayoutProps {
  return {
    i18n: docsI18n,
    nav: {
      title: locale === 'zh' ? 'Sistine 文档' : websiteConfig.docsName,
      url: locale === defaultLocale ? '/docs' : `/${locale}/docs`,
    },
  };
}
