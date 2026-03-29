"use client";
import { useState, useEffect } from "react";
import { Mail, Eye, EyeOff, Info, Save } from "lucide-react";
import { supabase } from "../../../lib/supabase";

type EmailConfig = {
  enabled: boolean;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_pass: string;
  from_address: string;
  from_name: string;
};

const DEFAULT_CONFIG: EmailConfig = {
  enabled: false,
  smtp_host: "",
  smtp_port: 587,
  smtp_user: "",
  smtp_pass: "",
  from_address: "",
  from_name: "Ezze",
};

export default function EmailSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState<EmailConfig>(DEFAULT_CONFIG);
  const [showPass, setShowPass] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    supabase
      .from("app_settings")
      .select("value")
      .eq("key", "email_config")
      .single()
      .then(({ data }) => {
        if (data?.value) {
          try { setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(data.value) }); } catch {}
        }
        setLoading(false);
      });
  }, []);

  const set = (patch: Partial<EmailConfig>) => setConfig(prev => ({ ...prev, ...patch }));

  async function handleSave() {
    setSaving(true);
    await supabase
      .from("app_settings")
      .upsert({ key: "email_config", value: JSON.stringify(config) }, { onConflict: "key" });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  const inp = "flex h-9 w-full rounded-lg border border-gray-200 bg-white px-3 py-1 text-sm shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500";
  const card = "rounded-xl border border-gray-200 bg-white shadow-sm";

  if (loading) {
    return (
      <div className="p-8 space-y-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="rounded-xl border border-gray-200 bg-white p-6 animate-pulse space-y-3">
            <div className="h-5 bg-gray-100 rounded w-32" />
            <div className="h-9 bg-gray-100 rounded" />
            <div className="h-9 bg-gray-100 rounded w-2/3" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="p-8 max-w-2xl space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Email / SMTP</h1>
        <p className="text-sm text-gray-500 mt-1">Настройки почтового сервера для отправки уведомлений клиентам и мастерам</p>
      </div>

      {/* Toggle */}
      <div className={`${card} p-5 flex items-center justify-between transition-opacity ${!config.enabled ? "opacity-80" : ""}`}>
        <div className="flex items-center gap-3">
          <div className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${config.enabled ? "bg-blue-100" : "bg-gray-100"}`}>
            <Mail size={18} className={config.enabled ? "text-blue-600" : "text-gray-400"} />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">Email уведомления</p>
            <p className="text-xs text-gray-500">Включить отправку писем по всей платформе</p>
          </div>
        </div>
        <button
          onClick={() => set({ enabled: !config.enabled })}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${config.enabled ? "bg-indigo-600" : "bg-gray-200"}`}
        >
          <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${config.enabled ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </div>

      {/* SMTP card */}
      <div className={`${card} p-6 space-y-5`}>
        <h2 className="text-sm font-semibold text-gray-900">SMTP настройки</h2>

        {/* Resend hint */}
        <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-50 border border-blue-200">
          <Info size={15} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-700 space-y-1">
            <p className="font-medium">Рекомендуем Resend (resend.com)</p>
            <p>Бесплатно до 3 000 писем/месяц. Настройки: Host <code className="bg-blue-100 px-1 rounded">smtp.resend.com</code>, Port <code className="bg-blue-100 px-1 rounded">465</code>, User <code className="bg-blue-100 px-1 rounded">resend</code>, Password — API ключ из кабинета.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Host */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">SMTP Host</label>
            <input
              value={config.smtp_host}
              onChange={e => set({ smtp_host: e.target.value })}
              placeholder="smtp.resend.com"
              className={inp}
            />
          </div>

          {/* Port */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Port</label>
            <input
              type="number"
              value={config.smtp_port}
              onChange={e => set({ smtp_port: Number(e.target.value) })}
              placeholder="587"
              className={inp}
            />
          </div>

          {/* User */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">User</label>
            <input
              value={config.smtp_user}
              onChange={e => set({ smtp_user: e.target.value })}
              placeholder="resend"
              className={inp}
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">Password</label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                value={config.smtp_pass}
                onChange={e => set({ smtp_pass: e.target.value })}
                placeholder="re_xxxxxxxxxxxx"
                className={`${inp} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* From address */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">From address</label>
            <input
              type="email"
              value={config.from_address}
              onChange={e => set({ from_address: e.target.value })}
              placeholder="noreply@ezze.site"
              className={inp}
            />
          </div>

          {/* From name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-gray-700">From name</label>
            <input
              value={config.from_name}
              onChange={e => set({ from_name: e.target.value })}
              placeholder="Ezze"
              className={inp}
            />
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1 border-t border-gray-100">
          <button
            onClick={handleSave}
            disabled={saving}
            className={`inline-flex h-9 items-center gap-2 rounded-lg px-5 text-sm font-medium transition-colors disabled:opacity-50 ${saved ? "bg-emerald-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700"}`}
          >
            <Save size={14} />
            {saved ? "Сохранено ✓" : saving ? "Сохраняю..." : "Сохранить"}
          </button>
        </div>
      </div>

      {/* Info block */}
      <div className="flex items-start gap-3 p-5 rounded-xl border border-gray-200 bg-gray-50">
        <Info size={15} className="text-gray-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-gray-700">Уведомления для мастеров</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Каждый мастер может указать свой email для уведомлений в разделе «Настройки» своего профиля.
            Этот SMTP используется глобально для всех продуктов экосистемы.
          </p>
        </div>
      </div>
    </div>
  );
}
