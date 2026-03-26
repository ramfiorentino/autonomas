"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, CalendarDays, FileText, Receipt } from "lucide-react";
import { useTranslations } from "next-intl";

const navItems = [
  { href: "/dashboard", icon: Home, key: "inicio" },
  { href: "/appointments", icon: CalendarDays, key: "citas" },
  { href: "/invoices", icon: FileText, key: "facturas" },
  { href: "/expenses", icon: Receipt, key: "gastos" },
] as const;

export function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-surface md:hidden">
      <div className="flex h-16 items-center justify-around">
        {navItems.map(({ href, icon: Icon, key }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon
                className={`h-5 w-5 ${isActive ? "stroke-[2.5]" : "stroke-2"}`}
              />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
