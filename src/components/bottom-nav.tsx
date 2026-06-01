"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNav() {
  const pathname = usePathname();

  const tabs = [
    { href: "/", label: "اليوم", icon: CalendarDays, active: pathname === "/" },
    {
      href: "/patients",
      label: "المرضى",
      icon: Users,
      active: pathname.startsWith("/patients"),
    },
    { href: "/calc", label: "الحساب", icon: Wallet, active: pathname.startsWith("/calc") },
  ];

  return (
    <nav className="fixed bottom-0 right-1/2 z-40 w-full max-w-md translate-x-1/2 border-t bg-card/95 backdrop-blur">
      <div className="grid grid-cols-3">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors",
              t.active ? "text-primary" : "text-muted-foreground"
            )}
          >
            <t.icon className="h-5 w-5" />
            {t.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
