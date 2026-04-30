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
  { id: "catalog",     label: "Справочник",    icon: BookOpen,      href: (p) => `/dashboard/catalog?product=${p}` },
];

export default function ProductTabs({
  product,
  active,
}: {
  product: string;
  active: ProductTab;
}) {
  const productInfo = PRODUCTS.find((p) => p.slug === product);
  const ProductIcon = productInfo?.icon;
  const productLabel = productInfo?.label ?? product;

  return (
    <div className="mb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-4">
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

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-800 overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon, href }) => {
          const isActive = id === active;
          return (
            <Link
              key={id}
              href={href(product)}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
                isActive
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
              }`}
            >
              <Icon size={14} />
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
