"use client";

import { cn } from "@/lib/utils";
import { HorizontalGradient } from "@/components/horizontal-gradient";
import { FeaturedTestimonials } from "@/components/featured-testimonials";
import { useTranslations } from 'next-intl';

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const t = useTranslations('contact.testimonial');
  return (
    <>
      <div className="w-full min-h-screen grid grid-cols-1 md:grid-cols-2">
        {children}
        <div className="relative w-full z-20 hidden md:flex border-l border-border overflow-hidden bg-muted items-center justify-center">
          <div className="max-w-sm mx-auto">
            <FeaturedTestimonials />
            <p
              className={cn(
                "font-semibold text-xl text-center text-muted-foreground"
              )}
            >
              {t('title')}
            </p>
            <p
              className={cn(
                "font-normal text-base text-center text-muted-foreground mt-8"
              )}
            >
              {t('description')}
            </p>
          </div>
          <HorizontalGradient className="top-20" />
          <HorizontalGradient className="bottom-20" />
          <HorizontalGradient className="-right-80 transform rotate-90 inset-y-0 h-full scale-x-150" />
          <HorizontalGradient className="-left-80 transform rotate-90 inset-y-0 h-full scale-x-150" />
        </div>
      </div>
    </>
  );
}
