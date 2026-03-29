import {
  Globe, Scissors, Shirt, Stethoscope, Leaf, GraduationCap,
  CalendarDays, UtensilsCrossed, Building2, Car, Hammer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ProductItem {
  slug: string;
  label: string;
  icon: LucideIcon;
}

export const PRODUCTS: ProductItem[] = [
  { slug: "main",      label: "Главная (ezze.site)",   icon: Globe },
  { slug: "beauty",    label: "Ezze Beauty",            icon: Scissors },
  { slug: "workshop",  label: "Ezze Workshop",          icon: Shirt },
  { slug: "clinic",    label: "Ezze Clinic",            icon: Stethoscope },
  { slug: "farm",      label: "Ezze Farm",              icon: Leaf },
  { slug: "edu",       label: "Ezze Edu",               icon: GraduationCap },
  { slug: "event",     label: "Ezze Event",             icon: CalendarDays },
  { slug: "food",      label: "Ezze Food",              icon: UtensilsCrossed },
  { slug: "hotel",     label: "Ezze Hotel",             icon: Building2 },
  { slug: "transport", label: "Ezze Transport",         icon: Car },
  { slug: "build",     label: "Ezze Build",             icon: Hammer },
];

export const SECTIONS = [
  { slug: "hero",     label: "Hero (шапка)" },
  { slug: "features", label: "Возможности" },
  { slug: "pricing",  label: "Тарифы" },
  { slug: "reviews",  label: "Отзывы" },
  { slug: "faq",      label: "FAQ" },
  { slug: "cta",      label: "CTA (призыв)" },
  { slug: "meta",     label: "SEO / Meta" },
];

export const LANGS = ["ru", "uz", "en"] as const;
export type Lang = (typeof LANGS)[number];
