"use client";
import Link from "next/link";
import {
  LayoutGrid, Zap, Palette, Boxes, CreditCard, Users, ContactRound, UsersRound, BookOpen,
} from "lucide-react";
import { PRODUCTS } from "../lib/constants";

export type ProductTab =
  | "landing" | "features" | "appearance" | "home_screen" | "tariffs"
  | "masters" | "clients"  | "teams" | "catalog";

const TABS: { id: ProductTab; label: string; icon: any; href: (p: string) => string }[] = [
  { id: "landing",     label: "Лендинг",       icon: LayoutGrid,    href: (p) => `/dashboard/${p}` },
  { id: "features",    label: "Функции",       icon: Zap,           href: (p) => `/dashboard/${p}?tab=features` },
  { id: "appearance",  label: "Оформление",    icon: Palette,       href: (p) => `/dashboard/${p}?tab=appearance` },
  { id: "home_screen", label: "Главный экран", icon: Boxes,         href: (p) => `/dashboard/${p}?tab=home_screen` },
  { id: "tariffs",     label: "Тарифы",        icon: CreditCard,    href: (p) => `/dashboard/tariffs?product=${p}` },
  { id: "masters",     label: "Мастера",       icon: Users,         href: (p) => `/dashboard/masters?product=${p}` },
  { id: "clients",     label: "Клиенты",       icon: ContactRound,  href: (p) => `/dashboard/clients?product=${p}` },
  { id: "teams",       label: "Команды",       icon: UsersRound,    href: (p) => `/dashboard/teams?product=${p}` },
  { id: "catalog",     label: "Справочник",    icon: BookOpen,      href: (p) => p === "rental" ? `/dashboard/rental-catalog` : `/dashboard/catalog?product=${p}` },
];

export default function ProductTabs({
  product,
  active,
  children,
}: {
  product: string | null | undefined;
  active: ProductTab;
  children?: React.ReactNode;
}) {
  const productInfo = product ? PRODUCTS.find((p) => p.slug === product) : null;

  // Без валидного продукта — рендерим контент без сайдбара
  if (!productInfo || !product) {
    return <>{children}</>;
  }

  const ProductIcon = productInfo.icon;
  const productLabel = productInfo.label;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-6">
        <Link
          href="/dashboard"
          className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          ← Все продукты
        </Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        {ProductIcon && (
          <ProductIcon size={20} className="text-indigo-600 dark:text-indigo-400" />
        )}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{productLabel}</h1>
      </div>

      {/* Layout: vertical sidebar + content */}
      <div className="flex gap-6">
        <nav className="w-52 shrink-0 space-y-0.5 self-start">
          {TABS.map(({ id, label, icon: Icon, href }) => {
            const isActive = id === active;
            return (
              <Link
                key={id}
                href={href(product)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-900/20 dark:text-indigo-300"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800"
                }`}
              >
                <Icon size={15} className="shrink-0" />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
}
