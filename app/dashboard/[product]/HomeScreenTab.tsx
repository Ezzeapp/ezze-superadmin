"use client";
import { useEffect, useState } from "react";
import {
  Calendar, Users, ClipboardList, ShoppingCart, Truck, Droplets,
  BarChart3, Tag, Settings2, Wallet, LayoutDashboard, Wrench,
  MessageSquare, Star, Package, Bot, Shield, CalendarDays,
  BarChart2, ChevronUp, ChevronDown, Trash2, Plus, RotateCcw, Save,
  PanelLeft, LayoutGrid, Sparkles, ListChecks, Boxes,
  Gift, Megaphone, UsersRound, CreditCard, LifeBuoy, User, ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  type HomeScreenConfig, type HomeScreenTile, type HomeScreenMode,
  DEFAULT_HOME_SCREEN_CONFIG, isTilesLikeMode, getDefaultTiles,
} from "../../lib/homeScreenDefaults";

// ── Иконки ─────────────────────────────────────────────────────────────────────

const ICON_OPTIONS: { value: string; Icon: LucideIcon }[] = [
  { value: "ClipboardList", Icon: ClipboardList },
  { value: "ShoppingCart",  Icon: ShoppingCart },
  { value: "Users",         Icon: Users },
  { value: "Truck",         Icon: Truck },
  { value: "Droplets",      Icon: Droplets },
  { value: "BarChart3",     Icon: BarChart3 },
  { value: "BarChart2",     Icon: BarChart2 },
  { value: "Tag",           Icon: Tag },
  { value: "Settings2",     Icon: Settings2 },
  { value: "Wallet",        Icon: Wallet },
  { value: "LayoutDashboard", Icon: LayoutDashboard },
  { value: "Calendar",      Icon: Calendar },
  { value: "CalendarDays",  Icon: CalendarDays },
  { value: "Wrench",        Icon: Wrench },
  { value: "MessageSquare", Icon: MessageSquare },
  { value: "Star",          Icon: Star },
  { value: "Package",       Icon: Package },
  { value: "Bot",           Icon: Bot },
  { value: "Shield",        Icon: Shield },
  { value: "ShieldCheck",   Icon: ShieldCheck },
  { value: "Gift",          Icon: Gift },
  { value: "Megaphone",     Icon: Megaphone },
  { value: "UsersRound",    Icon: UsersRound },
  { value: "CreditCard",    Icon: CreditCard },
  { value: "LifeBuoy",      Icon: LifeBuoy },
  { value: "User",          Icon: User },
];

const ICON_MAP: Record<string, LucideIcon> = Object.fromEntries(
  ICON_OPTIONS.map(({ value, Icon }) => [value, Icon])
);

const LABEL_LANGS = [
  { code: "ru", label: "RU" },
  { code: "en", label: "EN" },
  { code: "kz", label: "KZ" },
  { code: "uz", label: "UZ" },
];

