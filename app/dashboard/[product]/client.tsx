"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase, PRODUCTS, SECTIONS, LANGS } from "../../lib/supabase";

interface SectionRow { section: string; lang: string; visible: boolean; }

export default function ProductClient({ product }: { product: string }) {
  const productInfo = PRODUCTS.find((p) => p.slug === product);
  const [rows, setRows] = useState<SectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("landing_sections")
      .select("section, lang, visible")
      .eq("product", product)
      .then(({ data }) => { setRows(data || []); setLoading(false); });
  }, [product]);

  function hasRow(section: string, lang: string) {
    return rows.some((r) => r.section === section && r.lang === lang);
  }

  if (!productInfo) return <div className="p-8 text-red-500">Продукт не найден</div>;

  const Icon = productInfo.icon;

  return (
    <div className="p-8">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">← Все продукты</Link>
        <span className="text-gray-300 dark:text-gray-600">/</span>
        <Icon size={20} className="text-indigo-600 dark:text-indigo-400" />
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{productInfo.label}</h1>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="text-left px-5 py-3 font-medium text-gray-600 dark:text-gray-400">Секция</th>
              {LANGS.map((lang) => (
                <th key={lang} className="text-center px-4 py-3 font-medium text-gray-600 dark:text-gray-400 w-24">{lang.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {SECTIONS.map((s) => (
              <tr key={s.slug} className="hover:bg-gray-50 dark:hover:bg-gray-800/60">
                <td className="px-5 py-3 font-medium text-gray-800 dark:text-gray-200">{s.label}</td>
                {LANGS.map((lang) => {
                  const exists = hasRow(s.slug, lang);
                  return (
                    <td key={lang} className="px-4 py-3 text-center">
                      <Link
                        href={`/dashboard/${product}/${s.slug}/?lang=${lang}`}
                        className={`inline-block px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          exists
                            ? "bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-500 dark:hover:bg-gray-700"
                        }`}
                      >
                        {exists ? "Изменить" : "+ Создать"}
                      </Link>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="p-4 text-center text-sm text-gray-400">Загрузка...</div>}
      </div>
    </div>
  );
}
