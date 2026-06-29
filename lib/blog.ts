import type { ComponentType } from "react";

import { defaultLocale } from "@/i18n.config";

import { blogModuleLoaders } from "./blog-manifest.generated";

interface Blog {
  title: string;
  description: string;
  author: {
    name: string;
    src: string;
  };
  date: string;
  image?: string;
}

export interface BlogWithSlug extends Blog {
  slug: string;
}

type BlogModule = {
  default: ComponentType;
  blog: Blog;
};

type BlogModuleLoader = () => Promise<BlogModule>;

type BlogModuleMap = Record<string, Record<string, BlogModuleLoader>>;

const blogModuleMap: BlogModuleMap = Object.fromEntries(
  Object.entries(blogModuleLoaders).map(([slug, locales]) => [
    slug,
    Object.fromEntries(
      Object.entries(locales).map(([locale, loader]) => [
        locale,
        async () => (await loader()) as BlogModule,
      ])
    ),
  ])
);

async function loadBlog(slug: string, locale: string) {
  const locales = blogModuleMap[slug];

  if (!locales) {
    return null;
  }

  const loader =
    locales[locale] ??
    locales[defaultLocale] ??
    Object.values(locales)[0];

  if (!loader) {
    return null;
  }

  const mod = await loader();

  return mod;
}

export async function getBlogModule(slug: string, locale: string) {
  return loadBlog(slug, locale);
}

export async function getAllBlogs(locale: string = defaultLocale) {
  const slugs = Object.keys(blogModuleMap);

  const blogs = await Promise.all(
    slugs.map(async (slug) => {
      const mod = await loadBlog(slug, locale);

      if (!mod) {
        return null;
      }

      return {
        slug,
        ...mod.blog,
      } satisfies BlogWithSlug;
    })
  );

  return blogs
    .filter((blog): blog is BlogWithSlug => blog !== null)
    .sort((a, z) => +new Date(z.date) - +new Date(a.date));
}
