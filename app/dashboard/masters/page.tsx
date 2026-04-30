"use client";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Search, ChevronDown, RefreshCw, Users, Trash2 } from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";
import ProductTabs from "../../components/ProductTabs";

// Продукты без "main" (ezze.site — там нет мастеров)
const PRODUCT_TABS = [
  { slug: "all", label: "Все" },
  ...PRODUCTS.filter((p) => p.slug !== "main").map((p) => ({
    slug: p.slug,
    label: p.label.replace("Ezze ", ""),
  })),
];

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  pro: "Pro",
  enterprise: "Enterprise",
};
const PLAN_COLORS: Record<string, string> = {
  free: "text-gray-600 bg-gray-100",
  pro: "text-indigo-700 bg-indigo-100",
  enterprise: "text-purple-700 bg-purple-100",
};

type Master = {
  id: string;
  plan: string;
  disabled: boolean;
  created_at: string;
  product: string;
  master_profiles: {
    display_name: string | null;
    profession: string | null;
    tg_chat_id: string | null;
    phone: string | null;
  } | null;
};

const PAGE_SIZE = 30;

export default function MastersPage() {
  const searchParams = useSearchParams();
  const productFromUrl = searchParams.get("product");
  const [masters, setMasters] = useState<Master[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(productFromUrl || "all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [actionOpen, setActionOpen] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  // Удаление
  const [deleteTarget, setDeleteTarget] = useState<Master | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    loadMasters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProduct, page]);

  async function loadMasters() {
    setLoading(true);
    try {
      let query = supabase
        .from("users")
        .select(
          `id, plan, disabled, created_at, product,
           master_profiles (display_name, profession, tg_chat_id, phone)`,
          { count: "exact" }
        )
        .neq("is_admin", true)
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (selectedProduct !== "all") {
        query = query.eq("product", selectedProduct);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      setMasters((data as unknown as Master[]) || []);
      setTotal(count || 0);
    } catch (e) {
      console.error("loadMasters error:", e);
    } finally {
      setLoading(false);
    }
  }

  // Client-side поиск по имени и профессии
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return masters;
    return masters.filter((m) => {
      const name = (m.master_profiles?.display_name || "").toLowerCase();
      const prof = (m.master_profiles?.profession || "").toLowerCase();
      const phone = (m.master_profiles?.phone || "").toLowerCase();
      return name.includes(q) || prof.includes(q) || phone.includes(q);
    });
  }, [masters, search]);

  async function changePlan(userId: string, newPlan: string) {
    setSaving(userId);
    try {
      await supabase.from("users").update({ plan: newPlan }).eq("id", userId);
      setMasters((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, plan: newPlan } : m))
      );
    } finally {
      setSaving(null);
      setActionOpen(null);
    }
  }

  async function toggleDisabled(userId: string, current: boolean) {
    setSaving(userId);
    try {
      await supabase.from("users").update({ disabled: !current }).eq("id", userId);
      setMasters((prev) =>
        prev.map((m) => (m.id === userId ? { ...m, disabled: !current } : m))
      );
    } finally {
      setSaving(null);
      setActionOpen(null);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { userId: deleteTarget.id },
      });

      if (error) {
        const msg = (error as { message?: string })?.message || "Ошибка удаления";
        throw new Error(msg);
      }
      if (data?.message && data.message !== "ok") {
        throw new Error(data.message);
      }

      // Убираем из списка
      setMasters((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setTotal((t) => t - 1);
      setDeleteTarget(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  const productEmoji: Record<string, string> = {
    beauty: "💄", clinic: "🏥", workshop: "🔧", edu: "📚",
    hotel: "🏨", food: "🍕", event: "🎉", farm: "🌾",
    transport: "🚗", build: "🏗️", trade: "🛒",
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="p-6">
      {/* В контексте продукта — ProductTabs сверху */}
      {productFromUrl && PRODUCTS.find((p) => p.slug === productFromUrl) && (
        <ProductTabs product={productFromUrl} active="masters" />
      )}

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <Users size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Мастера</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {productFromUrl ? `${productFromUrl} · ` : "Все · "}
            {total.toLocaleString("ru-RU")} чел.
          </p>
        </div>
        <button
          onClick={() => { setPage(0); loadMasters(); }}
          className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Обновить"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Фильтр по продукту — скрываем если зашли из контекста продукта */}
      {!productFromUrl && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRODUCT_TABS.map((tab) => (
            <button
              key={tab.slug}
              onClick={() => { setSelectedProduct(tab.slug); setPage(0); }}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                selectedProduct === tab.slug
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              {tab.slug !== "all" && (productEmoji[tab.slug] || "")} {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по имени, профессии, телефону..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Таблица — overflow-visible чтобы dropdown не обрезался */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide rounded-tl-xl">Мастер</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Профессия</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Продукт</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Тариф</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Статус</th>
              <th className="px-4 py-3 rounded-tr-xl" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {loading ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  Загрузка...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-12 text-gray-400 text-sm">
                  {search ? "Ничего не найдено" : "Мастеров нет"}
                </td>
              </tr>
            ) : (
              filtered.map((master) => {
                const name = master.master_profiles?.display_name || "—";
                const prof = master.master_profiles?.profession || "—";
                const phone = master.master_profiles?.phone || "";
                const prod = master.product || "beauty";
                const isSaving = saving === master.id;

                return (
                  <tr key={master.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    {/* Имя + телефон */}
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-[160px]">{name}</div>
                      {phone && <div className="text-xs text-gray-400 mt-0.5">{phone}</div>}
                    </td>

                    {/* Профессия */}
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-300 max-w-[180px]">
                      <span className="truncate block">{prof}</span>
                    </td>

                    {/* Продукт */}
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        {productEmoji[prod] || "📦"} {prod}
                      </span>
                    </td>

                    {/* Тариф */}
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PLAN_COLORS[master.plan] || PLAN_COLORS.free}`}>
                        {PLAN_LABELS[master.plan] || master.plan}
                      </span>
                    </td>

                    {/* Дата */}
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(master.created_at)}
                    </td>

                    {/* Статус */}
                    <td className="px-4 py-3">
                      {master.disabled ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-red-700 bg-red-100">
                          Отключён
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100">
                          Активен
                        </span>
                      )}
                    </td>

                    {/* Действия */}
                    <td className="px-4 py-3 relative">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionOpen(actionOpen === master.id ? null : master.id)}
                          disabled={isSaving}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
                        >
                          {isSaving ? "..." : "Действия"}
                          <ChevronDown size={12} />
                        </button>

                        {actionOpen === master.id && (
                          <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-10 overflow-hidden">
                            {/* Смена тарифа */}
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                              Сменить тариф
                            </div>
                            {["free", "pro", "enterprise"].map((plan) => (
                              <button
                                key={plan}
                                onClick={() => changePlan(master.id, plan)}
                                disabled={master.plan === plan}
                                className={[
                                  "w-full text-left px-3 py-2 text-sm transition-colors",
                                  master.plan === plan
                                    ? "text-indigo-600 font-semibold bg-indigo-50 dark:bg-indigo-900/20"
                                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700",
                                ].join(" ")}
                              >
                                {PLAN_LABELS[plan]}
                                {master.plan === plan && " ✓"}
                              </button>
                            ))}

                            {/* Отключить / включить */}
                            <div className="border-t border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() => toggleDisabled(master.id, master.disabled)}
                                className={[
                                  "w-full text-left px-3 py-2 text-sm transition-colors",
                                  master.disabled
                                    ? "text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    : "text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                                ].join(" ")}
                              >
                                {master.disabled ? "✅ Включить" : "🚫 Отключить"}
                              </button>
                            </div>

                            {/* Удалить */}
                            <div className="border-t border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() => {
                                  setActionOpen(null);
                                  setDeleteError("");
                                  setDeleteTarget(master);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
                              >
                                <Trash2 size={13} />
                                Удалить аккаунт
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из {total.toLocaleString("ru-RU")}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              ← Назад
            </button>
            <span className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}

      {/* Закрыть dropdown при клике вне */}
      {actionOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setActionOpen(null)} />
      )}

      {/* Модалка подтверждения удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Удалить аккаунт?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deleteTarget.master_profiles?.display_name || "—"}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Все данные мастера будут удалены безвозвратно: профиль, услуги, записи, клиенты.
              Мастер получит уведомление в Telegram.
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 mb-3">⚠️ {deleteError}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Удаляем..." : "Да, удалить"}
              </button>
              <button
                onClick={() => { setDeleteTarget(null); setDeleteError(""); }}
                disabled={deleting}
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
