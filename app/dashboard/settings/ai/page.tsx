"use client";
import { useState, useEffect } from "react";
import { Bot, Eye, EyeOff, ExternalLink, Sparkles, BarChart2, MessageSquare } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type AIConfig = {
  enabled: boolean;
  provider: string;
  model: string;
  api_key: string;
  base_url?: string;
  max_tokens: number;
};

const DEFAULT_CONFIG: AIConfig = {
  enabled: false,
  provider: "anthropic",
  model: "claude-haiku-4-5",
  api_key: "",
  base_url: "",
  max_tokens: 1024,
};

const PROVIDERS = [
  { value: "anthropic", label: "Anthropic (Claude)" },
  { value: "openai",    label: "OpenAI (GPT)" },
  { value: "gemini",    label: "Google Gemini" },
  { value: "deepseek",  label: "DeepSeek 🇨🇳" },
  { value: "qwen",      label: "Qwen / Alibaba 🇨🇳" },
  { value: "custom",    label: "Custom (OpenAI-совместимый)" },
];

const MODELS: Record<string, Array<{ value: string; label: string; desc: string }>> = {
  anthropic: [
    { value: "claude-haiku-4-5",          label: "Claude Haiku 4.5",   desc: "Быстрый · Дешёвый · Рекомендован" },
    { value: "claude-3-5-haiku-20241022",  label: "Claude 3.5 Haiku",   desc: "Быстрый" },
    { value: "claude-sonnet-4-5",          label: "Claude Sonnet 4.5",  desc: "Баланс скорости и качества" },
    { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet",  desc: "Умный" },
    { value: "claude-opus-4-5",            label: "Claude Opus 4.5",    desc: "Умнейший · Дорогой" },
  ],
  openai: [
    { value: "gpt-4o-mini",  label: "GPT-4o mini",  desc: "Быстрый · Дешёвый · Рекомендован" },
    { value: "gpt-4o",       label: "GPT-4o",        desc: "Умный · Универсальный" },
    { value: "gpt-4-turbo",  label: "GPT-4 Turbo",   desc: "Мощный" },
    { value: "o3-mini",      label: "o3-mini",        desc: "Рассуждения и логика" },
  ],
  gemini: [
    { value: "gemini-2.0-flash",    label: "Gemini 2.0 Flash",     desc: "Быстрый · Рекомендован" },
    { value: "gemini-1.5-flash",    label: "Gemini 1.5 Flash",     desc: "Экономичный" },
    { value: "gemini-1.5-pro",      label: "Gemini 1.5 Pro",       desc: "Умный · Большой контекст" },
    { value: "gemini-2.0-pro-exp",  label: "Gemini 2.0 Pro (exp)", desc: "Умнейший (эксперимент)" },
  ],
  deepseek: [
    { value: "deepseek-chat",     label: "DeepSeek Chat",     desc: "Дешёвый · Рекомендован" },
    { value: "deepseek-reasoner", label: "DeepSeek Reasoner", desc: "Сложные рассуждения" },
  ],
  qwen: [
    { value: "qwen-plus",            label: "Qwen Plus",   desc: "Баланс · Рекомендован" },
    { value: "qwen-turbo",           label: "Qwen Turbo",  desc: "Быстрый · Дешёвый" },
    { value: "qwen-max",             label: "Qwen Max",    desc: "Умнейший" },
    { value: "qwen2.5-72b-instruct", label: "Qwen 2.5 72B", desc: "Open-source" },
  ],
  custom: [],
};

const DEFAULT_MODEL: Record<string, string> = {
  anthropic: "claude-haiku-4-5",
  openai:    "gpt-4o-mini",
  gemini:    "gemini-2.0-flash",
  deepseek:  "deepseek-chat",
  qwen:      "qwen-plus",
  custom:    "",
};

const KEY_LINKS: Record<string, { url: string; label: string }> = {
  anthropic: { url: "https://console.anthropic.com/settings/keys",  label: "console.anthropic.com" },
  openai:    { url: "https://platform.openai.com/api-keys",          label: "platform.openai.com" },
  gemini:    { url: "https://aistudio.google.com/app/apikey",        label: "aistudio.google.com" },
  deepseek:  { url: "https://platform.deepseek.com/api_keys",        label: "platform.deepseek.com" },
  qwen:      { url: "https://dashscope.console.aliyun.com",          label: "dashscope.console.aliyun.com" },
  custom:    { url: "", label: "" },
};

const KEY_PLACEHOLDERS: Record<string, string> = {
  anthropic: "sk-ant-api03-...",
  openai:    "sk-...",
  gemini:    "AIza...",
  deepseek:  "sk-...",
  qwen:      "sk-...",
  custom:    "",
};

export default function AISettingsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<AIConfig>(DEFAULT_CONFIG);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "ai_config")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(data.value) }); } catch {}
        }
        setLoading(false);
      });
  }, []);

  const set = (patch: Partial<AIConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("app_settings")
      .upsert({ key: "ai_config", value: JSON.stringify(config) }, { onConflict: "key" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inp = "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const card = "rounded-xl border border-gray-200 bg-white shadow-sm";

  const keyPreview = config.api_key ? `...${config.api_key.slice(-4)}` : null;
  const keyLink = KEY_LINKS[config.provider];
  const models = MODELS[config.provider] ?? [];
  const providerLabel = PROVIDERS.find(p => p.value === config.provider)?.label ?? config.provider;

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1,2,3].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse space-y-3">
            <div className="h-5 bg-gray-100 rounded w-32" />
            <div className="h-9 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI настройки</h1>
        <p className="text-sm text-gray-500 mt-1">Провайдер и ключ для генерации текстов, анализа клиентов и AI-бота</p>
      </div>

      {/* Toggle */}
      <div className={`${card} p-5 flex items-center justify-between transition-opacity ${!config.enabled ? "opacity-80" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${config.enabled ? "bg-purple-100" : "bg-gray-100"}`}>
            <Bot size={18} className={config.enabled ? "text-purple-600" : "text-gray-400"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">AI функции</p>
            <p className="text-xs text-gray-500">Включить генерацию текстов, анализ и бот для всей платформы</p>
          </div>
        </div>
        <button
          onClick={() => set({ enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* Config card */}
      <div className={`${card} p-6 space-y-5`}>
        {/* Provider */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Провайдер</label>
          <select
            value={config.provider}
            onChange={e => set({ provider: e.target.value, model: DEFAULT_MODEL[e.target.value] ?? "", api_key: "" })}
            className={inp}
          >
            {PROVIDERS.map(p => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">API ключ — {providerLabel}</label>
          <div className="flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={config.api_key}
              onChange={e => set({ api_key: e.target.value })}
              placeholder={KEY_PLACEHOLDERS[config.provider] || "API key..."}
              className={`${inp} flex-1 font-mono`}
            />
            <button
              type="button"
              onClick={() => setShowKey(v => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors text-gray-500"
            >
              {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          {keyLink?.url && (
            <a
              href={keyLink.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 w-fit"
            >
              Получить ключ на {keyLink.label}
              <ExternalLink size={11} />
            </a>
          )}
        </div>

        {/* Base URL (custom only) */}
        {config.provider === "custom" && (
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Base URL</label>
            <input
              value={config.base_url ?? ""}
              onChange={e => set({ base_url: e.target.value })}
              placeholder="https://api.example.com/v1"
              className={`${inp} font-mono`}
            />
            <p className="text-xs text-gray-400">OpenAI-совместимый эндпоинт (LocalAI, Ollama, etc.)</p>
          </div>
        )}

        {/* Model */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Модель</label>
          {config.provider === "custom" ? (
            <input
              value={config.model}
              onChange={e => set({ model: e.target.value })}
              placeholder="gpt-4o, llama3..."
              className={`${inp} font-mono`}
            />
          ) : (
            <select
              value={config.model || models[0]?.value || ""}
              onChange={e => set({ model: e.target.value })}
              className={inp}
            >
              {models.map(m => (
                <option key={m.value} value={m.value}>{m.label} — {m.desc}</option>
              ))}
            </select>
          )}
        </div>

        {/* Max tokens */}
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Макс. токенов</label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={128}
              max={4096}
              step={128}
              value={config.max_tokens}
              onChange={e => set({ max_tokens: Math.max(128, Math.min(4096, parseInt(e.target.value) || 1024)) })}
              className={`${inp} w-32`}
            />
            <span className="text-xs text-gray-400">от 128 до 4096</span>
          </div>
          <p className="text-xs text-gray-400">Влияет на длину генерируемых текстов и стоимость запросов</p>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-50 ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            {saved ? "Сохранено ✓" : saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Status */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">Статус</p>
        <div className="space-y-2">
          {keyPreview ? (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-emerald-700">Ключ установлен ({keyPreview})</span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-sm">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="text-amber-700">Ключ не установлен</span>
            </div>
          )}
          {config.enabled && keyPreview ? (
            <div className="flex items-center gap-2.5 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
              <span>
                Активен · <span className="font-medium text-gray-700">{providerLabel}</span>
                {" · "}<span className="font-mono text-xs">{config.model}</span>
                {" · "}{config.max_tokens} токенов
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-sm text-gray-400">
              <span className="h-2 w-2 rounded-full bg-gray-300 shrink-0" />
              <span>Неактивен</span>
            </div>
          )}
        </div>
        <div className="border-t border-gray-200 pt-3">
          <p className="text-xs text-gray-400 mb-2">Используется в:</p>
          <div className="flex flex-wrap gap-2">
            {[
              { icon: Sparkles,      label: "Генерация биографий" },
              { icon: BarChart2,     label: "Анализ клиентов" },
              { icon: MessageSquare, label: "AI-бот" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 text-xs bg-white border border-gray-200 rounded-full px-3 py-1">
                <Icon size={11} className="text-purple-500" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
