"use client";
import { useState, useEffect } from "react";
import {
  Scissors, Shirt, Stethoscope, Leaf, GraduationCap, CalendarDays,
  UtensilsCrossed, Building2, Car, Hammer, Globe, Zap, ShoppingBag,
  Heart, Dumbbell, Package, Truck, Hotel, Camera, Music, Dog, Flower2,
  Wrench, Cpu, BookOpen, Coffee, Bike, Baby, Store, ClipboardList,
  ChevronUp, ChevronDown, EyeOff, Eye, Check, LayoutGrid,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase, PRODUCTS } from "../../../lib/supabase";

// All icons available to choose from
const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "Globe", icon: Globe },
  { name: "Scissors", icon: Scissors },
  { name: "Shirt", icon: Shirt },
  { name: "Stethoscope", icon: Stethoscope },
  { name: "Leaf", icon: Leaf },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "CalendarDays", icon: CalendarDays },
  { name: "UtensilsCrossed", icon: UtensilsCrossed },
  { name: "Building2", icon: Building2 },
  { name: "Car", icon: Car },
  { name: "Hammer", icon: Hammer },
  { name: "Zap", icon: Zap },
  { name: "ShoppingBag", icon: ShoppingBag },
  { name: "Heart", icon: Heart },
  { name: "Dumbbell", icon: Dumbbell },
  { name: "Package", icon: Package },
  { name: "Truck", icon: Truck },
  { name: "Hotel", icon: Hotel },
  { name: "Camera", icon: Camera },
  { name: "Music", icon: Music },
  { name: "Dog", icon: Dog },
  { name: "Flower2", icon: Flower2 },
  { name: "Wrench", icon: Wrench },
  { name: "Cpu", icon: Cpu },
  { name: "BookOpen", icon: BookOpen },
  { name: "Coffee", icon: Coffee },
  { name: "Bike", icon: Bike },
  { name: "Baby", icon: Baby },
  { name: "Store", icon: Store },
  { name: "ClipboardList", icon: ClipboardList },
];

function getIconComponent(name: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.name === name)?.icon ?? Globe;
}

interface ProductConfig {
  slug: string;
  label: string;
  iconName: string;
  url: string;
  hidden: boolean;
  comingSoon: boolean;
}

function buildDefaults(): ProductConfig[] {
  const iconMap: Record<string, string> = {
    main: "Globe", beauty: "Scissors", workshop: "Shirt", clinic: "Stethoscope",
    farm: "Leaf", edu: "GraduationCap", event: "CalendarDays", food: "UtensilsCrossed",
    hotel: "Building2", transport: "Car", build: "Hammer",
  };
  return PRODUCTS.map((p) => ({
    slug: p.slug,
    label: p.label,
    iconName: iconMap[p.slug] ?? "Globe",
    url: "https://pro.ezze.site",
    hidden: false,
    comingSoon: false,
  }));
}

export default function ProductsSettingsPage() {
  const [items, setItems] = useState<ProductConfig[]>(buildDefaults());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [iconPickerSlug, setIconPickerSlug] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "products_config")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed: ProductConfig[] = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed);
            }
          } catch { /* keep defaults */ }
        }
        setLoading(false);
      });
  }, []);

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setItems(next);
    setSaved(false);
  }

  function update(slug: string, patch: Partial<ProductConfig>) {
    setItems((prev) => prev.map((p) => p.slug === slug ? { ...p, ...patch } : p));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await supabase.from("app_settings").upsert(
      { key: "products_config", value: JSON.stringify(items) },
      { onConflict: "key" }
    );
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">Загрузка...</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <LayoutGrid size={22} className="text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление продуктами</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Изменения применяются на ezze.site после следующего деплоя лендинга
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-6">
        {items.map((item, i) => {
          const Icon = getIconComponent(item.iconName);
          return (
            <div
              key={item.slug}
              className={`rounded-xl border p-4 flex items-center gap-4 transition-opacity ${
                item.hidden
                  ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              }`}
            >
              {/* Reorder */}
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => move(i, -1)}
                  disabled={i === 0}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                >
                  <ChevronUp size={14} />
                </button>
                <button
                  onClick={() => move(i, 1)}
                  disabled={i === items.length - 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20"
                >
                  <ChevronDown size={14} />
                </button>
              </div>

              {/* Icon picker trigger */}
              <button
                onClick={() => setIconPickerSlug(iconPickerSlug === item.slug ? null : item.slug)}
                className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center shrink-0 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors border-2 border-transparent hover:border-indigo-300 dark:hover:border-indigo-600"
                title="Сменить иконку"
              >
                <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
              </button>

              {/* Name + URL */}
              <div className="flex-1 min-w-0 flex flex-col gap-1.5">
                <input
                  value={item.label}
                  onChange={(e) => update(item.slug, { label: e.target.value })}
                  className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-gray-900 dark:text-white transition-colors"
                  placeholder="Название продукта"
                />
                <input
                  value={item.url}
                  onChange={(e) => update(item.slug, { url: e.target.value })}
                  className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-gray-400 dark:text-gray-500 transition-colors font-mono"
                  placeholder="URL приложения"
                />
              </div>

              {/* Slug badge */}
              <span className="text-xs text-gray-400 dark:text-gray-600 font-mono shrink-0">
                /{item.slug}
              </span>

              {/* Coming soon toggle */}
              <button
                onClick={() => update(item.slug, { comingSoon: !item.comingSoon })}
                className={`text-xs px-2 py-1 rounded-full border shrink-0 transition-colors ${
                  item.comingSoon
                    ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                    : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-300"
                }`}
                title="Переключить «Скоро»"
              >
                {item.comingSoon ? "Скоро" : "Активен"}
              </button>

              {/* Hide/show */}
              <button
                onClick={() => update(item.slug, { hidden: !item.hidden })}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                title={item.hidden ? "Показать" : "Скрыть"}
              >
                {item.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          );
        })}
      </div>

      {/* Icon picker panel */}
      {iconPickerSlug && (
        <div className="mb-6 rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50 dark:bg-indigo-950/30 p-4">
          <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-3 uppercase tracking-wide">
            Выберите иконку для /{iconPickerSlug}
          </p>
          <div className="grid grid-cols-10 gap-2">
            {ICON_OPTIONS.map(({ name, icon: Ico }) => {
              const current = items.find((p) => p.slug === iconPickerSlug)?.iconName;
              return (
                <button
                  key={name}
                  onClick={() => {
                    update(iconPickerSlug, { iconName: name });
                    setIconPickerSlug(null);
                  }}
                  title={name}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                    current === name
                      ? "border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:bg-white dark:hover:bg-gray-800"
                  }`}
                >
                  <Ico size={16} />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          saved
            ? "bg-green-600 text-white"
            : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        }`}
      >
        {saved && <Check size={15} />}
        {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить конфигурацию"}
      </button>

      <p className="mt-4 text-xs text-gray-400 dark:text-gray-600">
        Настройки хранятся в app_settings.products_config. Чтобы применить изменения на лендинге,
        запустите деплой ezze-landing (git push).
      </p>
    </div>
  );
}