const MODE_OPTIONS: { value: HomeScreenMode; Icon: LucideIcon; label: string; desc: string }[] = [
  { value: "sidebar",      Icon: PanelLeft,  label: "Сайдбар",          desc: "Классическое боковое меню, главная сразу открывает основной раздел" },
  { value: "tiles",        Icon: LayoutGrid, label: "Плитки",            desc: "Простая сетка квадратных плиток на главной" },
  { value: "hybrid_light", Icon: Sparkles,   label: "Гибрид · лёгкий",   desc: "iOS-плитки + график выручки и лента активности" },
  { value: "hybrid_dense", Icon: ListChecks, label: "Гибрид · плотный",  desc: "Плитки-ярлычки + 3 модуля операционки (выдача / приёмка / доставка)" },
  { value: "hybrid_bento", Icon: Boxes,      label: "Гибрид · Bento",    desc: "Большая плитка «Заказы» с разбивкой + мини-плитки и виджеты" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreenTab({ product }: { product: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [mode, setMode] = useState<HomeScreenMode>("sidebar");
  const [tiles, setTiles] = useState<HomeScreenTile[]>([]);

  // ── Загрузка ────────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("product", product)
        .eq("key", "home_screen_config")
        .maybeSingle();

      let cfg: HomeScreenConfig = DEFAULT_HOME_SCREEN_CONFIG;
      if (data?.value) {
        try { cfg = JSON.parse(data.value); } catch { /* ignore */ }
      }
      setMode(cfg.mode);
      setTiles(cfg.tiles?.length ? cfg.tiles : getDefaultTiles(product));
      setLoading(false);
    })();
  }, [product]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function moveTile(index: number, dir: -1 | 1) {
    const next = [...tiles];
    const swap = index + dir;
    if (swap < 0 || swap >= next.length) return;
    [next[index], next[swap]] = [next[swap], next[index]];
    setTiles(next);
  }

  function updateTile(index: number, patch: Partial<HomeScreenTile>) {
    setTiles((prev) => prev.map((t, i) => (i === index ? { ...t, ...patch } : t)));
  }

  function updateTileLabel(index: number, lang: string, value: string) {
    setTiles((prev) =>
      prev.map((t, i) => (i === index ? { ...t, label: { ...t.label, [lang]: value } } : t))
    );
  }

  function removeTile(index: number) {
    setTiles((prev) => prev.filter((_, i) => i !== index));
  }

  function addTile() {
    const newTile: HomeScreenTile = {
      id: `tile_${Date.now()}`,
      label: { ru: "Новый раздел", en: "New section", kz: "Жаңа бөлім", uz: "Yangi boʻlim" },
      icon: "LayoutDashboard",
      route: "/",
      visible: true,
      order: tiles.length,
    };
    setTiles((prev) => [...prev, newTile]);
  }

  function resetToDefault() {
    setTiles(getDefaultTiles(product));
  }

  async function handleSave() {
    setSaving(true);
    const cfg: HomeScreenConfig = {
      mode,
      tiles: tiles.map((t, i) => ({ ...t, order: i })),
    };
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { product, key: "home_screen_config", value: JSON.stringify(cfg) },
        { onConflict: "product,key" }
      );
    setSaving(false);
    if (error) {
      alert("Ошибка сохранения: " + error.message);
      return;
    }
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  }

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Загрузка...</div>;

  return (
    <div className="space-y-6">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Конфигурация главного экрана продукта{" "}
        <span className="font-medium text-gray-900 dark:text-white">{product}</span>:
        режим навигации (сайдбар / плитки / гибриды) и набор плиток с порядком, иконками и переводами.
      </p>

      {/* Режим */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Режим навигации</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {MODE_OPTIONS.map(({ value, Icon, label, desc }) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-xl border p-3 text-left transition-all ${
                  active
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 ring-2 ring-indigo-200 dark:ring-indigo-800"
                    : "border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                }`}
              >
                <div
                  className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${
                    active
                      ? "bg-indigo-600 text-white"
                      : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400"
                  }`}
                >
                  <Icon size={16} />
                </div>
                <div
                  className={`text-sm font-bold leading-tight ${
                    active ? "text-indigo-600 dark:text-indigo-400" : "text-gray-900 dark:text-white"
                  }`}
                >
                  {label}
                </div>
                <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 leading-snug">{desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Плитки — для всех tiles-подобных режимов */}
      {isTilesLikeMode(mode) && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Плитки</h2>
            <button type="button" onClick={resetToDefault} className={btnOutline}>
              <RotateCcw size={13} />
              Сбросить к дефолту
            </button>
          </div>

          <div className="space-y-2">
            {tiles.map((tile, index) => {
              const Icon = ICON_MAP[tile.icon] ?? LayoutDashboard;
              return (
                <div key={tile.id} className="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-3 space-y-3">
                  {/* Строка 1 */}
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center h-8 w-8 rounded-md bg-indigo-100 dark:bg-indigo-900/30 shrink-0">
                      <Icon size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>

                    {/* Иконка */}
                    <select
                      value={tile.icon}
                      onChange={(e) => updateTile(index, { icon: e.target.value })}
                      className={`${input} h-7 w-36 text-xs`}
                    >
                      {ICON_OPTIONS.map(({ value }) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>

                    {/* Роут */}
                    <input
                      value={tile.route}
                      onChange={(e) => updateTile(index, { route: e.target.value })}
                      placeholder="/route"
                      className={`${input} h-7 text-xs flex-1`}
                    />

                    {/* Видимость */}
                    <button
                      type="button"
                      onClick={() => updateTile(index, { visible: !tile.visible })}
                      className={`shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                        tile.visible ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
                      }`}
                      title={tile.visible ? "Видна" : "Скрыта"}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          tile.visible ? "translate-x-4" : "translate-x-0.5"
                        }`}
                      />
                    </button>

                    {/* Порядок */}
                    <div className="flex flex-col shrink-0">
                      <button
                        type="button"
                        onClick={() => moveTile(index, -1)}
                        disabled={index === 0}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                        title="Вверх"
                      >
                        <ChevronUp size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveTile(index, 1)}
                        disabled={index === tiles.length - 1}
                        className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30"
                        title="Вниз"
                      >
                        <ChevronDown size={14} />
                      </button>
                    </div>

                    {/* Удалить */}
                    <button
                      type="button"
                      onClick={() => removeTile(index)}
                      className="text-gray-400 hover:text-rose-600 shrink-0"
                      title="Удалить"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  {/* Строка 2: переводы */}
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {LABEL_LANGS.map(({ code, label: langLabel }) => (
                      <div key={code}>
                        <label className="text-[10px] text-gray-500 dark:text-gray-400 mb-0.5 block">{langLabel}</label>
                        <input
                          value={tile.label[code] || ""}
                          onChange={(e) => updateTileLabel(index, code, e.target.value)}
                          placeholder={langLabel}
                          className={`${input} h-7 text-xs`}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <button type="button" onClick={addTile} className={`${btnOutline} w-full justify-center`}>
            <Plus size={13} />
            Добавить плитку
          </button>
        </div>
      )}

      {/* Сохранить */}
      <div className="flex items-center gap-3">
        <button type="button" onClick={handleSave} disabled={saving} className={btnPrimary}>
          <Save size={14} />
          {saving ? "Сохраняем..." : "Сохранить"}
        </button>
        {savedFlash && <span className="text-sm text-emerald-600 dark:text-emerald-400">✓ Сохранено</span>}
      </div>
    </div>
  );
}

const input =
  "w-full rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center gap-1.5 h-9 px-4 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors";

const btnOutline =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors";
