"use client";
import { useState, useEffect } from "react";
import { Sun, Moon, Check } from "lucide-react";
import { supabase } from "../../lib/supabase";

// Color presets — shades 50/100/300/500/600/700
const COLORS = [
  { name: "Indigo",  50:"#eef2ff", 100:"#e0e7ff", 300:"#a5b4fc", 500:"#6366f1", 600:"#4f46e5", 700:"#4338ca" },
  { name: "Violet",  50:"#f5f3ff", 100:"#ede9fe", 300:"#c4b5fd", 500:"#8b5cf6", 600:"#7c3aed", 700:"#6d28d9" },
  { name: "Blue",    50:"#eff6ff", 100:"#dbeafe", 300:"#93c5fd", 500:"#3b82f6", 600:"#2563eb", 700:"#1d4ed8" },
  { name: "Teal",    50:"#f0fdfa", 100:"#ccfbf1", 300:"#5eead4", 500:"#14b8a6", 600:"#0d9488", 700:"#0f766e" },
  { name: "Rose",    50:"#fff1f2", 100:"#ffe4e6", 300:"#fda4af", 500:"#f43f5e", 600:"#e11d48", 700:"#be123c" },
  { name: "Amber",   50:"#fffbeb", 100:"#fef3c7", 300:"#fcd34d", 500:"#f59e0b", 600:"#d97706", 700:"#b45309" },
] as const;

type ColorPreset = typeof COLORS[number];

function applyColor(c: ColorPreset) {
  const el = document.documentElement;
  el.style.setProperty("--color-indigo-50",  c[50]);
  el.style.setProperty("--color-indigo-100", c[100]);
  el.style.setProperty("--color-indigo-300", c[300]);
  el.style.setProperty("--color-indigo-500", c[500]);
  el.style.setProperty("--color-indigo-600", c[600]);
  el.style.setProperty("--color-indigo-700", c[700]);
  localStorage.setItem("sa_color", JSON.stringify({
    50: c[50], 100: c[100], 300: c[300],
    500: c[500], 600: c[600], 700: c[700],
  }));
  // Update superadmin favicon color immediately
  if (typeof window !== "undefined" && (window as any).__updateFavicon) {
    (window as any).__updateFavicon(c[500]);
  }
}

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("sa_theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("sa_theme", "light");
  }
}

// Favicon SVG preview — inline SVG with CSS styles (higher priority than presentation attributes)
function FaviconPreview({ color, size = 40 }: { color: string; size?: number }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 32 32"
      style={{ width: size, height: size, minWidth: size, minHeight: size, borderRadius: 6, flexShrink: 0, display: "block" }}
    >
      <rect width="32" height="32" style={{ fill: color }} />
      <polygon points="17.3,2.7 4,18.7 16,18.7 14.7,29.3 28,13.3 16,13.3" style={{ fill: "white" }} />
    </svg>
  );
}

