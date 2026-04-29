"use client";
/**
 * Тарифы и платежи — per-product настройки.
 *
 * Что редактируется (для каждого продукта отдельно, ключ UNIQUE(product,key)):
 *  - plan_names      — отображаемые названия тарифов
 *  - plan_prices     — стоимость подписки в UZS
 *  - plan_limits     — лимиты функционала (массив строк)
 *  - plan_features   — списки фич, отображаемых на странице Billing
 *  - payment_providers       — какие провайдеры включены (['payme','click'])
 *  - payme_merchant_id, payme_key
 *  - click_service_id, click_merchant_id, click_user_id, click_merchant_key
 *
 * Хранение: app_settings c UNIQUE(product, key).
 * Подписки фильтруются по users.product через FK join.
 */
import { useState, useEffect, useMemo } from "react";
import { CreditCard, Settings2, ListChecks, RefreshCw, Plus, X, Zap } from "lucide-react";
import { supabase, PRODUCTS } from "../../../lib/supabase";

type PlanNames = { free: string; pro: string; enterprise: string };
type PlanPrices = { free: number; pro: number; enterprise: number };
type PlanLimit = { key: string; enabled: boolean; free: number | null; pro: number | null; enterprise: number | null };
type PlanFeatures = { free: string[]; pro: string[]; enterprise: string[] };

const DEFAULT_NAMES: PlanNames = { free: "Free", pro: "Pro", enterprise: "Business" };
const DEFAULT_PRICES: PlanPrices = { free: 0, pro: 99000, enterprise: 199000 };
const DEFAULT_LIMITS: PlanLimit[] = [
  { key: "clients", enabled: true, free: 50, pro: null, enterprise: null },
  { key: "services", enabled: true, free: 20, pro: null, enterprise: null },
  { key: "appts_month", enabled: true, free: 100, pro: null, enterprise: null },
];
const DEFAULT_FEATURES: PlanFeatures = { free: [], pro: [], enterprise: [] };
const LIMIT_LABELS: Record<string, string> = {
  clients: "Клиенты",
  services: "Услуги",
  appts_month: "Записей/месяц",
};
const PLAN_COLORS: Record<string, string> = {
  free: "text-gray-600 bg-gray-100",
  pro: "text-indigo-700 bg-indigo-100",
  enterprise: "text-purple-700 bg-purple-100",
};

// Список продуктов в селекторе — без "main" (это лендинг, не приложение)
const PRODUCT_OPTIONS = PRODUCTS.filter(p => p.slug !== "main");
const LS_PRODUCT_KEY = "sa_billing_product";

function parseJSON<T>(raw: any, fallback: T): T {
  if (raw == null) return fallback;
  if (typeof raw === "object") return raw as T;
  try { return JSON.parse(String(raw)) as T; }
  catch { return fallback; }
}

