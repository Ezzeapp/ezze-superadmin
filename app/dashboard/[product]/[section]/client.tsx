"use client";
import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase, PRODUCTS, SECTIONS, LANGS, SECTION_SCHEMAS, type Lang } from "../../../lib/supabase";

// ─── Reusable field components ───────────────────────────────────────────────

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1.5">
      {children}
    </label>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  hint,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
}) {
  return (
    <div>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors"
      />
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function TextAreaInput({
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none transition-colors"
    />
  );
}

// ─── Hero form ────────────────────────────────────────────────────────────────

function HeroForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as Record<string, string>; }
    catch { return {} as Record<string, string>; }
  }, [value]);

  function update(key: string, val: string) {
    const next = { ...parsed, [key]: val };
    onChange(JSON.stringify(next, null, 2));
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Заголовок</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update("title", v)}
          placeholder="Платформа для мастеров красоты"
        />
      </div>
      <div>
        <FieldLabel>Подзаголовок</FieldLabel>
        <TextAreaInput
          value={parsed.subtitle || ""}
          onChange={(v) => update("subtitle", v)}
          placeholder="Принимайте записи онлайн 24/7, ведите клиентскую базу и статистику"
          rows={3}
        />
      </div>
      <div>
        <FieldLabel>Badge (метка над заголовком)</FieldLabel>
        <TextInput
          value={parsed.badge || ""}
          onChange={(v) => update("badge", v)}
          placeholder="Топ продукт"
          hint="Небольшой ярлык, который отображается над заголовком"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Текст кнопки</FieldLabel>
          <TextInput
            value={parsed.cta_text || ""}
            onChange={(v) => update("cta_text", v)}
            placeholder="Открыть приложение"
          />
        </div>
        <div>
          <FieldLabel>Ссылка кнопки</FieldLabel>
          <TextInput
            value={parsed.cta_url || ""}
            onChange={(v) => update("cta_url", v)}
            placeholder="https://beauty.ezze.site"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Features form ────────────────────────────────────────────────────────────

type FeatureItem = { title: string; description: string };

function FeaturesForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as { title?: string; items?: FeatureItem[] }; }
    catch { return {} as { title?: string; items?: FeatureItem[] }; }
  }, [value]);

  const items: FeatureItem[] = parsed.items || [];

  function update(next: { title?: string; items?: FeatureItem[] }) {
    onChange(JSON.stringify({ ...parsed, ...next }, null, 2));
  }

  function updateItem(idx: number, patch: Partial<FeatureItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    update({ items: next });
  }

  function addItem() {
    update({ items: [...items, { title: "", description: "" }] });
  }

  function removeItem(idx: number) {
    update({ items: items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Заголовок раздела</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update({ title: v })}
          placeholder="Возможности платформы"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Карточки возможностей</FieldLabel>
          <button
            onClick={addItem}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            + Добавить
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">#{idx + 1}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Удалить
                </button>
              </div>
              <TextInput
                value={item.title}
                onChange={(v) => updateItem(idx, { title: v })}
                placeholder="Онлайн-запись"
              />
              <TextAreaInput
                value={item.description}
                onChange={(v) => updateItem(idx, { description: v })}
                placeholder="Клиенты записываются сами 24/7"
                rows={2}
              />
            </div>
          ))}
          {items.length === 0 && (
            <button
              onClick={addItem}
              className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              + Добавить первую карточку
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FAQ form ─────────────────────────────────────────────────────────────────

type FaqItem = { question: string; answer: string };

function FaqForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as { title?: string; items?: FaqItem[] }; }
    catch { return {} as { title?: string; items?: FaqItem[] }; }
  }, [value]);

  const items: FaqItem[] = parsed.items || [];

  function update(next: { title?: string; items?: FaqItem[] }) {
    onChange(JSON.stringify({ ...parsed, ...next }, null, 2));
  }

  function updateItem(idx: number, patch: Partial<FaqItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    update({ items: next });
  }

  function addItem() {
    update({ items: [...items, { question: "", answer: "" }] });
  }

  function removeItem(idx: number) {
    update({ items: items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Заголовок раздела</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update({ title: v })}
          placeholder="Частые вопросы"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Вопросы и ответы</FieldLabel>
          <button
            onClick={addItem}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            + Добавить
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Вопрос #{idx + 1}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Удалить
                </button>
              </div>
              <TextInput
                value={item.question}
                onChange={(v) => updateItem(idx, { question: v })}
                placeholder="Как начать работу?"
              />
              <TextAreaInput
                value={item.answer}
                onChange={(v) => updateItem(idx, { answer: v })}
                placeholder="Зарегистрируйтесь и добавьте свои услуги..."
                rows={3}
              />
            </div>
          ))}
          {items.length === 0 && (
            <button
              onClick={addItem}
              className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              + Добавить первый вопрос
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CTA form ─────────────────────────────────────────────────────────────────

function CtaForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as Record<string, string>; }
    catch { return {} as Record<string, string>; }
  }, [value]);

  function update(key: string, val: string) {
    const next = { ...parsed, [key]: val };
    onChange(JSON.stringify(next, null, 2));
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Заголовок</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update("title", v)}
          placeholder="Готовы начать?"
        />
      </div>
      <div>
        <FieldLabel>Подзаголовок</FieldLabel>
        <TextAreaInput
          value={parsed.subtitle || ""}
          onChange={(v) => update("subtitle", v)}
          placeholder="Бесплатный тариф навсегда. Без карты."
          rows={2}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <FieldLabel>Текст кнопки</FieldLabel>
          <TextInput
            value={parsed.button_text || ""}
            onChange={(v) => update("button_text", v)}
            placeholder="Создать аккаунт"
          />
        </div>
        <div>
          <FieldLabel>Ссылка кнопки</FieldLabel>
          <TextInput
            value={parsed.button_url || ""}
            onChange={(v) => update("button_url", v)}
            placeholder="https://beauty.ezze.site/register"
          />
        </div>
      </div>
    </div>
  );
}

// ─── Meta / SEO form ──────────────────────────────────────────────────────────

function MetaForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as Record<string, string>; }
    catch { return {} as Record<string, string>; }
  }, [value]);

  function update(key: string, val: string) {
    const next = { ...parsed, [key]: val };
    onChange(JSON.stringify(next, null, 2));
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Title (вкладка браузера)</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update("title", v)}
          placeholder="Ezze Beauty — платформа для мастеров красоты"
          hint="Рекомендуется 50–60 символов"
        />
      </div>
      <div>
        <FieldLabel>Description (описание для поиска)</FieldLabel>
        <TextAreaInput
          value={parsed.description || ""}
          onChange={(v) => update("description", v)}
          placeholder="Онлайн-запись, клиентская база, аналитика. Бесплатно."
          rows={3}
        />
      </div>
      <div>
        <FieldLabel>Keywords (ключевые слова)</FieldLabel>
        <TextInput
          value={parsed.keywords || ""}
          onChange={(v) => update("keywords", v)}
          placeholder="мастер красоты, онлайн запись, салон"
          hint="Через запятую"
        />
      </div>
    </div>
  );
}

// ─── Reviews form ─────────────────────────────────────────────────────────────

type ReviewItem = { author: string; role: string; text: string; rating: number };

