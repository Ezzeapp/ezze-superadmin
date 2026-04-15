"use client";
import { useState, useEffect } from "react";
import {
  LayoutGrid, Eye, EyeOff, ChevronUp, ChevronDown, Pencil, Check, X,
  Scissors, Stethoscope, Wrench, GraduationCap, BedDouble, UtensilsCrossed,
  PartyPopper, Wheat, Car, HardHat, ShoppingCart, WashingMachine,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ── Types ──────────────────────────────────────────────────────────────────────

type LangCode = "ru" | "en" | "uz" | "kz" | "ky" | "tg" | "uk" | "by" | "kaa";

type PlatformProduct = {
  key: string;
  name_ru: string;
  name_en: string | null;
  name_uz: string | null;
  name_kz: string | null;
  name_ky: string | null;
  name_tg: string | null;
  name_uk: string | null;
  name_by: string | null;
  name_kaa: string | null;
  desc_ru: string | null;
  desc_en: string | null;
  desc_uz: string | null;
  desc_kz: string | null;
  desc_ky: string | null;
  desc_tg: string | null;
  desc_uk: string | null;
  desc_by: string | null;
  desc_kaa: string | null;
  active: boolean;
  sort_order: number;
};

// ── Constants ──────────────────────────────────────────────────────────────────

const LANGS: { code: LangCode; label: string }[] = [
  { code: "ru",  label: "Русский" },
  { code: "en",  label: "English" },
  { code: "uz",  label: "O'zbekcha" },
  { code: "kz",  label: "Қазақша" },
  { code: "ky",  label: "Кыргызча" },
  { code: "tg",  label: "Тоҷикӣ" },
  { code: "uk",  label: "Українська" },
  { code: "by",  label: "Беларуская" },
  { code: "kaa", label: "Қарақалпақша" },
];

const PRODUCT_ICONS: Record<string, LucideIcon> = {
  beauty:    Scissors,
  clinic:    Stethoscope,
  workshop:  Wrench,
  edu:       GraduationCap,
  hotel:     BedDouble,
  food:      UtensilsCrossed,
  event:     PartyPopper,
  farm:      Wheat,
  transport: Car,
  build:     HardHat,
  trade:     ShoppingCart,
  cleaning:  WashingMachine,
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function PlatformProductsPage() {
  const [products, setProducts] = useState<PlatformProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLang, setActiveLang] = useState<LangCode>("ru");
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("platform_products")
      .select("*")
      .order("sort_order");
    setProducts((data as PlatformProduct[]) ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  // ── Toggle active ────────────────────────────────────────────────────────────

  async function toggleActive(key: string, current: boolean) {
    setProducts((prev) =>
      prev.map((p) => (p.key === key ? { ...p, active: !current } : p))
    );
    await supabase
      .from("platform_products")
      .update({ active: !current })
      .eq("key", key);
  }

  // ── Reorder ──────────────────────────────────────────────────────────────────

  async function move(key: string, dir: -1 | 1) {
    const idx = products.findIndex((p) => p.key === key);
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= products.length) return;

    const next = [...products];
    [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
    next.forEach((p, i) => (p.sort_order = i));
    setProducts([...next]);

    await Promise.all(
      next.map((p, i) =>
        supabase.from("platform_products").update({ sort_order: i }).eq("key", p.key)
      )
    );
  }

  // ── Inline edit name/desc ────────────────────────────────────────────────────

  function startEdit(p: PlatformProduct) {
    setEditKey(p.key);
    setEditName((p[`name_${activeLang}` as keyof PlatformProduct] as string) || "");
    setEditDesc((p[`desc_${activeLang}` as keyof PlatformProduct] as string) || "");
  }

  async function saveEdit(key: string) {
    setSaving(true);
    await supabase
      .from("platform_products")
      .update({
        [`name_${activeLang}`]: editName.trim() || null,
        [`desc_${activeLang}`]: editDesc.trim() || null,
      })
      .eq("key", key);

    setProducts((prev) =>
      prev.map((p) =>
        p.key === key
          ? {
              ...p,
              [`name_${activeLang}`]: editName.trim() || null,
              [`desc_${activeLang}`]: editDesc.trim() || null,
            }
          : p
      )
    );
    setSaving(false);
    setEditKey(null);
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900">
          <LayoutGrid size={18} className="text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Направления бизнеса
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Список продуктов на экране выбора при регистрации
          </p>
        </div>
      </div>

      {/* Lang tabs */}
      <div className="flex gap-1 flex-wrap mb-4">
        {LANGS.map((l) => (
          <button
            key={l.code}
            onClick={() => { setEditKey(null); setActiveLang(l.code); }}
            className={[
              "px-3 py-1 rounded-full text-xs font-medium transition-colors",
              activeLang === l.code
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            ].join(" ")}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="text-sm text-gray-400 py-8 text-center">Загрузка...</div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-900 text-xs text-gray-500 dark:text-gray-400 uppercase">
              <tr>
                <th className="text-left px-4 py-3 w-8">#</th>
                <th className="text-left px-4 py-3 w-8"></th>
                <th className="text-left px-4 py-3">Название</th>
                <th className="text-left px-4 py-3">Описание</th>
                <th className="text-center px-4 py-3 w-20">Активен</th>
                <th className="text-center px-4 py-3 w-24">Порядок</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {products.map((p, idx) => {
                const Icon = PRODUCT_ICONS[p.key] ?? Wrench;
                const name = (p[`name_${activeLang}` as keyof PlatformProduct] as string) || p.name_ru;
                const desc = (p[`desc_${activeLang}` as keyof PlatformProduct] as string) || p.desc_ru || "";
                const isEditing = editKey === p.key;

                return (
                  <tr
                    key={p.key}
                    className={[
                      "transition-colors",
                      p.active
                        ? "bg-white dark:bg-gray-950 hover:bg-gray-50 dark:hover:bg-gray-900"
                        : "bg-gray-50 dark:bg-gray-900/50 opacity-60",
                    ].join(" ")}
                  >
                    {/* Index */}
                    <td className="px-4 py-3 text-gray-400 text-xs">{idx + 1}</td>

                    {/* Icon */}
                    <td className="px-4 py-3">
                      <Icon size={16} className="text-gray-500 dark:text-gray-400" />
                    </td>

                    {/* Name */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <input
                          autoFocus
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm rounded border border-indigo-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="font-medium text-gray-900 dark:text-white">
                          {name}
                          {activeLang !== "ru" && !(p[`name_${activeLang}` as keyof PlatformProduct]) && (
                            <span className="ml-1 text-[10px] text-amber-500">нет перевода</span>
                          )}
                        </span>
                      )}
                    </td>

                    {/* Desc */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-xs">
                      {isEditing ? (
                        <input
                          value={editDesc}
                          onChange={(e) => setEditDesc(e.target.value)}
                          className="w-full px-2 py-1 text-sm rounded border border-indigo-400 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : (
                        <span className="text-xs">{desc}</span>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => toggleActive(p.key, p.active)}
                        className={[
                          "inline-flex items-center justify-center w-7 h-7 rounded-lg transition-colors",
                          p.active
                            ? "bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-400 hover:bg-gray-200 dark:bg-gray-800",
                        ].join(" ")}
                        title={p.active ? "Скрыть" : "Показать"}
                      >
                        {p.active ? <Eye size={14} /> : <EyeOff size={14} />}
                      </button>
                    </td>

                    {/* Reorder + Edit actions */}
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        {isEditing ? (
                          <>
                            <button
                              onClick={() => saveEdit(p.key)}
                              disabled={saving}
                              className="flex items-center justify-center w-7 h-7 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 transition-colors"
                              title="Сохранить"
                            >
                              <Check size={13} />
                            </button>
                            <button
                              onClick={() => setEditKey(null)}
                              className="flex items-center justify-center w-7 h-7 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 transition-colors"
                              title="Отмена"
                            >
                              <X size={13} />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => move(p.key, -1)}
                              disabled={idx === 0}
                              className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                              title="Выше"
                            >
                              <ChevronUp size={14} />
                            </button>
                            <button
                              onClick={() => move(p.key, 1)}
                              disabled={idx === products.length - 1}
                              className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors"
                              title="Ниже"
                            >
                              <ChevronDown size={14} />
                            </button>
                            <button
                              onClick={() => startEdit(p)}
                              className="flex items-center justify-center w-6 h-6 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                              title="Редактировать"
                            >
                              <Pencil size={13} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3">
        Изменения применяются сразу — перезагрузка страницы регистрации не требуется.
      </p>
    </div>
  );
}
