"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, X, Zap } from "lucide-react";
import { supabase } from "../../lib/supabase";
import {
  FEATURES, SECTION_LABELS, PLAN_LABELS, PLAN_COLORS, PLAN_ORDER,
  type FeaturePlan, type FeatureSection,
} from "../../lib/features";

interface FeatureFlag {
  id?: string;
  key: string;
  enabled: boolean;
  min_plan: FeaturePlan;
  overrides: string[];
  blocked_users: string[];
  product: string;
}

export default function FeaturesTab({ product }: { product: string }) {
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null); // key текущей правки
  const [search, setSearch] = useState("");

  // ── Загрузка флагов для конкретного продукта ─────────────────────────────
  useEffect(() => {
    setLoading(true);
    supabase
      .from("feature_flags")
      .select("*")
      .eq("product", product)
      .order("key")
      .then(({ data }) => {
        setFlags((data ?? []) as FeatureFlag[]);
        setLoading(false);
      });
  }, [product]);

  // ── Получить текущее состояние флага (DB or default) ─────────────────────
  const flagsByKey = useMemo(
    () => new Map(flags.map((f) => [f.key, f])),
    [flags]
  );

  function getFlag(key: string): FeatureFlag {
    const cfg = FEATURES.find((f) => f.key === key)!;
    const db = flagsByKey.get(key);
    return (
      db ?? {
        key,
        enabled: true,
        min_plan: cfg.defaultPlan,
        overrides: [],
        blocked_users: [],
        product,
      }
    );
  }

  // ── Upsert флага ─────────────────────────────────────────────────────────
  async function upsertFlag(next: FeatureFlag) {
    setSaving(next.key);
    const { data, error } = await supabase
      .from("feature_flags")
      .upsert(
        { ...next, flag_name: next.key, product },
        { onConflict: "product,key" }
      )
      .select()
      .single();
    setSaving(null);

    if (error) {
      alert("Ошибка сохранения: " + error.message);
      return;
    }
    setFlags((prev) => {
      const map = new Map(prev.map((f) => [f.key, f]));
      map.set(next.key, data as FeatureFlag);
      return Array.from(map.values());
    });
  }

  async function handleToggleEnabled(key: string) {
    const flag = getFlag(key);
    await upsertFlag({ ...flag, enabled: !flag.enabled });
  }

  async function handlePlanChange(key: string, plan: FeaturePlan) {
    const flag = getFlag(key);
    await upsertFlag({ ...flag, min_plan: plan });
  }

  // ── Фильтрация по поиску ─────────────────────────────────────────────────
  const query = search.trim().toLowerCase();
  const filtered = query
    ? FEATURES.filter(
        (f) =>
          f.label.toLowerCase().includes(query) ||
          f.description.toLowerCase().includes(query) ||
          f.key.toLowerCase().includes(query)
      )
    : null;

  // ── Группы по секциям (если без поиска) ──────────────────────────────────
  const sections = Array.from(
    new Set(FEATURES.map((f) => f.section))
  ) as FeatureSection[];

  if (loading) {
    return <div className="text-sm text-gray-400 py-8 text-center">Загрузка...</div>;
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Включение/выключение фич и минимальный тариф для продукта{" "}
        <span className="font-medium text-gray-900 dark:text-white">{product}</span>.
        Изменения видны мастерам сразу.
      </p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или ключу"
          className="w-full pl-9 pr-9 h-9 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {filtered &&
        (filtered.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">Ничего не найдено</p>
        ) : (
          <div className="space-y-1">
            {filtered.map((f) => (
              <FeatureRow
                key={f.key}
                featureKey={f.key}
                showSection
                getFlag={getFlag}
                saving={saving === f.key}
                onToggle={() => handleToggleEnabled(f.key)}
                onPlanChange={(plan) => handlePlanChange(f.key, plan)}
              />
            ))}
          </div>
        ))}

      {!filtered &&
        sections.map((section) => {
          const list = FEATURES.filter((f) => f.section === section);
          return (
            <div key={section} className="space-y-1">
              <div className="flex items-center gap-2 pb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  {SECTION_LABELS[section]}
                </h3>
                <span className="text-xs text-gray-400">({list.length})</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
              </div>
              {list.map((f) => (
                <FeatureRow
                  key={f.key}
                  featureKey={f.key}
                  getFlag={getFlag}
                  saving={saving === f.key}
                  onToggle={() => handleToggleEnabled(f.key)}
                  onPlanChange={(plan) => handlePlanChange(f.key, plan)}
                />
              ))}
            </div>
          );
        })}
    </div>
  );
}

// ── Строка фичи ─────────────────────────────────────────────────────────────

function FeatureRow({
  featureKey,
  showSection,
  getFlag,
  saving,
  onToggle,
  onPlanChange,
}: {
  featureKey: string;
  showSection?: boolean;
  getFlag: (key: string) => FeatureFlag;
  saving: boolean;
  onToggle: () => void;
  onPlanChange: (plan: FeaturePlan) => void;
}) {
  const cfg = FEATURES.find((f) => f.key === featureKey)!;
  const flag = getFlag(featureKey);
  const enabled = flag.enabled;

  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all ${
        enabled
          ? "bg-white dark:bg-gray-950 border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700"
          : "bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-800 opacity-60"
      }`}
    >
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${
          enabled ? "bg-indigo-100 dark:bg-indigo-900/30" : "bg-gray-100 dark:bg-gray-800"
        }`}
      >
        <Zap
          size={14}
          className={enabled ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
            {cfg.label}
          </p>
          {showSection && (
            <span className="shrink-0 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full border border-gray-200 dark:border-gray-700">
              {SECTION_LABELS[cfg.section]}
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate leading-tight mt-0.5">
          {cfg.description}
        </p>
      </div>

      <select
        value={flag.min_plan}
        onChange={(e) => onPlanChange(e.target.value as FeaturePlan)}
        disabled={!enabled || saving}
        className="h-7 w-[90px] text-xs rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 disabled:opacity-50"
      >
        {PLAN_ORDER.map((plan) => (
          <option key={plan} value={plan}>
            {PLAN_LABELS[plan]}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={onToggle}
        disabled={saving}
        className={`shrink-0 inline-flex h-5 w-9 items-center rounded-full transition-colors ${
          enabled ? "bg-indigo-600" : "bg-gray-300 dark:bg-gray-700"
        } disabled:opacity-50`}
        title={enabled ? "Выключить" : "Включить"}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? "translate-x-4" : "translate-x-0.5"
          }`}
        />
      </button>

      <span
        className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded ${PLAN_COLORS[flag.min_plan]}`}
      >
        {PLAN_LABELS[flag.min_plan]}
      </span>
    </div>
  );
}
