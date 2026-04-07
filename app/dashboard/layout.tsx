"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, CreditCard, Bot, Mail, Palette, LayoutGrid, Info } from "lucide-react";
import { supabase, PRODUCTS } from "../lib/supabase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) { router.replace("/login"); return; }
      const { data: userData } = await supabase
        .from("users").select("is_admin").eq("id", data.session.user.id).single();
      if (!userData?.is_admin) { router.replace("/login"); return; }
      setChecking(false);
    });
  }, [router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.replace("/login");
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
                <span className="truncate">{p.label}</span>
              </Link>
            );
          })}
        </nav>

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

          {/* Logout */}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors text-left"
            >
              Выйти
            </button>
          </div>
        </div>
      </aside>

      {/* Content */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
