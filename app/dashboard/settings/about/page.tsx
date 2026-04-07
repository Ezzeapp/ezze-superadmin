"use client";
import { useState, useEffect } from "react";
import { Info, Phone, Mail, Globe, Send, Camera, Link2, PlayCircle, Check, Plus, X } from "lucide-react";
import { supabase } from "../../../lib/supabase";

interface AboutConfig {
  company_name: string;
  tagline: string;
  description: string;
  founded_year: string;
  story: string;
}

interface ContactsConfig {
  phone: string;
  phone2: string;
  email: string;
  address: string;
  telegram: string;
  instagram: string;
  facebook: string;
  youtube: string;
  website: string;
}

const DEFAULT_ABOUT: AboutConfig = {
  company_name: "Ezze",
  tagline: "Цифровые инструменты для любого бизнеса",
  description: "Экосистема SaaS-приложений для самозанятых специалистов, малого и среднего бизнеса — от салонов красоты до ферм и медицинских клиник.",
  founded_year: "2013",
  story: `Ezze появилась в 2013 году как небольшая команда разработчиков, которые хотели решить простую проблему: почему запись к мастеру красоты до сих пор делается по телефону?\n\nНачав с одного продукта для салонов красоты, за 12 лет мы выросли в полноценную экосистему приложений для десятков видов бизнеса. Мы прошли через взлёты и кризисы, пандемию и цифровую революцию — и каждый раз выходили с новыми инструментами и опытом.\n\nСегодня Ezze — это команда из 40+ человек, более 5 000 активных мастеров и специалистов по всему СНГ, и одна миссия: сделать управление бизнесом простым и доступным для каждого.`,
};