function ReviewsForm({
  value,
  onChange,
}: {
  value: string;
  onChange: (json: string) => void;
}) {
  const parsed = useMemo(() => {
    try { return JSON.parse(value || "{}") as { title?: string; items?: ReviewItem[] }; }
    catch { return {} as { title?: string; items?: ReviewItem[] }; }
  }, [value]);

  const items: ReviewItem[] = parsed.items || [];

  function update(next: { title?: string; items?: ReviewItem[] }) {
    onChange(JSON.stringify({ ...parsed, ...next }, null, 2));
  }

  function updateItem(idx: number, patch: Partial<ReviewItem>) {
    const next = items.map((it, i) => i === idx ? { ...it, ...patch } : it);
    update({ items: next });
  }

  function addItem() {
    update({ items: [...items, { author: "", role: "", text: "", rating: 5 }] });
  }

  function removeItem(idx: number) {
    update({ items: items.filter((_, i) => i !== idx) });
  }

  return (
    <div className="max-w-lg space-y-5">
      <div>
        <FieldLabel>Заголовок раздела</FieldLabel>
        <TextInput
          value={parsed.title || ""}
          onChange={(v) => update({ title: v })}
          placeholder="Отзывы клиентов"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Отзывы</FieldLabel>
          <button
            onClick={addItem}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
          >
            + Добавить
          </button>
        </div>
        <div className="space-y-3">
          {items.map((item, idx) => (
            <div key={idx} className="rounded-xl border border-gray-200 dark:border-gray-700 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Отзыв #{idx + 1}</span>
                <button
                  onClick={() => removeItem(idx)}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Удалить
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <TextInput
                  value={item.author}
                  onChange={(v) => updateItem(idx, { author: v })}
                  placeholder="Анна К."
                />
                <TextInput
                  value={item.role}
                  onChange={(v) => updateItem(idx, { role: v })}
                  placeholder="Мастер маникюра"
                />
              </div>
              <TextAreaInput
                value={item.text}
                onChange={(v) => updateItem(idx, { text: v })}
                placeholder="Отличное приложение! Клиенты записываются сами..."
                rows={2}
              />
              <div className="flex items-center gap-2">
                <FieldLabel>Рейтинг</FieldLabel>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => updateItem(idx, { rating: star })}
                      className={`text-lg leading-none transition-colors ${
                        star <= (item.rating || 5)
                          ? "text-yellow-400"
                          : "text-gray-300 dark:text-gray-600"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <button
              onClick={addItem}
              className="w-full py-6 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-sm text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              + Добавить первый отзыв
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section form router ──────────────────────────────────────────────────────

const FORM_SECTIONS = ["hero", "features", "faq", "cta", "meta", "reviews"];

function SectionForm({
  section,
  value,
  onChange,
}: {
  section: string;
  value: string;
  onChange: (json: string) => void;
}) {
  if (section === "hero")     return <HeroForm value={value} onChange={onChange} />;
  if (section === "features") return <FeaturesForm value={value} onChange={onChange} />;
  if (section === "faq")      return <FaqForm value={value} onChange={onChange} />;
  if (section === "cta")      return <CtaForm value={value} onChange={onChange} />;
  if (section === "meta")     return <MetaForm value={value} onChange={onChange} />;
  if (section === "reviews")  return <ReviewsForm value={value} onChange={onChange} />;
  return null;
}

// ─── Main editor ──────────────────────────────────────────────────────────────

export default function SectionEditorClient({
  product,
  section,
}: {
  product: string;
  section: string;
}) {
  const [activeLang, setActiveLang] = useState<Lang>("ru");

  const productInfo = PRODUCTS.find((p) => p.slug === product);
  const sectionInfo = SECTIONS.find((s) => s.slug === section);

  const [contents, setContents] = useState<Record<Lang, string>>({ ru: "", uz: "", en: "" });
  const [visibles, setVisibles] = useState<Record<Lang, boolean>>({ ru: true, uz: true, en: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [jsonError, setJsonError] = useState("");
  const [showRaw, setShowRaw] = useState(false);

  const hasForm = FORM_SECTIONS.includes(section);

  const loadData = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("landing_sections")
      .select("lang, content, visible")
      .eq("product", product)
      .eq("section", section);

    const newContents = { ru: "", uz: "", en: "" } as Record<Lang, string>;
    const newVisibles = { ru: true, uz: true, en: true } as Record<Lang, boolean>;
    for (const row of data || []) {
      const l = row.lang as Lang;
      newContents[l] = JSON.stringify(row.content, null, 2);
      newVisibles[l] = row.visible;
    }
    setContents(newContents);
    setVisibles(newVisibles);
    setLoading(false);
  }, [product, section]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleChange(value: string) {
    setContents((prev) => ({ ...prev, [activeLang]: value }));
    setJsonError("");
    setSaved(false);
  }

  async function handleSave() {
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents[activeLang] || "{}");
    } catch {
      setJsonError("Невалидный JSON. Исправьте ошибки перед сохранением.");
      return;
    }

    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("landing_sections").upsert(
      {
        product,
        section,
        lang: activeLang,
        content: parsed,
        visible: visibles[activeLang],
      },
      { onConflict: "product,section,lang" }
    );
    setSaving(false);
    if (error) {
      setJsonError("Ошибка сохранения: " + error.message);
    } else {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  }

  if (!productInfo || !sectionInfo) {
    return <div className="p-8 text-red-500">Секция не найдена</div>;
  }

  return (
    <div className="p-8 h-full flex flex-col">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 dark:text-gray-500 mb-6">
        <Link href="/dashboard" className="hover:text-gray-600 dark:hover:text-gray-300">Все продукты</Link>
        <span>/</span>
        <Link href={`/dashboard/${product}`} className="hover:text-gray-600 dark:hover:text-gray-300 flex items-center gap-1">
          {(() => { const Icon = productInfo.icon; return <Icon size={14} />; })()}
          {productInfo.label}
        </Link>
        <span>/</span>
        <span className="text-gray-700 dark:text-gray-200 font-medium">{sectionInfo.label}</span>
      </div>

      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Tabs + controls */}
        <div className="flex items-center border-b border-gray-200 dark:border-gray-700 px-4">
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeLang === lang
                  ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-4 pr-2">
            {hasForm && (
              <button
                onClick={() => setShowRaw((v) => !v)}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 underline transition-colors"
              >
                {showRaw ? "← Форма" : "JSON"}
              </button>
            )}
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={visibles[activeLang]}
                onChange={(e) =>
                  setVisibles((prev) => ({ ...prev, [activeLang]: e.target.checked }))
                }
                className="rounded"
              />
              Видимая
            </label>
          </div>
        </div>

        {/* Editor body */}
        <div className="flex-1 overflow-y-auto p-6">
          {section === "pricing" && (
            <div className="mb-4 p-3 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20">
              <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                <b>Цены подтягиваются автоматически</b> из «Тарифов» этого продукта (<code className="px-1 bg-white/50 dark:bg-black/20 rounded">app_settings.plan_prices</code>).
                Здесь редактируйте только <b>фичи тарифов, описания и заголовки</b>. Поля <code>price</code> в JSON можно не заполнять.{" "}
                <Link href={`/dashboard/tariffs?product=${product}`} className="underline hover:text-indigo-700 dark:hover:text-indigo-100">
                  Открыть тарифы →
                </Link>
              </p>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Загрузка...</div>
          ) : hasForm && !showRaw ? (
            // ── Visual form ──
            <SectionForm
              section={section}
              value={contents[activeLang]}
              onChange={handleChange}
            />
          ) : (
            // ── Raw JSON fallback ──
            <div className="flex flex-col h-full">
              <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                Контент в формате JSON. Поля зависят от секции — редактируйте свободно.
              </p>
              <textarea
                value={contents[activeLang]}
                onChange={(e) => handleChange(e.target.value)}
                className={`flex-1 w-full font-mono text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-64 ${
                  jsonError
                    ? "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950/30"
                    : "border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                }`}
                placeholder={SECTION_SCHEMAS[section] || '{\n  "title": "Заголовок"\n}'}
                spellCheck={false}
              />
              {jsonError && (
                <p className="mt-2 text-sm text-red-600 dark:text-red-400">{jsonError}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400 dark:text-gray-500">
            Изменения применяются на ezze.site после следующего деплоя ezze-landing
          </p>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              saved
                ? "bg-green-600 text-white"
                : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
            }`}
          >
            {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
