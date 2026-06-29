import { defineI18n } from 'fumadocs-core/i18n';
import { defaultLocale, localePrefix, locales } from '@/i18n.config';

export const docsI18n = defineI18n({
  defaultLanguage: defaultLocale,
  languages: [...locales],
  hideLocale: localePrefix === 'as-needed' ? 'default-locale' : 'never',
});
