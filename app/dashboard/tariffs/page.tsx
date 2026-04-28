"use client";
/**
 * Конструктор тарифов — per-product настройка планов с per-seat биллингом.
 *
 * Что редактируется:
 *  - Названия тарифов (Free / Pro / Business)
 *  - Базовая цена/мес
 *  - Активность (показывать ли тариф в Billing)
 *  - Лимиты (заказов/мес, клиентов, услуг)
 *  - Per-seat: включено мест, цена за доп. место, максимум мест
 *  - Список фич (для отображения в карточке тарифа)
 *
 * Хранение: app_settings с UNIQUE(product, key). Каждое сохранение upsert по (product, key).
 */

import { useState, useEffect, useMemo } from "react";
import { CreditCard, Settings2, Users, Sparkles, Plus, X, RefreshCw, Check } from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";

// ── Типы ──────────────────────────────────────────────────────────────────────

type PlanKey = "free" | "pro" | "enterprise";

type PlanNames    = { free: string; pro: string; enterprise: string };
type PlanPrices   = { pro: number; enterprise: number };  // free всегда 0
type PlanLimit    = { key: string; enabled: boolean; free: number | null; pro: number | null; enterprise: number | null };
type PlanFeatures = { free: string[]; pro: string[]; enterprise: string[] };
type PlanActive   = { free: boolean; pro: boolean; enterprise: boolean };
type SeatTier     = { seats_included: number; additional_seat_price: number; max_seats: number };
type PlanSeatPricing = { free: SeatTier; pro: SeatTier; enterprise: SeatTier };

// ── Дефолты ───────────────────────────────────────────────────────────────────

const DEFAULTS = {
  names:   { free: "Free", pro: "Pro", enterprise: "Business" } as PlanNames,
  prices:  { pro: 50000, enterprise: 120000 } as PlanPrices,
  limits:  [
    { key: "appts_month", enabled: true, free: 30, pro: null, enterprise: null },
    { key: "clients",     enabled: true, free: 50, pro: null, enterprise: null },
    { key: "services",    enabled: true, free: 20, pro: null, enterprise: null },
  ] as PlanLimit[],
  features: {
    free: ["До 30 заказов в месяц", "До 50 клиентов", "Базовая аналитика"],
    pro:  [
      "Безлимитные заказы и клиенты",
      "Онлайн-оплаты (Click, Payme, Uzum)",
      "Telegram-уведомления",
      "Лендинг с QR и промокодами",
      "Расширенная аналитика",
    ],
    enterprise: [
      "Все возможности Pro",
      "Команда: до 3 сотрудников включено",
      "+30 000 за каждого дополнительного сотрудника (макс. 15)",
      "Роли: Владелец / Админ / Оператор / Чистильщик-курьер",
      "Общая база клиентов и заказов",
      "Аналитика по сотрудникам и комиссиям",
    ],
  } as PlanFeatures,
  active: { free: true, pro: true, enterprise: true } as PlanActive,
  seat:   {
    free:       { seats_included: 1, additional_seat_price: 0,     max_seats: 1 },
    pro:        { seats_included: 1, additional_seat_price: 0,     max_seats: 1 },
    enterprise: { seats_included: 3, additional_seat_price: 30000, max_seats: 15 },
  } as PlanSeatPricing,
};

const PLAN_COLORS: Record<PlanKey, string> = {
  free:       "bg-gray-100 text-gray-700",
  pro:        "bg-indigo-100 text-indigo-700",
  enterprise: "bg-purple-100 text-purple-700",
};

const LIMIT_LABELS: Record<string, string> = {
  appts_month: "Заказов/мес",
  clients:     "Клиентов",
  services:    "Услуг",
};

// ── Helper: безопасный JSON.parse с fallback ─────────────────────────────────

