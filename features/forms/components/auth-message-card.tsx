"use client";

import { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

interface AuthMessageCardProps {
  title: string;
  description?: string;
  children?: ReactNode;
  className?: string;
}

export function AuthMessageCard({
  title,
  description,
  children,
  className,
}: AuthMessageCardProps) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24",
        className
      )}
    >
      <div className="mx-auto w-full max-w-md">
        <div>
          <div className="flex">
            <Logo />
          </div>
          <h2 className="mt-8 text-2xl font-bold leading-9 tracking-tight text-foreground">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>

        {children ? <div className="mt-10 space-y-4">{children}</div> : null}
      </div>
    </div>
  );
}
