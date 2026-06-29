import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n.config';

export default getRequestConfig(async ({ locale }) => {
  // If locale is undefined, use default locale
  if (!locale) {
    const messages = (await import(`../messages/en.json`)).default;
    const seoMessages = (await import(`../messages/seo.en.json`)).default;
    return {
      locale: 'en',
      messages: {
        ...messages,
        seo: seoMessages
      }
    };
  }
  
  // Validate that the incoming `locale` parameter is valid
  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  try {
    const messages = (await import(`../messages/${locale}.json`)).default;
    const seoMessages = (await import(`../messages/seo.${locale}.json`)).default;
    return {
      locale,
      messages: {
        ...messages,
        seo: seoMessages
      }
    };
  } catch (error) {
    console.error('Error loading messages for locale:', locale, error);
    notFound();
  }
});
