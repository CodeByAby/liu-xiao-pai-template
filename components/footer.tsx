"use client";
import React from "react";
import { Logo } from "./Logo";
import { useTranslations } from 'next-intl';
import { LocaleLink } from './locale-link';
import { NewsletterInline } from './newsletter-inline';

export const Footer = () => {
  const t = useTranslations();
  
  const links = [
    {
      name: t('navigation.main.pricing'),
      href: "/pricing",
    },
    {
      name: t('navigation.main.blog'),
      href: "/blog",
    },
    {
      name: t('navigation.main.contact'),
      href: "/contact",
    },
  ];
  const legal = [
    {
      name: t('navigation.footer.legal.terms'),
      href: "/terms",
    },
    {
      name: t('navigation.footer.legal.privacy'),
      href: "/privacy",
    },
    {
      name: t('navigation.footer.legal.cookies'),
      href: "/cookies",
    },
    {
      name: t('navigation.footer.legal.refund'),
      href: "/refund",
    },
  ];
  const socials = [
    {
      name: t('footer.social.twitter'),
      href: "https://x.com/bourneliu66",
      external: true,
    },
    {
      name: t('footer.social.github'),
      href: "https://github.com/Idea-To-Business/sistine-starter-vibe-to-production",
      external: true,
    },
  ];
  return (
    <div className="relative">
      <div className="border-t border-border px-8 pt-20 pb-32 relative bg-background">
        <div className="max-w-7xl mx-auto">
          {/* Footer Links Section */}
          <div className="text-sm text-muted-foreground flex sm:flex-row flex-col justify-between items-start">
            <div>
              <div className="mr-4 md:flex mb-4">
                <Logo />
              </div>
              <div>{t('common.brand.copyright')}</div>
              <div className="mt-2">{t('common.brand.allRightsReserved')}</div>
              {/* Newsletter Inline */}
              <div className="mt-6">
                <NewsletterInline />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-10 items-start mt-10 md:mt-0">
              <div className="flex justify-center space-y-4 flex-col mt-4">
                {links.map((link) => (
                  <LocaleLink
                    key={link.name}
                    className="transition-colors hover:text-foreground text-muted-foreground text-xs sm:text-sm"
                    href={link.href}
                  >
                    {link.name}
                  </LocaleLink>
                ))}
              </div>
              <div className="flex justify-center space-y-4 flex-col mt-4">
                {legal.map((link) => (
                  <LocaleLink
                    key={link.name}
                    className="transition-colors hover:text-foreground text-muted-foreground text-xs sm:text-sm"
                    href={link.href}
                  >
                    {link.name}
                  </LocaleLink>
                ))}
              </div>
              <div className="flex justify-center space-y-4 flex-col mt-4">
                {socials.map((link) => (
                  <a
                    key={link.name}
                    className="transition-colors hover:text-foreground text-muted-foreground text-xs sm:text-sm"
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {link.name}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="text-center text-5xl md:text-9xl lg:text-[18rem] font-bold bg-clip-text text-transparent bg-gradient-to-b from-muted to-border inset-x-0">
        SISTINE
      </p>
    </div>
  );
};
