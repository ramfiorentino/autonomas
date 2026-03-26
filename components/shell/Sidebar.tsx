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

export function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  return (
    <aside className="hidden md:flex w-56 flex-col border-r border-border bg-surface">
      <div className="flex h-14 items-center border-b border-border px-6">
        <span className="text-lg font-semibold text-primary">Autonomas</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ href, icon: Icon, key }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-button px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary-light text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
