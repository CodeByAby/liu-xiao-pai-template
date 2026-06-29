import { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  // Static routes
  const staticRoutes = [
    '',
    '/pricing',
    '/blog',
    '/contact',
    '/privacy',
    '/terms',
    '/cookies',
    '/refund',
  ]

  // Generate sitemap entries for both languages
  const locales = ['zh', 'en']
  const sitemapEntries: MetadataRoute.Sitemap = []

  locales.forEach((locale) => {
    staticRoutes.forEach((route) => {
      sitemapEntries.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: new Date(),
        changeFrequency: route === '' ? 'daily' : 'weekly',
        priority: route === '' ? 1.0 : 0.8,
        alternates: {
          languages: {
            zh: `${baseUrl}/zh${route}`,
            en: `${baseUrl}/en${route}`,
          },
        },
      })
    })
  })

  return sitemapEntries
}
