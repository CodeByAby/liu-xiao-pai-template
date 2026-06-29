"use client";

import { ModeToggle } from "@/components/mode-toggle";
import { LanguageSwitcher } from "@/components/language-switcher";
import { useTranslations } from "next-intl";
import { UserMenu } from "@/features/navigation/components/user-menu";
import { Shield } from "lucide-react";

export function AdminHeader() {
  const tSidebar = useTranslations("Admin.sidebar");

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background">
      <div className="flex items-center justify-between px-8 py-4 gap-6">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-foreground">
            {tSidebar("title")}
          </h1>
        </div>

        <div className="flex items-center gap-4">
          <Shield className="h-5 w-5 text-muted-foreground" />
          <LanguageSwitcher />
          <ModeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