export default function BillingSettingsPage() {
  // Текущий выбранный продукт (per-product настройки)
  const [product, setProduct] = useState<string>(() => {
    if (typeof window === "undefined") return PRODUCT_OPTIONS[0]?.slug ?? "beauty";
    return localStorage.getItem(LS_PRODUCT_KEY) || PRODUCT_OPTIONS[0]?.slug || "beauty";
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const [names, setNames] = useState<PlanNames>(DEFAULT_NAMES);
  const [prices, setPrices] = useState<PlanPrices>(DEFAULT_PRICES);
  const [limits, setLimits] = useState<PlanLimit[]>(DEFAULT_LIMITS);
  const [features, setFeatures] = useState<PlanFeatures>(DEFAULT_FEATURES);
  const [newFeat, setNewFeat] = useState({ free: "", pro: "", enterprise: "" });

  const [providers, setProviders] = useState<string[]>([]);
  const [paymeMerchant, setPaymeMerchant] = useState("");
  const [paymeKey, setPaymeKey] = useState("");
  const [clickService, setClickService] = useState("");
  const [clickMerchant, setClickMerchant] = useState("");
  const [clickKey, setClickKey] = useState("");
  const [clickUserId, setClickUserId] = useState("");
  const [existingKeys, setExistingKeys] = useState<Record<string, boolean>>({});

  const [subs, setSubs] = useState<any[]>([]);

  const productLabel = useMemo(
    () => PRODUCT_OPTIONS.find(p => p.slug === product)?.label ?? product,
    [product]
  );

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(LS_PRODUCT_KEY, product);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product]);

  async function loadAll() {
    setLoading(true);
    try {
      const { data: settings } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("product", product)
        .in("key", [
          "plan_names", "plan_prices", "plan_limits", "plan_features", "payment_providers",
          "payme_merchant_id", "click_service_id", "click_merchant_id", "click_user_id",
          "payme_key", "click_merchant_key",
        ]);

      // Reset to defaults — иначе при переключении продукта останутся данные предыдущего
      setNames(DEFAULT_NAMES);
      setPrices(DEFAULT_PRICES);
      setLimits(DEFAULT_LIMITS);
      setFeatures(DEFAULT_FEATURES);
      setProviders([]);
      setPaymeMerchant("");
      setPaymeKey("");
      setClickService("");
      setClickMerchant("");
      setClickUserId("");
      setClickKey("");

      const existing: Record<string, boolean> = {};
      (settings ?? []).forEach((s: any) => {
        if (s.key === "plan_names") setNames({ ...DEFAULT_NAMES, ...parseJSON(s.value, {}) });
        if (s.key === "plan_prices") setPrices({ ...DEFAULT_PRICES, ...parseJSON(s.value, {}) });
        if (s.key === "plan_limits") setLimits(parseJSON(s.value, DEFAULT_LIMITS));
        if (s.key === "plan_features") setFeatures({ ...DEFAULT_FEATURES, ...parseJSON(s.value, {}) });
        if (s.key === "payment_providers") setProviders(parseJSON(s.value, []));
        if (
          ["payme_merchant_id", "click_service_id", "click_merchant_id", "click_user_id", "payme_key", "click_merchant_key"].includes(s.key)
          && s.value
        ) existing[s.key] = true;
      });
      setExistingKeys(existing);

      // Подписки — фильтруем через users.product (FK join)
      const { data: subsData } = await supabase
        .from("subscriptions")
        .select("id, plan, provider, amount_uzs, status, expires_at, user_id, users!inner(product)")
        .eq("users.product", product)
        .order("created_at", { ascending: false })
        .limit(20);
      setSubs(subsData ?? []);
    } finally {
      setLoading(false);
    }
  }

  async function upsert(key: string, value: string) {
    const { error } = await supabase
      .from("app_settings")
      .upsert({ product, key, value }, { onConflict: "product,key" });
    if (error) throw error;
  }

  async function saveSection(section: string, fn: () => Promise<void>) {
    setSaving(section);
    try {
      await fn();
      setSaved(section);
      setTimeout(() => setSaved(s => s === section ? null : s), 2000);
    } catch (e) {
      console.error("Save error:", e);
      alert(`Ошибка сохранения: ${(e as Error).message}`);
    } finally {
      setSaving(null);
    }
  }

  async function toggleProvider(provider: string, enabled: boolean) {
    const next = enabled
      ? [...providers.filter(p => p !== provider), provider]
      : providers.filter(p => p !== provider);
    setProviders(next);
    await upsert("payment_providers", JSON.stringify(next));
  }

  const patchLimit = (key: string, plan: string, val: string) =>
    setLimits(prev => prev.map(r => r.key === key ? { ...r, [plan]: val === "" ? null : parseInt(val) || 0 } : r));
  const toggleLimit = (key: string, v: boolean) =>
    setLimits(prev => prev.map(r => r.key === key ? { ...r, enabled: v } : r));
  const addFeature = (plan: keyof PlanFeatures) => {
    const text = newFeat[plan].trim();
    if (!text) return;
    setFeatures(prev => ({ ...prev, [plan]: [...prev[plan], text] }));
    setNewFeat(prev => ({ ...prev, [plan]: "" }));
  };
  const removeFeature = (plan: keyof PlanFeatures, i: number) =>
    setFeatures(prev => ({ ...prev, [plan]: prev[plan].filter((_, idx) => idx !== i) }));

  // Shared styles
  const inp = "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400";
  const card = "rounded-xl border border-gray-200 bg-white shadow-sm";
  const section = `${card} p-6 space-y-5`;
  const btnSave = (s: string) =>
    `inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${saved === s ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`;
  const btnOutline = "inline-flex h-8 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50";

  return (
    <div className="p-8 max-w-3xl space-y-6">
      {/* Header + product selector */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Тарифы и платежи</h1>
          <p className="text-sm text-gray-500 mt-1">
            Per-product: ценами, лимитами и платёжными провайдерами управляются отдельно для каждого продукта
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Продукт:</span>
          <select
            value={product}
            onChange={e => setProduct(e.target.value)}
            className="h-9 rounded-lg border border-gray-200 bg-white px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PRODUCT_OPTIONS.map(p => (
              <option key={p.slug} value={p.slug}>{p.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Подсказка про текущий продукт */}
      <div className="rounded-lg border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
        Сейчас редактируете <span className="font-semibold">{productLabel}</span>.
        Все настройки ниже сохраняются для этого продукта отдельно.
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse space-y-3">
              <div className="h-5 bg-gray-100 rounded w-40" />
              <div className="h-9 bg-gray-100 rounded" />
              <div className="h-9 bg-gray-100 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* === Названия тарифов === */}
          <div className={section}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50">
                <Settings2 size={16} className="text-violet-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Названия тарифов</p>
                <p className="text-xs text-gray-500">Отображаемые названия тарифных планов</p>
              </div>
            </div>

            <div className="space-y-3">
              {(["free", "pro", "enterprise"] as const).map((plan) => (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center ${PLAN_COLORS[plan]}`}>
                    {plan.charAt(0).toUpperCase() + plan.slice(1)}
                  </span>
                  <input
                    type="text"
                    value={names[plan]}
                    onChange={e => setNames(prev => ({ ...prev, [plan]: e.target.value }))}
                    placeholder={plan.charAt(0).toUpperCase() + plan.slice(1)}
                    className={`${inp} w-48`}
                  />
                </div>
              ))}
            </div>

            <div>
              <button
                onClick={() => saveSection("names", () => upsert("plan_names", JSON.stringify(names)))}
                disabled={saving === "names"}
                className={btnSave("names")}
              >
                {saved === "names" ? "Сохранено ✓" : saving === "names" ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {/* === Цены === */}
          <div className={section}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <CreditCard size={16} className="text-indigo-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Цены планов</p>
                <p className="text-xs text-gray-500">Стоимость подписки в UZS в месяц</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { plan: "free", label: names.free || "Free", disabled: true },
                { plan: "pro", label: names.pro || "Pro" },
                { plan: "enterprise", label: names.enterprise || "Business" },
              ].map(({ plan, label, disabled }) => (
                <div key={plan} className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-24 text-center ${PLAN_COLORS[plan]}`}>
                    {label}
                  </span>
                  <input
                    type="number"
                    min={0}
                    disabled={disabled}
                    value={plan === "free" ? 0 : plan === "pro" ? prices.pro : prices.enterprise}
                    onChange={e => setPrices(prev => ({ ...prev, [plan]: parseInt(e.target.value) || 0 }))}
                    className={`${inp} w-40`}
                  />
                  <span className="text-xs text-gray-400">UZS</span>
                  {!disabled && (
                    <span className="text-xs text-gray-400 hidden sm:block">
                      ≈ {((plan === "pro" ? prices.pro : prices.enterprise) / 1000).toFixed(0)} тыс.
                    </span>
                  )}
                </div>
              ))}
            </div>

            <div>
              <button
                onClick={() => saveSection("prices", () => upsert("plan_prices", JSON.stringify(prices)))}
                disabled={saving === "prices"}
                className={btnSave("prices")}
              >
                {saved === "prices" ? "Сохранено ✓" : saving === "prices" ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {/* === Лимиты === */}
          <div className={section}>
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
              <table className="w-full text-sm min-w-[440px]">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">Метрика</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500 w-12">Вкл</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">{names.free || "Free"}</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">{names.pro || "Pro"}</th>
                    <th className="text-center px-3 py-2.5 text-xs font-medium text-gray-500">{names.enterprise || "Business"}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {limits.map(row => (
                    <tr key={row.key} className={!row.enabled ? "opacity-40" : ""}>
                      <td className="px-4 py-2.5 text-xs font-medium text-gray-700">{LIMIT_LABELS[row.key] ?? row.key}</td>
                      <td className="px-3 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={row.enabled}
                          onChange={e => toggleLimit(row.key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      {(["free", "pro", "enterprise"] as const).map(plan => (
                        <td key={plan} className="px-2 py-2">
                          <input
                            type="number"
                            min={0}
                            placeholder="∞"
                            value={row[plan] === null ? "" : String(row[plan])}
                            onChange={e => patchLimit(row.key, plan, e.target.value)}
                            disabled={!row.enabled}
                            className="flex h-7 w-16 mx-auto rounded-md border border-gray-200 bg-white px-2 text-center text-xs shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div>
              <button
                onClick={() => saveSection("limits", () => upsert("plan_limits", JSON.stringify(limits)))}
                disabled={saving === "limits"}
                className={btnSave("limits")}
              >
                {saved === "limits" ? "Сохранено ✓" : saving === "limits" ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {/* === Функции === */}
          <div className={section}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-50">
                <ListChecks size={16} className="text-green-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">Функции тарифов</p>
                <p className="text-xs text-gray-500">Список возможностей, отображаемый на странице тарифов</p>
              </div>
            </div>

            <div className="space-y-5">
              {(["free", "pro", "enterprise"] as const).map(plan => (
                <div key={plan} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[plan]}`}>
                      {names[plan] || plan.charAt(0).toUpperCase() + plan.slice(1)}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {features[plan].length === 0 ? (
                      <p className="text-xs text-gray-400 italic py-1">Нет функций — добавьте ниже</p>
                    ) : (
                      features[plan].map((f, i) => (
                        <div key={i} className="flex items-center gap-2 group">
                          <span className="flex-1 text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-1.5">{f}</span>
                          <button
                            onClick={() => removeFeature(plan, i)}
                            className="opacity-0 group-hover:opacity-100 h-7 w-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                          >
                            <X size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={newFeat[plan]}
                      onChange={e => setNewFeat(prev => ({ ...prev, [plan]: e.target.value }))}
                      onKeyDown={e => e.key === "Enter" && addFeature(plan)}
                      placeholder="Добавить функцию..."
                      className={`${inp} flex-1`}
                    />
                    <button
                      onClick={() => addFeature(plan)}
                      disabled={!newFeat[plan].trim()}
                      className={`${btnOutline} px-2.5`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div>
              <button
                onClick={() => saveSection("features", () => upsert("plan_features", JSON.stringify(features)))}
                disabled={saving === "features"}
                className={btnSave("features")}
              >
                {saved === "features" ? "Сохранено ✓" : saving === "features" ? "Сохраняю..." : "Сохранить"}
              </button>
            </div>
          </div>

          {/* === Провайдеры === */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Zap size={15} className="text-indigo-500" />
              Платёжные провайдеры
              <span className="text-xs font-normal text-gray-400">— для {productLabel}</span>
            </h2>
            <div className="space-y-3">
              {/* Payme */}
              {renderProvider(
                "payme", "Payme", "paycom.uz", "#00A884", providers, toggleProvider,
                [
                  { label: "Merchant ID", key: "payme_merchant_id", value: paymeMerchant, onChange: setPaymeMerchant, existing: existingKeys },
                  { label: "Secret Key", key: "payme_key", value: paymeKey, onChange: setPaymeKey, existing: existingKeys, password: true },
                ],
                () => saveSection("payme", async () => {
                  if (paymeMerchant) await upsert("payme_merchant_id", paymeMerchant);
                  if (paymeKey) await upsert("payme_key", paymeKey);
                  setPaymeMerchant(""); setPaymeKey("");
                  await loadAll();
                }),
                saving === "payme", saved === "payme",
                !paymeMerchant && !paymeKey
              )}

              {/* Click */}
              {renderProvider(
                "click", "Click.uz", "click.uz", "#0066CC", providers, toggleProvider,
                [
                  { label: "Service ID", key: "click_service_id", value: clickService, onChange: setClickService, existing: existingKeys },
                  { label: "Merchant ID", key: "click_merchant_id", value: clickMerchant, onChange: setClickMerchant, existing: existingKeys },
                  { label: "Merchant User ID", key: "click_user_id", value: clickUserId, onChange: setClickUserId, existing: existingKeys },
                  { label: "Secret Key", key: "click_merchant_key", value: clickKey, onChange: setClickKey, existing: existingKeys, password: true },
                ],
                () => saveSection("click", async () => {
                  if (clickService) await upsert("click_service_id", clickService);
                  if (clickMerchant) await upsert("click_merchant_id", clickMerchant);
                  if (clickUserId) await upsert("click_user_id", clickUserId);
                  if (clickKey) await upsert("click_merchant_key", clickKey);
                  setClickService(""); setClickMerchant(""); setClickUserId(""); setClickKey("");
                  await loadAll();
                }),
                saving === "click", saved === "click",
                !clickService && !clickMerchant && !clickUserId && !clickKey
              )}
            </div>
          </div>

          {/* === Подписки === */}
          <div className={section}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50">
                  <RefreshCw size={16} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Активные подписки</p>
                  <p className="text-xs text-gray-500">Последние 20 подписок продукта «{productLabel}»</p>
                </div>
              </div>
              <button onClick={loadAll} className={btnOutline} title="Обновить">
                <RefreshCw size={13} />
              </button>
            </div>

            {subs.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">Нет подписок</div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      {["Пользователь", "План", "Провайдер", "Сумма", "Статус", "Истекает"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 text-xs font-medium text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {subs.map(sub => (
                      <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-xs font-mono text-gray-500">{sub.user_id?.slice(0, 8)}…</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PLAN_COLORS[sub.plan] ?? "bg-gray-100 text-gray-600"}`}>
                            {sub.plan}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs uppercase text-gray-500">{sub.provider}</td>
                        <td className="px-4 py-3 text-xs text-gray-700">{sub.amount_uzs?.toLocaleString("ru")} UZS</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            sub.status === "active" ? "bg-emerald-100 text-emerald-700" :
                            sub.status === "cancelled" ? "bg-red-100 text-red-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{sub.status}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">
                          {sub.expires_at ? new Date(sub.expires_at).toLocaleDateString("ru-RU") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Helper — render payment provider card
function renderProvider(
  id: string, name: string, domain: string, color: string,
  providers: string[],
  toggleProvider: (id: string, v: boolean) => void,
  fields: Array<{ label: string; key: string; value: string; onChange: (v: string) => void; existing?: Record<string, boolean>; password?: boolean }>,
  onSave: () => void,
  isSaving: boolean, isSaved: boolean, disabled: boolean
) {
  const enabled = providers.includes(id);
  const inp = "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const btnSave = `inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${isSaved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg border border-gray-200 flex items-center justify-center text-xs font-bold" style={{ color }}>
            {name[0]}
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">{name}</p>
            <p className="text-xs text-gray-400">{domain}</p>
          </div>
        </div>
        <button
          onClick={() => toggleProvider(id, !enabled)}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabled ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {enabled && (
        <div className="space-y-3 pt-3 border-t border-gray-100">
          {fields.map(f => (
            <div key={f.key} className="space-y-1.5">
              <label className="text-xs font-medium text-gray-600">{f.label}</label>
              <input
                type={f.password ? "password" : "text"}
                placeholder={f.existing?.[f.key] ? "••••••  (уже задан)" : "Не задан"}
                value={f.value}
                onChange={e => f.onChange(e.target.value)}
                className={inp}
              />
            </div>
          ))}
          <button onClick={onSave} disabled={disabled || isSaving} className={btnSave}>
            {isSaved ? "Сохранено ✓" : isSaving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      )}
    </div>
  );
}
