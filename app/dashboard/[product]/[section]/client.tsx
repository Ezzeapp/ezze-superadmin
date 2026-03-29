"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase, PRODUCTS, SECTIONS, LANGS, type Lang } from "../../../lib/supabase";

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

  function handleTextChange(value: string) {
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
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-gray-600">Все продукты</Link>
        <span>/</span>
        <Link href={`/dashboard/${product}`} className="hover:text-gray-600">
          {productInfo.icon} {productInfo.label}
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{sectionInfo.label}</span>
      </div>

      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center border-b border-gray-200 px-4">
          {LANGS.map((lang) => (
            <button
              key={lang}
              onClick={() => setActiveLang(lang)}
              className={`px-5 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeLang === lang
                  ? "border-indigo-600 text-indigo-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
          <div className="ml-auto flex items-center gap-3 pr-2">
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
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

        <div className="flex-1 flex flex-col p-4">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Загрузка...</div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-2">
                Контент в формате JSON. Поля зависят от секции — редактируйте свободно.
              </p>
              <textarea
                value={contents[activeLang]}
                onChange={(e) => handleTextChange(e.target.value)}
                className={`flex-1 w-full font-mono text-sm border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-64 ${
                  jsonError ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder={'{\n  "title": "Заголовок",\n  "subtitle": "Подзаголовок"\n}'}
                spellCheck={false}
              />
              {jsonError && (
                <p className="mt-2 text-sm text-red-600">{jsonError}</p>
              )}
            </>
          )}
        </div>

        <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
          <p className="text-xs text-gray-400">
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
            {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
