"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { Zap, CreditCard, Bot, Mail, Palette } from "lucide-react";
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

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <aside className="w-56 bg-gray-900 flex flex-col shrink-0">
        <div className="p-4 border-b border-gray-800">
          <Link href="/dashboard" className="flex items-center gap-2 text-white font-bold">
            <Zap size={18} /><span>Super Admin</span>
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto py-2">
          {PRODUCTS.map((p) => {
            const active = pathname.startsWith(`/dashboard/${p.slug}`);
            const Icon = p.icon;
            return (
              <Link
                key={p.slug}
                href={`/dashboard/${p.slug}`}
                className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                  active ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon size={15} />
                <span className="truncate">{p.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-gray-800">
          <div className="px-4 pt-3 pb-1">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-600">Платформа</p>
          </div>
          {[
            { href: "/dashboard/settings/billing", icon: CreditCard, label: "Тарифы и платежи" },
            { href: "/dashboard/settings/ai",      icon: Bot,        label: "AI настройки" },
            { href: "/dashboard/settings/email",   icon: Mail,       label: "Email / SMTP" },
            { href: "/dashboard/settings",         icon: Palette,    label: "Оформление", exact: true },
          ].map(({ href, icon: Icon, label, exact }) => {
            const active = exact ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2.5 px-4 py-2 text-sm transition-colors ${
                  active ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                <Icon size={14} />
                <span className="truncate">{label}</span>
              </Link>
            );
          })}
          <div className="p-4">
            <button
              onClick={handleLogout}
              className="w-full text-sm text-gray-400 hover:text-white transition-colors text-left"
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