const DEFAULT_CONTACTS: ContactsConfig = {
  phone: "",
  phone2: "",
  email: "hello@ezze.site",
  address: "",
  telegram: "https://t.me/ezzeapp",
  instagram: "",
  facebook: "",
  youtube: "",
  website: "https://ezze.site",
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputClass = "w-full text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-600";
const textareaClass = inputClass + " resize-none";

export default function AboutSettingsPage() {
  const [about, setAbout] = useState<AboutConfig>(DEFAULT_ABOUT);
  const [contacts, setContacts] = useState<ContactsConfig>(DEFAULT_CONTACTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      supabase.from("app_settings").select("value").eq("key", "about_config").single(),
      supabase.from("app_settings").select("value").eq("key", "contacts_config").single(),
    ]).then(([{ data: a }, { data: c }]) => {
      if (a?.value) {
        try { setAbout({ ...DEFAULT_ABOUT, ...JSON.parse(typeof a.value === "string" ? a.value : JSON.stringify(a.value)) }); } catch { /* keep default */ }
      }
      if (c?.value) {
        try { setContacts({ ...DEFAULT_CONTACTS, ...JSON.parse(typeof c.value === "string" ? c.value : JSON.stringify(c.value)) }); } catch { /* keep default */ }
      }
      setLoading(false);
    });
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    await Promise.all([
      supabase.from("app_settings").upsert({ key: "about_config", value: about }, { onConflict: "key" }),
      supabase.from("app_settings").upsert({ key: "contacts_config", value: contacts }, { onConflict: "key" }),
    ]);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  if (loading) return <div className="p-8 text-gray-400 text-sm">Загрузка...</div>;

  return (
    <div className="p-8 max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Info size={22} className="text-indigo-600 dark:text-indigo-400" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">О нас / Контакты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Информация о компании и контактные данные на лендинге
          </p>
        </div>
      </div>

      {/* About */}
      <Card title="О компании">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Название компании">
            <input className={inputClass} value={about.company_name}
              onChange={(e) => setAbout((p) => ({ ...p, company_name: e.target.value }))} />
          </Field>
          <Field label="Год основания">
            <input className={inputClass} value={about.founded_year}
              onChange={(e) => setAbout((p) => ({ ...p, founded_year: e.target.value }))} />
          </Field>
        </div>
        <Field label="Слоган">
          <input className={inputClass} value={about.tagline}
            onChange={(e) => setAbout((p) => ({ ...p, tagline: e.target.value }))} />
        </Field>
        <Field label="Краткое описание (2–3 предложения)">
          <textarea className={textareaClass} rows={3} value={about.description}
            onChange={(e) => setAbout((p) => ({ ...p, description: e.target.value }))} />
        </Field>
        <Field label="История компании (полная версия для страницы «О нас»)">
          <textarea className={textareaClass} rows={8} value={about.story}
            onChange={(e) => setAbout((p) => ({ ...p, story: e.target.value }))}
            placeholder="Расскажите историю компании..." />
        </Field>
      </Card>

      {/* Contacts */}
      <Card title="Контактные данные">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Телефон (основной)">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <input className={inputClass} value={contacts.phone} placeholder="+998 71 123 45 67"
                onChange={(e) => setContacts((p) => ({ ...p, phone: e.target.value }))} />
            </div>
          </Field>
          <Field label="Телефон (дополнительный)">
            <div className="flex items-center gap-2">
              <Phone size={14} className="text-gray-400 shrink-0" />
              <input className={inputClass} value={contacts.phone2} placeholder="+998 90 000 00 00"
                onChange={(e) => setContacts((p) => ({ ...p, phone2: e.target.value }))} />
            </div>
          </Field>
          <Field label="Email">
            <div className="flex items-center gap-2">
              <Mail size={14} className="text-gray-400 shrink-0" />
              <input className={inputClass} value={contacts.email} placeholder="hello@ezze.site"
                onChange={(e) => setContacts((p) => ({ ...p, email: e.target.value }))} />
            </div>
          </Field>
          <Field label="Адрес">
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-gray-400 shrink-0" />
              <input className={inputClass} value={contacts.address} placeholder="Ташкент, ул. Амира Темура"
                onChange={(e) => setContacts((p) => ({ ...p, address: e.target.value }))} />
            </div>
          </Field>
        </div>
      </Card>

      {/* Social media */}
      <Card title="Социальные сети">
        <div className="grid grid-cols-1 gap-3">
          {[
            { key: "telegram",  icon: Send,      label: "Telegram",  placeholder: "https://t.me/ezzeapp" },
            { key: "instagram", icon: Camera, label: "Instagram", placeholder: "https://instagram.com/ezzeapp" },
            { key: "facebook",  icon: Link2,  label: "Facebook",  placeholder: "https://facebook.com/ezzeapp" },
            { key: "youtube",   icon: PlayCircle, label: "YouTube",   placeholder: "https://youtube.com/@ezze" },
            { key: "website",   icon: Globe,     label: "Сайт",      placeholder: "https://ezze.site" },
          ].map(({ key, icon: Icon, label, placeholder }) => (
            <Field key={key} label={label}>
              <div className="flex items-center gap-2">
                <Icon size={14} className="text-gray-400 shrink-0" />
                <input
                  className={inputClass}
                  value={contacts[key as keyof ContactsConfig]}
                  placeholder={placeholder}
                  onChange={(e) => setContacts((p) => ({ ...p, [key]: e.target.value }))}
                />
                {contacts[key as keyof ContactsConfig] && (
                  <button
                    onClick={() => setContacts((p) => ({ ...p, [key]: "" }))}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </Field>
          ))}
        </div>
      </Card>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-colors ${
          saved ? "bg-green-600 text-white" : "bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
        }`}
      >
        {saved && <Check size={15} />}
        {saving ? "Сохранение..." : saved ? "Сохранено!" : "Сохранить"}
      </button>

      <p className="text-xs text-gray-400 dark:text-gray-600">
        Данные хранятся в app_settings.about_config и app_settings.contacts_config.
        Для отображения на лендинге нужна интеграция в HomeContent (следующий шаг).
      </p>
    </div>
  );
}
