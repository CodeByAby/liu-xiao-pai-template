import type { Metadata } from "next";
import { defaultLocale, locales, type Locale } from "@/i18n.config";
import { websiteConfig } from "@/constants/website";

const ogLocaleByLocale: Record<Locale, string> = {
  en: "en_US",
  zh: "zh_CN",
};

export function getDocsPath(locale: string, slug: string[] = []) {
  const docsPrefix = locale === defaultLocale ? "/docs" : `/${locale}/docs`;

  if (slug.length === 0) {
    return docsPrefix;
  }

  return `${docsPrefix}/${slug.join("/")}`;
}

export function getDocsDescription(
  locale: string,
  title: string,
  description?: string | null,
) {
  const normalizedDescription = description?.trim();

  if (normalizedDescription) {
    return normalizedDescription;
  }

  if (locale === "zh") {
    return `${title} 的使用文档，来自 ${websiteConfig.docsName}。`;
  }

  return `${title} documentation from ${websiteConfig.docsName}.`;
}

export function getDocsMetadata(input: {
  locale: Locale;
  slug?: string[];
  title: string;
  description?: string | null;
}): Metadata {
  const { locale, slug = [], title, description } = input;
  const resolvedDescription = getDocsDescription(locale, title, description);
  const path = getDocsPath(locale, slug);
  const absoluteUrl = new URL(path, websiteConfig.appUrl).toString();
  const pageTitle = `${title} | ${websiteConfig.docsName}`;

  return {
    title: pageTitle,
    description: resolvedDescription,
    alternates: {
      canonical: absoluteUrl,
      languages: Object.fromEntries(
        locales.map((supportedLocale) => [
          supportedLocale,
          new URL(getDocsPath(supportedLocale, slug), websiteConfig.appUrl).toString(),
        ]),
      ),
    },
    openGraph: {
      title: pageTitle,
      description: resolvedDescription,
      url: absoluteUrl,
      siteName: websiteConfig.docsName,
      locale: ogLocaleByLocale[locale],
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: pageTitle,
      description: resolvedDescription,
    },
  };
}
