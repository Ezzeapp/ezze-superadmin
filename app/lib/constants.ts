import {
  Globe, Scissors, Wrench, WashingMachine, Stethoscope, Leaf, GraduationCap,
  CalendarDays, UtensilsCrossed, Building2, Car, Hammer, ShoppingBag, KeyRound,
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
  { slug: "workshop",  label: "Ezze Workshop",          icon: Wrench },
  { slug: "clinic",    label: "Ezze Clinic",            icon: Stethoscope },
  { slug: "farm",      label: "Ezze Farm",              icon: Leaf },
  { slug: "edu",       label: "Ezze Edu",               icon: GraduationCap },
  { slug: "event",     label: "Ezze Event",             icon: CalendarDays },
  { slug: "food",      label: "Ezze Food",              icon: UtensilsCrossed },
  { slug: "hotel",     label: "Ezze Hotel",             icon: Building2 },
  { slug: "transport", label: "Ezze Transport",         icon: Car },
  { slug: "build",     label: "Ezze Build",             icon: Hammer },
  { slug: "trade",     label: "Ezze Trade",             icon: ShoppingBag },
  { slug: "cleaning",  label: "Ezze Cleaning",          icon: WashingMachine },
  { slug: "rental",    label: "Ezze Rental",            icon: KeyRound },
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

export const SECTION_SCHEMAS: Record<string, string> = {
  hero: JSON.stringify(
    { title: "Ezze Beauty", subtitle: "Платформа для мастеров красоты", badge: "Топ продукт", cta_text: "Открыть приложение", cta_url: "https://beauty.ezze.site" },
    null, 2
  ),
  features: JSON.stringify(
    { title: "Возможности", items: [{ title: "Онлайн-запись", description: "Клиенты записываются сами 24/7" }, { title: "Клиентская база", description: "История всех визитов" }] },
    null, 2
  ),
  pricing: JSON.stringify(
    { title: "Тарифы", plans: [{ name: "Бесплатный", price: "0", period: "мес", features: ["До 50 клиентов", "Календарь"], highlighted: false }, { name: "Про", price: "99 000", period: "мес", features: ["Без ограничений", "Команда", "Аналитика"], highlighted: true }] },
    null, 2
  ),
  reviews: JSON.stringify(
    { title: "Отзывы", items: [{ author: "Анна К.", role: "Мастер маникюра", text: "Отличное приложение!", rating: 5 }] },
    null, 2
  ),
  faq: JSON.stringify(
    { title: "Частые вопросы", items: [{ question: "Как начать работу?", answer: "Зарегистрируйтесь и добавьте свои услуги." }] },
    null, 2
  ),
  cta: JSON.stringify(
    { title: "Готовы начать?", subtitle: "Бесплатный тариф навсегда.", button_text: "Создать аккаунт", button_url: "https://beauty.ezze.site/register" },
    null, 2
  ),
  meta: JSON.stringify(
    { title: "Ezze Beauty — платформа для мастеров красоты", description: "Онлайн-запись, клиентская база, аналитика", keywords: "мастер красоты, онлайн запись" },
    null, 2
  ),
};