export default function SettingsPage() {
  const [isDark, setIsDark] = useState(false);
  const [activeColor, setActiveColor] = useState("Indigo");

  // Platform color (stored in Supabase app_settings as JSON with all shades)
  const [faviconColor, setFaviconColor] = useState("#6366f1");
  const [activeFaviconColor, setActiveFaviconColor] = useState("Indigo");
  const [faviconColorObj, setFaviconColorObj] = useState<ColorPreset | null>(null);
  const [faviconSaving, setFaviconSaving] = useState(false);
  const [faviconSaved, setFaviconSaved] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const saved = localStorage.getItem("sa_color");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        const found = COLORS.find((c) => c[600] === p[600]);
        if (found) setActiveColor(found.name);
      } catch { /* ignore */ }
    }

    // Load platform color (all shades) from Supabase
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "platform_color")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          // value is TEXT in DB — may come back as string or object
          let v: Record<string, string>;
          try {
            v = typeof data.value === "string" ? JSON.parse(data.value) : (data.value as Record<string, string>);
          } catch { v = {}; }
          const hex500 = v["500"] ?? "#6366f1";
          setFaviconColor(hex500);
          const found = COLORS.find((c) => c[500] === hex500);
          if (found) { setActiveFaviconColor(found.name); setFaviconColorObj(found); }
        } else {
          // fallback: old platform_favicon_color
          supabase.from("app_settings").select("value").eq("key", "platform_favicon_color").single()
            .then(({ data: d2 }) => {
              if (d2?.value) {
                setFaviconColor(d2.value as string);
                const found = COLORS.find((c) => c[500] === d2.value);
                if (found) { setActiveFaviconColor(found.name); setFaviconColorObj(found); }
              }
            });
        }
      });
  }, []);

  function toggleTheme(dark: boolean) {
    setIsDark(dark);
    applyTheme(dark);
  }

  function pickColor(c: ColorPreset) {
    setActiveColor(c.name);
    applyColor(c);
  }

  async function pickFaviconColor(c: ColorPreset) {
    setActiveFaviconColor(c.name);
    setFaviconColor(c[500]);
    setFaviconColorObj(c);
  }

  async function saveFaviconColor() {
    setFaviconSaving(true);
    try {
      const obj = faviconColorObj ?? COLORS.find((c) => c[500] === faviconColor) ?? COLORS[0];
      // Save full color object (all shades) for platform sites to use
      await supabase.from("app_settings").upsert(
        { key: "platform_color", value: { 50: obj[50], 100: obj[100], 300: obj[300], 500: obj[500], 600: obj[600], 700: obj[700] } },
        { onConflict: "key" }
      );
      // Also save simple hex for backward compat
      await supabase.from("app_settings").upsert(
        { key: "platform_favicon_color", value: obj[500] },
        { onConflict: "key" }
      );
      setFaviconSaved(true);
      setTimeout(() => setFaviconSaved(false), 2000);
    } finally {
      setFaviconSaving(false);
    }
  }

  return (
    <div className="p-8 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Настройки</h1>
        <p className="text-sm text-gray-500 mt-1">Внешний вид панели администратора</p>
      </div>

      <div className="space-y-5">

        {/* Theme */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-3">Тема</h2>
          <div className="flex gap-3">
            <button
              onClick={() => toggleTheme(false)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                !isDark
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Sun size={15} />
              Светлая
            </button>
            <button
              onClick={() => toggleTheme(true)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                isDark
                  ? "border-indigo-600 bg-indigo-50 text-indigo-600"
                  : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <Moon size={15} />
              Тёмная
            </button>
          </div>
        </div>

        {/* Primary color (superadmin UI) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">Основной цвет</h2>
          <p className="text-xs text-gray-400 mb-4">Применяется к кнопкам, активным ссылкам и акцентам</p>
          <div className="flex flex-wrap gap-3 mb-3">
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => pickColor(c)}
                title={c.name}
                className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{ backgroundColor: c[600] }}
              >
                {activeColor === c.name && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check size={16} className="text-white drop-shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Выбран:{" "}
            <span className="font-medium text-gray-600">{activeColor}</span>
          </p>
        </div>

        {/* Platform favicon (ezze.site + pro.ezze.site) */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Цвет платформы</h2>
            <p className="text-xs text-gray-400">
              Основной цвет и иконка сайта ezze.site — кнопки, ссылки, акценты
            </p>
          </div>

          {/* Preview */}
          <div className="flex items-center gap-4">
            <FaviconPreview color={faviconColor} size={64} />
            <div>
              <p className="text-xs text-gray-500 font-medium">Предпросмотр</p>
              <p className="text-xs text-gray-400 mt-0.5">{faviconColor}</p>
            </div>
          </div>

          {/* Color picker */}
          <div className="flex flex-wrap gap-3">
            {COLORS.map((c) => (
              <button
                key={c.name}
                onClick={() => pickFaviconColor(c)}
                title={c.name}
                className="relative w-9 h-9 rounded-full transition-transform hover:scale-110 focus:outline-none"
                style={{ backgroundColor: c[500] }}
              >
                {activeFaviconColor === c.name && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <Check size={16} className="text-white drop-shadow" />
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            onClick={saveFaviconColor}
            disabled={faviconSaving}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-4 text-sm font-medium transition-colors disabled:opacity-50 ${
              faviconSaved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"
            }`}
          >
            {faviconSaved ? "Сохранено ✓" : faviconSaving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>

        <p className="text-xs text-gray-400">
          Настройки сохраняются в браузере и применяются немедленно.
        </p>
      </div>
    </div>
  );
}
