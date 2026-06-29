"use client";

import { cn } from "@/lib/utils";
import { LocaleLink } from "@/components/locale-link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = {
  href: string;
  children: ReactNode;
  active?: boolean;
  className?: string;
  target?: "_blank";
};

export function NavBarItem({
  children,
  href,
  active,
  target,
  className,
}: Props) {
  const pathname = usePathname();

  return (
    <LocaleLink
      href={href}
      className={cn(
        "flex items-center justify-center text-sm leading-[110%] px-4 py-2 rounded-md hover:bg-hover text-muted-foreground",
        (active || pathname?.includes(href)) &&
          "bg-accent text-foreground",
        className
      )}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
    >
      {children}
    </LocaleLink>
  );
}
