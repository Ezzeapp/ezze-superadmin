"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, CreditCard, Bot, Mail, Palette, LayoutGrid, Info, Users, KeyRound, BookOpen, ContactRound } from "lucide-react";
import { supabase, PRODUCTS } from "../lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);
  const [productLabels, setProductLabels] = useState<Record<string, string>>({});

  // Смена пароля
  const [pwModal, setPwModal] = useState(false);
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      const { data: userData } = await supabase
        .from("users").select("is_admin").eq("id", data.session.user.id).single();
      if (!userData?.is_admin) { router.replace("/login"); return; }
      setChecking(false);
    });
  }, [router]);

  useEffect(() => {
    supabase.from("app_settings").select("value").eq("key", "products_config").single()
      .then(({ data }) => {
        if (!data?.value) return;
        try {
          const list: { slug: string; label: string }[] = JSON.parse(
            typeof data.value === "string" ? data.value : JSON.stringify(data.value)
          );
          const map: Record<string, string> = {};
          for (const item of list) map[item.slug] = item.label;
          setProductLabels(map);
        } catch { /* keep defaults */ }
      });
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  async function handleChangePassword() {
    if (newPw.length < 6) { setPwMsg("Минимум 6 символов"); return; }
    if (newPw !== newPw2) { setPwMsg("Пароли не совпадают"); return; }
    setPwSaving(true);
    setPwMsg("");
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setPwSaving(false);
    if (error) {
      setPwMsg("Ошибка: " + error.message);
    } else {
      setPwMsg("✅ Пароль изменён!");
      setTimeout(() => { setPwModal(false); setNewPw(""); setNewPw2(""); setPwMsg(""); }, 1500);
    }
  }

  if (checking) {
    return <div className="h-full flex items-center justify-center text-gray-400 text-sm">Проверка доступа...</div>;
  }

  // Shared link classes — light: gray-700 on white, dark: gray-400 on gray-900
  const linkBase = "flex items-center gap-2.5 px-4 py-2 text-sm transition-colors";
  const linkInactive = "text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800";
  const linkActive = "bg-indigo-600 text-white";

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-56 bg-white border-r border-gray-200 dark:bg-gray-900 dark:border-gray-800 flex flex-col shrink-0">

        {/* Logo */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 font-bold text-gray-900 dark:text-white"
          >
            <Zap size={18} className="text-indigo-600" />
            <span>Super Admin</span>
          </Link>
        </div>

        {/* Products nav */}
        <nav className="flex-1 overflow-y-auto py-2">
          <div className="px-4 pt-2 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Контент</p>
          </div>
          {PRODUCTS.map((p) => {
            const active = pathname.startsWith(`/dashboard/${p.slug}`);
            const Icon = p.icon;
            return (
              <Link
                key={p.slug}
                href={`/dashboard/${p.slug}`}
                className={`${linkBase} ${active ? linkActive : linkInactive}`}
              >
                <Icon size={15} />
                <span className="truncate">{productLabels[p.slug] || p.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Users */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Пользователи</p>
          </div>
          <Link
            href="/dashboard/masters"
            className={`${linkBase} ${pathname.startsWith("/dashboard/masters") ? linkActive : linkInactive}`}
          >
            <Users size={14} />
            <span className="truncate">Мастера</span>
          </Link>
          <Link
            href="/dashboard/clients"
            className={`${linkBase} ${pathname.startsWith("/dashboard/clients") ? linkActive : linkInactive}`}
          >
            <ContactRound size={14} />
            <span className="truncate">Клиенты</span>
          </Link>
          <Link
            href="/dashboard/catalog"
            className={`${linkBase} ${pathname.startsWith("/dashboard/catalog") ? linkActive : linkInactive}`}
          >
            <BookOpen size={14} />
            <span className="truncate">Справочник</span>
          </Link>
        </div>

        {/* Platform settings */}
        <div className="border-t border-gray-200 dark:border-gray-800">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600">Платформа</p>
          </div>
          {[
            { href: "/dashboard/settings/products", icon: LayoutGrid, label: "Продукты" },
            { href: "/dashboard/settings/about",    icon: Info,       label: "О нас / Контакты" },
            { href: "/dashboard/settings/billing",  icon: CreditCard, label: "Тарифы и платежи" },
            { href: "/dashboard/settings/ai",       icon: Bot,        label: "AI настройки" },
            { href: "/dashboard/settings/email",    icon: Mail,       label: "Email / SMTP" },
            { href: "/dashboard/settings",          icon: Palette,    label: "Оформление", exact: true },
          ].map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`${linkBase} ${active ? linkActive : linkInactive}`}
              >
                <Icon size={14} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}

          {/* Смена пароля + Выйти */}
          <div className="p-4 flex flex-col gap-2">
            <button
              onClick={() => { setPwModal(true); setPwMsg(""); setNewPw(""); setNewPw2(""); }}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 transition-colors text-left"
            >
              <KeyRound size={13} />
              Сменить пароль
            </button>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-left"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>

      {/* Модалка смены пароля */}
      {pwModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
              🔑 Сменить пароль
            </h2>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Минимум 6 символов"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  Повторите пароль
                </label>
                <input
                  type="password"
                  value={newPw2}
                  onChange={(e) => setNewPw2(e.target.value)}
                  placeholder="Повторите новый пароль"
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {pwMsg && (
                <p className={`text-sm ${pwMsg.startsWith("✅") ? "text-green-600" : "text-red-500"}`}>
                  {pwMsg}
                </p>
              )}
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleChangePassword}
                disabled={pwSaving}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {pwSaving ? "Сохраняем..." : "Сохранить"}
              </button>
              <button
                onClick={() => setPwModal(false)}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
