"use client";
import { useEffect, useRef, useState } from "react";
import {
  Zap, Upload, Palette, Type, Globe, Send, RotateCcw, Save,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ── Цветовые пресеты (HSL — в формате как в ezze-app) ──────────────────────────

const PRESET_COLORS = [
  { label: "Indigo",  hsl: "239 84% 67%" },
  { label: "Violet",  hsl: "262 83% 65%" },
  { label: "Blue",    hsl: "217 91% 60%" },
  { label: "Sky",     hsl: "199 89% 48%" },
  { label: "Teal",    hsl: "172 66% 50%" },
  { label: "Green",   hsl: "142 71% 45%" },
  { label: "Amber",   hsl: "38 92% 50%" },
  { label: "Orange",  hsl: "25 95% 53%" },
  { label: "Rose",    hsl: "347 77% 50%" },
  { label: "Pink",    hsl: "330 81% 60%" },
];

// ── Конвертация HSL ↔ HEX ─────────────────────────────────────────────────────

function hslStrToHex(hsl: string): string {
  const m = hsl.match(/^(\d+)\s+(\d+)%\s+(\d+)%$/);
  if (!m) return "#6366f1";
  const h = parseInt(m[1]) / 360;
  const s = parseInt(m[2]) / 100;
  const l = parseInt(m[3]) / 100;
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r = l, g = l, b = l;
  if (s !== 0) {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  const to2 = (n: number) => Math.round(n * 255).toString(16).padStart(2, "0");
  return `#${to2(r)}${to2(g)}${to2(b)}`;
}

function hexToHslStr(hex: string): string {
  const m = hex.replace("#", "").match(/^([0-9a-f]{6})$/i);
  if (!m) return "239 84% 67%";
  const r = parseInt(m[1].slice(0, 2), 16) / 255;
  const g = parseInt(m[1].slice(2, 4), 16) / 255;
  const b = parseInt(m[1].slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// ── Дефолты (из useAppSettings.fetchAppSettings) ──────────────────────────────

const DEFAULTS = {
  platform_name: "Ezze",
  primary_color: "239 84% 67%",
  font_size: "medium" as "small" | "medium" | "large",
  registration_open: true,
  default_language: "ru",
  default_currency: "RUB",
  default_timezone: "Europe/Moscow",
  tg_client_label: "Ezze",
  tg_master_label: "Ezze",
  tg_welcome_text: "Добро пожаловать! Нажмите кнопку ниже, чтобы открыть приложение.",
};

const LANGS = [
  { code: "ru", label: "Русский" },
  { code: "en", label: "English" },
  { code: "uz", label: "O'zbekcha" },
  { code: "kz", label: "Қазақша" },
];

const CURRENCIES = [
  { code: "RUB", label: "₽ Рубль" },
  { code: "UZS", label: "сўм Узб." },
  { code: "USD", label: "$ Доллар" },
  { code: "EUR", label: "€ Евро" },
  { code: "KZT", label: "₸ Тенге" },
];

const TIMEZONES = [
  "Europe/Moscow", "Europe/Kiev", "Asia/Tashkent", "Asia/Almaty",
  "Asia/Bishkek", "Asia/Tbilisi", "Asia/Yerevan", "Asia/Baku",
  "Asia/Yekaterinburg", "UTC",
];

const FONT_SIZES = [
  { value: "small",  label: "Маленький", px: "14px" },
  { value: "medium", label: "Средний",   px: "16px" },
  { value: "large",  label: "Крупный",   px: "18px" },
];

// ─────────────────────────────────────────────────────────────────────────────

export default function AppearanceTab({ product }: { product: string }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  const [platformName, setPlatformName] = useState(DEFAULTS.platform_name);
  const [primaryColor, setPrimaryColor] = useState(DEFAULTS.primary_color);
  const [customHex, setCustomHex] = useState("#6366f1");
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">(DEFAULTS.font_size);
  const [registrationOpen, setRegistrationOpen] = useState(DEFAULTS.registration_open);
  const [defLang, setDefLang] = useState(DEFAULTS.default_language);
  const [defCurrency, setDefCurrency] = useState(DEFAULTS.default_currency);
  const [defTimezone, setDefTimezone] = useState(DEFAULTS.default_timezone);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoMarker, setLogoMarker] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [tgClientLabel, setTgClientLabel] = useState(DEFAULTS.tg_client_label);
  const [tgMasterLabel, setTgMasterLabel] = useState(DEFAULTS.tg_master_label);
  const [tgWelcomeText, setTgWelcomeText] = useState(DEFAULTS.tg_welcome_text);

  // ── Загрузка настроек продукта ─────────────────────────────────────────────

  useEffect(() => {
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from("app_settings")
        .select("key, value")
        .eq("product", product);

      const map = Object.fromEntries((data ?? []).map((r: any) => [r.key, r.value])) as Record<string, string>;

      setPlatformName(map.platform_name ?? DEFAULTS.platform_name);
      setPrimaryColor(map.primary_color ?? DEFAULTS.primary_color);
      setCustomHex(hslStrToHex(map.primary_color ?? DEFAULTS.primary_color));
      setFontSize((map.font_size as any) ?? DEFAULTS.font_size);
      setRegistrationOpen(map.registration_open !== "false");
      setDefLang(map.default_language ?? DEFAULTS.default_language);
      setDefCurrency(map.default_currency ?? DEFAULTS.default_currency);
      setDefTimezone(map.default_timezone ?? DEFAULTS.default_timezone);
      setLogoMarker(map.platform_logo ?? null);

      // TG config — JSON в ключе tg_config
      if (map.tg_config) {
        try {
          const tg = JSON.parse(map.tg_config);
          setTgClientLabel(tg.client_label ?? DEFAULTS.tg_client_label);
          setTgMasterLabel(tg.master_label ?? DEFAULTS.tg_master_label);
          setTgWelcomeText(tg.welcome_text ?? DEFAULTS.tg_welcome_text);
        } catch { /* ignore */ }
      }

      // Per-product логотип: бакет teams, файл "{product}-app-logo".
      // Старый ключ value='app-logo' — legacy fallback для shared-логотипа до 2026-05-01.
      if (map.platform_logo) {
        const { data: pub } = supabase.storage.from("teams").getPublicUrl(map.platform_logo);
        setLogoUrl(pub.publicUrl);
      } else {
        setLogoUrl(null);
      }

      setLoading(false);
    })();
  }, [product]);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  async function upsertSetting(key: string, value: string) {
    setSaving(key);
    const { error } = await supabase
      .from("app_settings")
      .upsert({ product, key, value }, { onConflict: "product,key" });
    setSaving(null);
    if (error) {
      alert("Ошибка сохранения: " + error.message);
      return false;
    }
    setSavedKey(key);
    setTimeout(() => setSavedKey((k) => (k === key ? null : k)), 1500);
    return true;
  }

  async function uploadLogo(file: File) {
    setSaving("platform_logo");
    // Per-product: бакет teams, путь "{product}-app-logo".
    const path = `${product}-app-logo`;
    const { error: upErr } = await supabase.storage
      .from("teams")
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) { setSaving(null); alert("Ошибка загрузки: " + upErr.message); return; }

    const { error: setErr } = await supabase
      .from("app_settings")
      .upsert({ product, key: "platform_logo", value: path }, { onConflict: "product,key" });
    setSaving(null);
    if (setErr) { alert("Ошибка сохранения: " + setErr.message); return; }

    const { data: pub } = supabase.storage.from("teams").getPublicUrl(path);
    setLogoUrl(`${pub.publicUrl}?v=${Date.now()}`);
    setLogoMarker(path);
    setSavedKey("platform_logo");
    setTimeout(() => setSavedKey(null), 1500);
  }

  async function resetLogo() {
    setSaving("platform_logo");
    await supabase
      .from("app_settings")
      .delete()
      .eq("product", product)
      .eq("key", "platform_logo");
    setSaving(null);
    setLogoMarker(null);
    setLogoUrl(null);
  }

  function pickColorPreset(hsl: string) {
    setPrimaryColor(hsl);
    setCustomHex(hslStrToHex(hsl));
    upsertSetting("primary_color", hsl);
  }

  function applyCustomColor() {
    const hsl = hexToHslStr(customHex);
    setPrimaryColor(hsl);
    upsertSetting("primary_color", hsl);
  }

  function pickFontSize(v: "small" | "medium" | "large") {
    setFontSize(v);
    upsertSetting("font_size", v);
  }

  function toggleRegistration() {
    const next = !registrationOpen;
    setRegistrationOpen(next);
    upsertSetting("registration_open", next ? "true" : "false");
  }

  async function saveDefaults() {
    setSaving("defaults");
    await Promise.all([
      supabase.from("app_settings").upsert({ product, key: "default_language", value: defLang }, { onConflict: "product,key" }),
      supabase.from("app_settings").upsert({ product, key: "default_currency", value: defCurrency }, { onConflict: "product,key" }),
      supabase.from("app_settings").upsert({ product, key: "default_timezone", value: defTimezone }, { onConflict: "product,key" }),
    ]);
    setSaving(null);
    setSavedKey("defaults");
    setTimeout(() => setSavedKey(null), 1500);
  }

  async function saveTgConfig() {
    const cfg = {
      client_label: tgClientLabel.trim() || DEFAULTS.tg_client_label,
      master_label: tgMasterLabel.trim() || DEFAULTS.tg_master_label,
      welcome_text: tgWelcomeText.trim() || DEFAULTS.tg_welcome_text,
    };
    await upsertSetting("tg_config", JSON.stringify(cfg));
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (loading) return <div className="text-sm text-gray-400 py-8 text-center">Загрузка...</div>;

  return (
    <div className="space-y-5">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Бренд продукта <span className="font-medium text-gray-900 dark:text-white">{product}</span>:
        логотип, название, цвета, шрифт, дефолтные настройки.
      </p>

      {/* Брендинг */}
      <Section icon={<Zap size={14} />} title="Брендинг">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 shrink-0 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="" className="h-14 w-14 object-cover" />
            ) : (
              <Zap size={28} className="text-white" />
            )}
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">Логотип платформы</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">PNG, JPG, SVG · до 5 МБ</p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => logoInputRef.current?.click()}
                disabled={saving === "platform_logo"}
                className={btnOutline}
              >
                <Upload size={13} />
                Загрузить
              </button>
              {logoMarker && (
                <button
                  type="button"
                  onClick={resetLogo}
                  disabled={saving === "platform_logo"}
                  className={btnOutline}
                >
                  <RotateCcw size={13} />
                  По умолчанию
                </button>
              )}
            </div>
            <input
              ref={logoInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp,image/svg+xml"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) uploadLogo(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Название платформы</label>
          <div className="flex gap-2">
            <input
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Ezze"
              className={input + " max-w-xs"}
            />
            <button
              type="button"
              onClick={() => upsertSetting("platform_name", platformName.trim() || DEFAULTS.platform_name)}
              disabled={saving === "platform_name"}
              className={btnPrimary}
            >
              {savedKey === "platform_name" ? "✓ Сохранено" : "Сохранить"}
            </button>
          </div>
        </div>
      </Section>

      {/* Цвет */}
      <Section icon={<Palette size={14} />} title="Основной цвет" desc="Цветовые пресеты">
        <div className="grid grid-cols-5 gap-2 sm:gap-3">
          {PRESET_COLORS.map((c) => {
            const active = primaryColor === c.hsl;
            return (
              <button
                key={c.label}
                type="button"
                onClick={() => pickColorPreset(c.hsl)}
                disabled={saving === "primary_color"}
                title={c.label}
                className={`h-10 rounded-lg border-2 transition-all ${
                  active ? "border-gray-900 dark:border-white scale-95" : "border-transparent hover:scale-95"
                }`}
                style={{ background: `hsl(${c.hsl})` }}
              />
            );
          })}
        </div>

        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Произвольный цвет</label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              className="h-9 w-12 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer"
            />
            <input
              value={customHex}
              onChange={(e) => setCustomHex(e.target.value)}
              placeholder="#6366f1"
              className={input + " max-w-[140px] font-mono"}
            />
            <button type="button" onClick={applyCustomColor} className={btnPrimary}>Применить</button>
          </div>
        </div>
      </Section>

      {/* Шрифт */}
      <Section icon={<Type size={14} />} title="Размер шрифта" desc="Влияет на отображение текста у всех пользователей продукта">
        <div className="grid grid-cols-3 gap-2">
          {FONT_SIZES.map((f) => {
            const active = fontSize === f.value;
            return (
              <button
                key={f.value}
                type="button"
                onClick={() => pickFontSize(f.value as any)}
                disabled={saving === "font_size"}
                className={`p-3 rounded-lg border-2 text-center transition-colors ${
                  active
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                    : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                }`}
              >
                <div className="font-semibold text-gray-900 dark:text-white" style={{ fontSize: f.px }}>Aa</div>
                <div className="text-xs mt-1 text-gray-700 dark:text-gray-300">{f.label}</div>
                <div className="text-[10px] text-gray-400">{f.px}</div>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Регистрация */}
      <Section icon={<Zap size={14} />} title="Регистрация" desc="Разрешить новым пользователям регистрироваться">
        <button
          type="button"
          onClick={toggleRegistration}
          disabled={saving === "registration_open"}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${
            registrationOpen
              ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800"
              : "bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}
        >
          <span className={`inline-flex h-5 w-9 items-center rounded-full transition-colors ${
            registrationOpen ? "bg-emerald-600" : "bg-gray-300 dark:bg-gray-700"
          }`}>
            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              registrationOpen ? "translate-x-4" : "translate-x-0.5"
            }`} />
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {registrationOpen ? "Открыта" : "Закрыта"}
          </span>
        </button>
      </Section>

      {/* Дефолты */}
      <Section icon={<Globe size={14} />} title="Настройки по умолчанию" desc="Язык, валюта, часовой пояс для новых пользователей">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Язык">
            <select value={defLang} onChange={(e) => setDefLang(e.target.value)} className={input}>
              {LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </Field>
          <Field label="Валюта">
            <select value={defCurrency} onChange={(e) => setDefCurrency(e.target.value)} className={input}>
              {CURRENCIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
            </select>
          </Field>
          <Field label="Часовой пояс">
            <select value={defTimezone} onChange={(e) => setDefTimezone(e.target.value)} className={input}>
              {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
            </select>
          </Field>
        </div>
        <button type="button" onClick={saveDefaults} disabled={saving === "defaults"} className={btnPrimary + " mt-3"}>
          <Save size={13} />
          {savedKey === "defaults" ? "✓ Сохранено" : "Сохранить дефолты"}
        </button>
      </Section>

      {/* Telegram */}
      <Section icon={<Send size={14} />} title="Telegram-бот" desc="Подписи кнопок и приветствие в TG-боте этого продукта">
        <Field label="Лейбл клиентской кнопки">
          <input value={tgClientLabel} onChange={(e) => setTgClientLabel(e.target.value)} placeholder="Ezze" className={input} />
        </Field>
        <Field label="Лейбл мастерской кнопки">
          <input value={tgMasterLabel} onChange={(e) => setTgMasterLabel(e.target.value)} placeholder="Ezze" className={input} />
        </Field>
        <Field label="Приветственный текст">
          <textarea
            value={tgWelcomeText}
            onChange={(e) => setTgWelcomeText(e.target.value)}
            rows={3}
            className={input}
          />
        </Field>
        <button type="button" onClick={saveTgConfig} disabled={saving === "tg_config"} className={btnPrimary + " mt-2"}>
          <Save size={13} />
          {savedKey === "tg_config" ? "✓ Сохранено" : "Сохранить TG-конфиг"}
        </button>
      </Section>
    </div>
  );
}

// ── Стили (повторяем стиль superadmin) ─────────────────────────────────────────

const input =
  "w-full h-9 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-white px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50";

const btnPrimary =
  "inline-flex items-center gap-1.5 h-9 px-3 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors";

const btnOutline =
  "inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 transition-colors";

function Section({
  icon, title, desc, children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-white">
          {icon} {title}
        </h2>
        {desc && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{desc}</p>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}
