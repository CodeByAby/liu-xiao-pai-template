import type { ReactNode } from "react";

import { NavBar } from "@/features/navigation/components/navbar";

export default function DemoLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen">
      <NavBar />
      {children}
    </main>
  );
}
