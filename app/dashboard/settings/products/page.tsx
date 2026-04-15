"use client";
import { useState, useEffect } from "react";
import {
  Scissors, Shirt, Stethoscope, Leaf, GraduationCap, CalendarDays,
  UtensilsCrossed, Building2, Car, Hammer, Globe, Zap, ShoppingBag,
  Heart, Dumbbell, Package, Truck, Hotel, Camera, Music, Dog, Flower2,
  Wrench, Cpu, BookOpen, Coffee, Bike, Baby, Store, ClipboardList,
  WashingMachine, ChevronUp, ChevronDown, EyeOff, Eye, Check, LayoutGrid,
  Plus, Trash2, Download,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const ICON_OPTIONS: { name: string; icon: LucideIcon }[] = [
  { name: "Globe",           icon: Globe },
  { name: "Scissors",        icon: Scissors },
  { name: "Wrench",          icon: Wrench },
  { name: "WashingMachine",  icon: WashingMachine },
  { name: "Stethoscope",     icon: Stethoscope },
  { name: "Leaf",            icon: Leaf },
  { name: "GraduationCap",   icon: GraduationCap },
  { name: "CalendarDays",    icon: CalendarDays },
  { name: "UtensilsCrossed", icon: UtensilsCrossed },
  { name: "Building2",       icon: Building2 },
  { name: "Car",             icon: Car },
  { name: "Hammer",          icon: Hammer },
  { name: "ShoppingBag",     icon: ShoppingBag },
  { name: "Zap",             icon: Zap },
  { name: "Heart",           icon: Heart },
  { name: "Dumbbell",        icon: Dumbbell },
  { name: "Package",         icon: Package },
  { name: "Truck",           icon: Truck },
  { name: "Hotel",           icon: Hotel },
  { name: "Camera",          icon: Camera },
  { name: "Music",           icon: Music },
  { name: "Dog",             icon: Dog },
  { name: "Flower2",         icon: Flower2 },
  { name: "Cpu",             icon: Cpu },
  { name: "BookOpen",        icon: BookOpen },
  { name: "Coffee",          icon: Coffee },
  { name: "Bike",            icon: Bike },
  { name: "Baby",            icon: Baby },
  { name: "Store",           icon: Store },
  { name: "ClipboardList",   icon: ClipboardList },
  { name: "Shirt",           icon: Shirt },
];

const COLOR_OPTIONS = [
  { label: "Розово-фиолетовый", value: "from-pink-500 to-purple-600" },
  { label: "Сине-голубой",      value: "from-blue-500 to-cyan-600" },
  { label: "Зелёный",           value: "from-green-500 to-teal-600" },
  { label: "Жёлто-оранжевый",   value: "from-yellow-500 to-orange-600" },
  { label: "Индиго-синий",      value: "from-indigo-500 to-blue-600" },
  { label: "Индиго-фиолетовый", value: "from-indigo-500 to-purple-600" },
  { label: "Фиолетовый",        value: "from-violet-500 to-purple-600" },
  { label: "Красно-оранжевый",  value: "from-red-500 to-orange-600" },
  { label: "Голубой",           value: "from-sky-500 to-blue-600" },
  { label: "Янтарно-оранжевый", value: "from-amber-500 to-orange-600" },
  { label: "Серый",             value: "from-stone-500 to-gray-600" },
  { label: "Изумрудный",        value: "from-emerald-500 to-green-600" },
  { label: "Циановый",          value: "from-cyan-500 to-blue-600" },
];

const LANGS = [
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
  description: string;
  color: string;
  features: string[];
  showInRegistration: boolean;
  nameI18n: Record<string, string>;
  descI18n: Record<string, string>;
}

function newProduct(): ProductConfig {
  return {
    slug: "",
    label: "",
    iconName: "Globe",
    url: "https://.ezze.site",
    hidden: false,
    comingSoon: true,
    description: "",
    color: "from-indigo-500 to-purple-600",
    features: [],
    showInRegistration: true,
    nameI18n: {},
    descI18n: {},
  };
}

export default function ProductsSettingsPage() {
  const [items, setItems] = useState<ProductConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [iconPickerIdx, setIconPickerIdx] = useState<number | null>(null);
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [activeLang, setActiveLang] = useState("ru");
  const [migrating, setMigrating] = useState(false);
  const [migrated, setMigrated] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("product", "main")
      .eq("key", "products_config")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          try {
            const parsed: ProductConfig[] = JSON.parse(data.value);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setItems(parsed.map(p => ({
                ...p,
                description: p.description ?? "",
                color: p.color ?? "from-indigo-500 to-purple-600",
                features: p.features ?? [],
                showInRegistration: p.showInRegistration ?? !p.comingSoon,
                nameI18n: p.nameI18n ?? {},
                descI18n: p.descI18n ?? {},
              })));
            }
          } catch { /* keep empty */ }
        }
        setLoading(false);
      });
  }, []);

  async function importFromPlatformProducts() {
    setMigrating(true);
    const { data: rows } = await supabase.from("platform_products").select("*");
    if (rows && rows.length > 0) {
      setItems(prev => prev.map(item => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const row = rows.find((r: any) => r.key === item.slug);
        if (!row) return item;
        return {
          ...item,
          showInRegistration: row.active ?? true,
          nameI18n: {
            ru:  row.name_ru  || "",
            en:  row.name_en  || "",
            uz:  row.name_uz  || "",
            kz:  row.name_kz  || "",
            ky:  row.name_ky  || "",
            tg:  row.name_tg  || "",
            uk:  row.name_uk  || "",
            by:  row.name_by  || "",
            kaa: row.name_kaa || "",
          },
          descI18n: {
            ru:  row.desc_ru  || "",
            en:  row.desc_en  || "",
            uz:  row.desc_uz  || "",
            kz:  row.desc_kz  || "",
            ky:  row.desc_ky  || "",
            tg:  row.desc_tg  || "",
            uk:  row.desc_uk  || "",
            by:  row.desc_by  || "",
            kaa: row.desc_kaa || "",
          },
        };
      }));
      setSaved(false);
      setMigrated(true);
      setTimeout(() => setMigrated(false), 3000);
    }
    setMigrating(false);
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    if (expandedIdx === index) setExpandedIdx(target);
    else if (expandedIdx === target) setExpandedIdx(index);
    if (iconPickerIdx === index) setIconPickerIdx(target);
    else if (iconPickerIdx === target) setIconPickerIdx(index);
    setItems(next);
    setSaved(false);
  }

  function update(index: number, patch: Partial<ProductConfig>) {
    setItems((prev) => prev.map((p, i) => i === index ? { ...p, ...patch } : p));
    setSaved(false);
  }

  function addProduct() {
    setItems((prev) => {
      const next = [...prev, newProduct()];
      setExpandedIdx(next.length - 1);
      return next;
    });
    setSaved(false);
  }

  function removeProduct(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index));
    if (expandedIdx === index) setExpandedIdx(null);
    if (iconPickerIdx === index) setIconPickerIdx(null);
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError("");
    const { error } = await supabase.from("app_settings").upsert(
      { product: "main", key: "products_config", value: JSON.stringify(items) },
      { onConflict: "product,key" }
    );
    setSaving(false);
    if (error) {
      setSaveError("Ошибка сохранения: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (loading) {
    return <div className="p-8 text-gray-400 text-sm">Загрузка...</div>;
  }

  return (
    <div className="p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <LayoutGrid size={22} className="text-indigo-600 dark:text-indigo-400" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Управление продуктами</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Лендинг + экран выбора при регистрации
            </p>
          </div>
        </div>
        <button
          onClick={addProduct}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={15} />
          Добавить продукт
        </button>
      </div>

      {/* Language tabs + import button */}
      <div className="mb-5 p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Язык экрана регистрации:
          </p>
          <button
            onClick={importFromPlatformProducts}
            disabled={migrating}
            className={[
              "flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border transition-colors",
              migrated
                ? "border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20"
                : "border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400",
            ].join(" ")}
            title="Импортировать переводы из таблицы platform_products"
          >
            {migrated ? <Check size={12} /> : <Download size={12} />}
            {migrating ? "Импорт..." : migrated ? "Импортировано!" : "Импорт переводов"}
          </button>
        </div>
        <div className="flex gap-1 flex-wrap">
          {LANGS.map((l) => (
            <button
              key={l.code}
              onClick={() => setActiveLang(l.code)}
              className={[
                "px-3 py-1 rounded-full text-xs font-medium transition-colors",
                activeLang === l.code
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700",
              ].join(" ")}
            >
              {l.label}
            </button>
          ))}
        </div>
      </div>

      {/* Product list */}
      <div className="space-y-2 mb-6">
        {items.map((item, i) => {
          const Icon = getIconComponent(item.iconName);
          const isExpanded = expandedIdx === i;
          const isIconOpen = iconPickerIdx === i;
          const regName = item.nameI18n[activeLang] || item.nameI18n["ru"] || "";
          const hasI18n = Object.values(item.nameI18n).some(v => v.trim());

          return (
            <div
              key={i}
              className={`rounded-xl border transition-opacity ${
                item.hidden
                  ? "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 opacity-60"
                  : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900"
              }`}
            >
              {/* Compact row */}
              <div className="p-4 flex items-center gap-3">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => move(i, -1)} disabled={i === 0}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20">
                    <ChevronUp size={14} />
                  </button>
                  <button onClick={() => move(i, 1)} disabled={i === items.length - 1}
                    className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-20">
                    <ChevronDown size={14} />
                  </button>
                </div>

                {/* Icon + color preview */}
                <button
                  onClick={() => setIconPickerIdx(isIconOpen ? null : i)}
                  className={`w-10 h-10 rounded-lg bg-gradient-to-br ${item.color} flex items-center justify-center shrink-0 hover:opacity-80 transition-opacity border-2 border-transparent hover:border-white/50`}
                  title="Сменить иконку"
                >
                  <Icon size={20} className="text-white" />
                </button>

                {/* Label + URL */}
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <input
                    value={item.label}
                    onChange={(e) => update(i, { label: e.target.value })}
                    className="w-full text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-gray-900 dark:text-white transition-colors"
                    placeholder="Название продукта"
                  />
                  <input
                    value={item.url}
                    onChange={(e) => update(i, { url: e.target.value })}
                    className="w-full text-xs bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-indigo-500 focus:outline-none text-gray-400 dark:text-gray-500 transition-colors font-mono"
                    placeholder="URL приложения"
                  />
                </div>

                {/* Slug */}
                {item.slug ? (
                  <span className="text-xs text-gray-400 dark:text-gray-600 font-mono shrink-0">/{item.slug}</span>
                ) : (
                  <input
                    value={item.slug}
                    onChange={(e) => update(i, { slug: e.target.value.toLowerCase().replace(/[^a-z0-9]/g, "") })}
                    className="w-20 text-xs font-mono bg-transparent border border-gray-300 dark:border-gray-600 rounded px-2 py-1 focus:border-indigo-500 focus:outline-none text-gray-600 dark:text-gray-400"
                    placeholder="slug"
                  />
                )}

                {/* Registration badge — show reg name if i18n filled */}
                {hasI18n && (
                  <span
                    className="text-[10px] text-gray-400 dark:text-gray-600 font-medium shrink-0 max-w-[60px] truncate"
                    title={`Регистрация: ${regName}`}
                  >
                    {regName}
                  </span>
                )}

                {/* Coming soon */}
                <button
                  onClick={() => update(i, { comingSoon: !item.comingSoon })}
                  className={`text-xs px-2 py-1 rounded-full border shrink-0 transition-colors ${
                    item.comingSoon
                      ? "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-900/20 dark:text-amber-400"
                      : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {item.comingSoon ? "Скоро" : "Активен"}
                </button>

                {/* Hide/show */}
                <button
                  onClick={() => update(i, { hidden: !item.hidden })}
                  className="p-1.5 rounded text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 shrink-0"
                  title={item.hidden ? "Показать" : "Скрыть"}
                >
                  {item.hidden ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>

                {/* Expand details */}
                <button
                  onClick={() => setExpandedIdx(isExpanded ? null : i)}
                  className="p-1.5 rounded text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 shrink-0"
                  title="Настройки"
                >
                  <ChevronDown size={16} className={`transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                </button>

                {/* Delete */}
                <button
                  onClick={() => removeProduct(i)}
                  className="p-1.5 rounded text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 shrink-0"
                  title="Удалить продукт"
                >
                  <Trash2 size={15} />
                </button>
              </div>

              {/* Expanded panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800">

                  {/* Registration section */}
                  <div className="px-4 pt-3 pb-3 space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                        Экран регистрации
                      </label>
                      <button
                        onClick={() => update(i, { showInRegistration: !item.showInRegistration })}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          item.showInRegistration
                            ? "border-green-400 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600"
                        }`}
                      >
                        {item.showInRegistration ? "Показывать" : "Скрыто"}
                      </button>
                    </div>
                    {item.showInRegistration && (
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-1">
                            Название ({activeLang.toUpperCase()})
                            {activeLang !== "ru" && !item.nameI18n[activeLang] && item.nameI18n["ru"] && (
                              <span className="ml-1 text-amber-500">нет перевода</span>
                            )}
                          </label>
                          <input
                            value={item.nameI18n[activeLang] || ""}
                            onChange={(e) => update(i, { nameI18n: { ...item.nameI18n, [activeLang]: e.target.value } })}
                            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none text-gray-700 dark:text-gray-300"
                            placeholder={`Красота 111`}
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-gray-400 dark:text-gray-500 block mb-1">
                            Описание ({activeLang.toUpperCase()})
                          </label>
                          <input
                            value={item.descI18n[activeLang] || ""}
                            onChange={(e) => update(i, { descI18n: { ...item.descI18n, [activeLang]: e.target.value } })}
                            className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none text-gray-700 dark:text-gray-300"
                            placeholder="Салоны, парикмахеры..."
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Landing section */}
                  <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-800 pt-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Лендинг</p>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Описание</label>
                      <input
                        value={item.description}
                        onChange={(e) => update(i, { description: e.target.value })}
                        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none text-gray-700 dark:text-gray-300"
                        placeholder="Краткое описание продукта для лендинга"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">Цвет иконки</label>
                      <div className="flex flex-wrap gap-2">
                        {COLOR_OPTIONS.map((c) => (
                          <button
                            key={c.value}
                            onClick={() => update(i, { color: c.value })}
                            title={c.label}
                            className={`w-7 h-7 rounded-lg bg-gradient-to-br ${c.value} transition-all ${
                              item.color === c.value ? "ring-2 ring-indigo-500 ring-offset-1 scale-110" : "hover:scale-105"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-1">
                        Фичи (по одной на строке, макс. 4)
                      </label>
                      <textarea
                        value={item.features.join("\n")}
                        onChange={(e) => update(i, {
                          features: e.target.value.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 4)
                        })}
                        rows={4}
                        className="w-full text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none text-gray-700 dark:text-gray-300 resize-none"
                        placeholder={"Онлайн-запись\nКлиентская база\nРасписание\nСтатистика"}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Icon picker */}
              {isIconOpen && (
                <div className="px-4 pb-4 border-t border-indigo-100 dark:border-indigo-900 pt-3">
                  <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 mb-2 uppercase tracking-wide">
                    Выберите иконку
                  </p>
                  <div className="grid grid-cols-10 gap-2">
                    {ICON_OPTIONS.map(({ name, icon: Ico }) => (
                      <button
                        key={name}
                        onClick={() => { update(i, { iconName: name }); setIconPickerIdx(null); }}
                        title={name}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-colors ${
                          item.iconName === name
                            ? "border-indigo-500 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400"
                            : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:bg-white dark:hover:bg-gray-800"
                        }`}
                      >
                        <Ico size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Save */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-4">
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
          <p className="text-xs text-gray-400 dark:text-gray-600">
            Применяется на ezze.site и экране регистрации
          </p>
        </div>
        {saveError && (
          <p className="text-sm text-red-600 dark:text-red-400">{saveError}</p>
        )}
      </div>
    </div>
  );
}
