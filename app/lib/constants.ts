export const PRODUCTS = [
  { slug: "main",      label: "Главная (ezze.site)",   icon: "🏠" },
  { slug: "beauty",    label: "Ezze Beauty",            icon: "💄" },
  { slug: "workshop",  label: "Ezze Workshop",          icon: "👕" },
  { slug: "clinic",    label: "Ezze Clinic",            icon: "🏥" },
  { slug: "farm",      label: "Ezze Farm",              icon: "🌾" },
  { slug: "edu",       label: "Ezze Edu",               icon: "🎓" },
  { slug: "event",     label: "Ezze Event",             icon: "🎉" },
  { slug: "food",      label: "Ezze Food",              icon: "🍕" },
  { slug: "hotel",     label: "Ezze Hotel",             icon: "🏨" },
  { slug: "transport", label: "Ezze Transport",         icon: "🚗" },
  { slug: "build",     label: "Ezze Build",             icon: "🏗️" },
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