function parseJSON<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; }
  catch { return fallback; }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function TariffsPage() {
  const [product, setProduct] = useState<string>("cleaning");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [names, setNames]       = useState<PlanNames>(DEFAULTS.names);
  const [prices, setPrices]     = useState<PlanPrices>(DEFAULTS.prices);
  const [limits, setLimits]     = useState<PlanLimit[]>(DEFAULTS.limits);
  const [features, setFeatures] = useState<PlanFeatures>(DEFAULTS.features);
  const [active, setActive]     = useState<PlanActive>(DEFAULTS.active);
  const [seatPricing, setSeat]  = useState<PlanSeatPricing>(DEFAULTS.seat);
  const [newFeat, setNewFeat]   = useState<Record<PlanKey, string>>({ free: "", pro: "", enterprise: "" });

  // Загрузка для выбранного продукта
  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("product", product)
        .in("key", [
          "plan_names", "plan_prices", "plan_limits",
          "plan_features", "plan_active", "plan_seat_pricing",
        ]);

      const map: Record<string, string> = {};
      (data ?? []).forEach((r: any) => { map[r.key] = r.value; });

      setNames   (parseJSON(map.plan_names,         DEFAULTS.names));
      setPrices  (parseJSON(map.plan_prices,        DEFAULTS.prices));
      setLimits  (parseJSON(map.plan_limits,        DEFAULTS.limits));
      setFeatures(parseJSON(map.plan_features,      DEFAULTS.features));
      setActive  (parseJSON(map.plan_active,        DEFAULTS.active));
      setSeat    (parseJSON(map.plan_seat_pricing,  DEFAULTS.seat));
      setLoading(false);
    })();
  }, [product]);

  async function upsert(key: string, value: any) {
    const { error } = await supabase
      .from("app_settings")
      .upsert(
        { product, key, value: typeof value === "string" ? value : JSON.stringify(value) },
        { onConflict: "product,key" }
      );
    if (error) throw error;
  }

  async function saveSection(sec: string, fn: () => Promise<void>) {
    setSaving(sec);
    try {
      await fn();
      setSaved(sec);
      setTimeout(() => setSaved(s => s === sec ? null : s), 2000);
    } catch (e) {
      console.error("Save error:", e);
      alert(`Ошибка сохранения: ${(e as Error).message}`);
    } finally {
      setSaving(null);
    }
  }

  async function resetToDefaults() {
    if (!confirm(`Сбросить все тарифы для «${product}» к дефолтам?\n\nТекущие значения будут утеряны.`)) return;

    await Promise.all([
      upsert("plan_names",         DEFAULTS.names),
      upsert("plan_prices",        DEFAULTS.prices),
      upsert("plan_limits",        DEFAULTS.limits),
      upsert("plan_features",      DEFAULTS.features),
      upsert("plan_active",        DEFAULTS.active),
      upsert("plan_seat_pricing",  DEFAULTS.seat),
    ]);

    setNames(DEFAULTS.names);
    setPrices(DEFAULTS.prices);
    setLimits(DEFAULTS.limits);
    setFeatures(DEFAULTS.features);
    setActive(DEFAULTS.active);
    setSeat(DEFAULTS.seat);
    alert("✅ Сброшено к дефолтам");
  }

  // Превью расчёта стоимости подписки для разных размеров команды
  const pricePreview = useMemo(() => {
    const base = prices.enterprise;
    const cfg = seatPricing.enterprise;
    return [1, 3, 5, 7, 10, cfg.max_seats].map((seats) => {
      const additional = Math.max(0, seats - cfg.seats_included);
      const total = base + additional * cfg.additional_seat_price;
      return { seats, total };
    });
  }, [prices.enterprise, seatPricing.enterprise]);

  // ── Helpers ──────────────────────────────────────────────────────────────────

  const patchLimit = (key: string, plan: PlanKey, val: string) =>
    setLimits(prev => prev.map(r =>
      r.key === key ? { ...r, [plan]: val === "" ? null : (parseInt(val) || 0) } : r
    ));
  const toggleLimit = (key: string, v: boolean) =>
    setLimits(prev => prev.map(r => r.key === key ? { ...r, enabled: v } : r));
  const addFeature = (plan: PlanKey) => {
    const text = newFeat[plan].trim();
    if (!text) return;
    setFeatures(p => ({ ...p, [plan]: [...p[plan], text] }));
    setNewFeat(p => ({ ...p, [plan]: "" }));
  };
  const removeFeature = (plan: PlanKey, idx: number) =>
    setFeatures(p => ({ ...p, [plan]: p[plan].filter((_, i) => i !== idx) }));

  const inp = "h-9 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50 disabled:text-gray-400";
  const card = "rounded-xl border border-gray-200 bg-white shadow-sm p-6 space-y-5";
  const btnSave = (sec: string) =>
    `inline-flex h-9 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${saved === sec ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`;

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse space-y-3">
            <div className="h-5 bg-gray-100 rounded w-40" />
            <div className="h-9 bg-gray-100 rounded" />
            <div className="h-9 bg-gray-100 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl space-y-6">
      {/* Header + product selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Конструктор тарифов</h1>
          <p className="text-sm text-gray-500 mt-1">
            Per-product: для каждого продукта свои тарифы, лимиты и цены за дополнительные места команды
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <select
            value={product}
            onChange={e => setProduct(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PRODUCTS.filter(p => p.slug !== "main").map(p => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
          <button
            onClick={resetToDefaults}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} />
            Сбросить к дефолтам
          </button>
        </div>
      </div>

      {/* === Названия + активность === */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
            <Settings2 size={16} className="text-violet-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Названия и активность тарифов</p>
            <p className="text-xs text-gray-500">Отображаемое название и доступность тарифа в Billing</p>
          </div>
        </div>

        <div className="space-y-3">
          {(["free", "pro", "enterprise"] as PlanKey[]).map(plan => (
            <div key={plan} className="flex items-center gap-3">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center ${PLAN_COLORS[plan]}`}>
                {plan === "enterprise" ? "Business" : plan.charAt(0).toUpperCase() + plan.slice(1)}
              </span>
              <input
                type="text"
                value={names[plan]}
                onChange={e => setNames(prev => ({ ...prev, [plan]: e.target.value }))}
                placeholder="Название"
                className={`${inp} w-48`}
              />
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={active[plan]}
                  onChange={e => setActive(prev => ({ ...prev, [plan]: e.target.checked }))}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-700">Активен</span>
              </label>
            </div>
          ))}
        </div>

        <button
          onClick={() => saveSection("names", async () => {
            await upsert("plan_names",  names);
            await upsert("plan_active", active);
          })}
          disabled={saving === "names"}
          className={btnSave("names")}
        >
          {saved === "names" ? <><Check size={14} /> Сохранено</> : saving === "names" ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>

      {/* === Цены === */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
            <CreditCard size={16} className="text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Базовые цены/мес (UZS)</p>
            <p className="text-xs text-gray-500">Цена подписки в месяц. Для Business — это база, к которой прибавляются доп. места.</p>
          </div>
        </div>

        <div className="space-y-3">
          {([
            { plan: "free" as PlanKey,       label: names.free,       value: 0,                disabled: true,  hint: "Бесплатный — всегда 0" },
            { plan: "pro" as PlanKey,        label: names.pro,        value: prices.pro,        disabled: false, hint: "Для одиночного мастера/химчистки" },
            { plan: "enterprise" as PlanKey, label: names.enterprise, value: prices.enterprise, disabled: false, hint: "База для команды" },
          ]).map(({ plan, label, value, disabled, hint }) => (
            <div key={plan} className="flex items-center gap-3 flex-wrap">
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center ${PLAN_COLORS[plan]}`}>
                {label}
              </span>
              <input
                type="number"
                min={0}
                step={1000}
                disabled={disabled}
                value={value}
                onChange={e => setPrices(prev => ({ ...prev, [plan]: parseInt(e.target.value) || 0 }))}
                className={`${inp} w-40`}
              />
              <span className="text-xs text-gray-400 whitespace-nowrap">UZS / мес</span>
              <span className="text-xs text-gray-400 italic">{hint}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => saveSection("prices", () => upsert("plan_prices", prices))}
          disabled={saving === "prices"}
          className={btnSave("prices")}
        >
          {saved === "prices" ? <><Check size={14} /> Сохранено</> : saving === "prices" ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>

      {/* === Per-seat биллинг (Business) === */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-50">
            <Users size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Команда (Business): per-seat биллинг</p>
            <p className="text-xs text-gray-500">Сколько мест включено в базу и за сколько продаётся каждое дополнительное</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Включено мест в базу</label>
            <input
              type="number"
              min={1}
              max={100}
              value={seatPricing.enterprise.seats_included}
              onChange={e => setSeat(prev => ({
                ...prev,
                enterprise: { ...prev.enterprise, seats_included: parseInt(e.target.value) || 1 },
              }))}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Считая владельца? Обычно нет — это лимит для сотрудников
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Цена за доп. место (UZS)</label>
            <input
              type="number"
              min={0}
              step={1000}
              value={seatPricing.enterprise.additional_seat_price}
              onChange={e => setSeat(prev => ({
                ...prev,
                enterprise: { ...prev.enterprise, additional_seat_price: parseInt(e.target.value) || 0 },
              }))}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Доплата сверх включённых
            </p>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 mb-1 block">Максимум мест</label>
            <input
              type="number"
              min={1}
              max={100}
              value={seatPricing.enterprise.max_seats}
              onChange={e => setSeat(prev => ({
                ...prev,
                enterprise: { ...prev.enterprise, max_seats: parseInt(e.target.value) || 1 },
              }))}
              className={inp}
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Дальше — Enterprise по договору
            </p>
          </div>
        </div>

        {/* Превью */}
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-xs font-semibold text-purple-900 mb-3 uppercase tracking-wide">
            <Sparkles size={12} className="inline mr-1" /> Превью цены подписки
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 text-sm">
            {pricePreview.map(({ seats, total }) => (
              <div key={seats} className="bg-white rounded-md p-2 border border-purple-100">
                <div className="text-[11px] text-gray-500">{seats} {seats === 1 ? "сотрудник" : "сотр."}</div>
                <div className="font-semibold text-purple-900 mt-0.5">{total.toLocaleString("ru-RU")} <span className="text-[10px] text-gray-500">сум</span></div>
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={() => saveSection("seat", () => upsert("plan_seat_pricing", seatPricing))}
          disabled={saving === "seat"}
          className={btnSave("seat")}
        >
          {saved === "seat" ? <><Check size={14} /> Сохранено</> : saving === "seat" ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>

      {/* === Лимиты === */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-50">
            <Settings2 size={16} className="text-orange-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Лимиты планов</p>
            <p className="text-xs text-gray-500">Пустое поле = без лимита (∞)</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full text-sm min-w-[480px]">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Метрика</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-12">Вкл</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Free</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Pro</th>
                <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">Business</th>
              </tr>
            </thead>
            <tbody>
              {limits.map(row => (
                <tr key={row.key} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-2.5 text-sm text-gray-700">{LIMIT_LABELS[row.key] || row.key}</td>
                  <td className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={row.enabled}
                      onChange={e => toggleLimit(row.key, e.target.checked)}
                      className="rounded border-gray-300"
                    />
                  </td>
                  {(["free", "pro", "enterprise"] as PlanKey[]).map(plan => (
                    <td key={plan} className="px-3 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        disabled={!row.enabled}
                        value={row[plan] ?? ""}
                        placeholder="∞"
                        onChange={e => patchLimit(row.key, plan, e.target.value)}
                        className={`${inp} max-w-[80px] text-center disabled:opacity-50`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <button
          onClick={() => saveSection("limits", () => upsert("plan_limits", limits))}
          disabled={saving === "limits"}
          className={btnSave("limits")}
        >
          {saved === "limits" ? <><Check size={14} /> Сохранено</> : saving === "limits" ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>

      {/* === Фичи (списки) === */}
      <div className={card}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50">
            <Sparkles size={16} className="text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Фичи тарифов</p>
            <p className="text-xs text-gray-500">Список преимуществ, который видят клиенты на странице Billing</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(["free", "pro", "enterprise"] as PlanKey[]).map(plan => (
            <div key={plan} className="rounded-lg border border-gray-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan]}`}>
                  {names[plan]}
                </span>
              </div>
              <ul className="space-y-2 mb-3">
                {features[plan].map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-emerald-500 mt-0.5">✓</span>
                    <span className="flex-1">{f}</span>
                    <button
                      onClick={() => removeFeature(plan, i)}
                      className="text-gray-300 hover:text-red-500 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newFeat[plan]}
                  onChange={e => setNewFeat(prev => ({ ...prev, [plan]: e.target.value }))}
                  onKeyDown={e => e.key === "Enter" && addFeature(plan)}
                  placeholder="Добавить фичу..."
                  className={`${inp} text-sm`}
                />
                <button
                  onClick={() => addFeature(plan)}
                  className="inline-flex h-9 items-center justify-center rounded-lg bg-gray-900 px-2.5 text-white hover:bg-gray-800 transition-colors"
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => saveSection("features", () => upsert("plan_features", features))}
          disabled={saving === "features"}
          className={btnSave("features")}
        >
          {saved === "features" ? <><Check size={14} /> Сохранено</> : saving === "features" ? "Сохраняю..." : "Сохранить"}
        </button>
      </div>
    </div>
  );
}
