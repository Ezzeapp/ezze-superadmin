"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, ChevronDown, ChevronRight, RefreshCw, ContactRound,
  Trash2, Send, History, X, AlertCircle,
} from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";
import ProductTabs from "../../components/ProductTabs";

// ─── Типы ─────────────────────────────────────────────────────────────
type MasterRef = {
  master_id: string;
  display_name: string | null;
  profession: string | null;
  product: string | null;
  booking_slug: string | null;
  client_id: string;
  first_seen_at: string;
  total_visits: number | null;
  last_visit: string | null;
};

type PlatformClient = {
  key: string;
  phone: string | null;
  name: string | null;
  tg_chat_id: string | null;
  tg_username: string | null;
  tg_registered_at: string | null;
  lang: string | null;
  is_tg_registered: boolean;
  masters_count: number;
  masters: MasterRef[];
  activity_at: string | null;
};

type OrderRow = {
  kind: "appointment" | "cleaning" | "workshop";
  id: string;
  status: string;
  date: string | null;
  time_text: string | null;
  number: string | null;
  title: string;
  master_name: string | null;
  total: number | null;
  ready_date: string | null;
  created_at: string;
};

const FILTERS = [
  { slug: "all",      label: "Все" },
  { slug: "new",      label: "Новые (без мастеров)" },
  { slug: "one",      label: "1 мастер" },
  { slug: "multi",    label: "Несколько" },
  { slug: "no_tg",    label: "Без TG" },
  { slug: "no_phone", label: "Без телефона" },
] as const;

const PAGE_SIZE = 30;

// ═════════════════════════════════════════════════════════════════════
export default function ClientsPage() {
  const searchParams = useSearchParams();
  const productFromUrl = searchParams.get("product");
  const [rows, setRows]           = useState<PlatformClient[]>([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [filter, setFilter]       = useState<string>("all");
  const [search, setSearch]       = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage]           = useState(0);

  const [expanded, setExpanded]   = useState<Set<string>>(new Set());
  const [orders, setOrders]       = useState<Record<string, OrderRow[]>>({});
  const [ordersLoading, setOrdersLoading] = useState<Set<string>>(new Set());

  const [actionOpen, setActionOpen] = useState<string | null>(null);

  // Модалка удаления
  const [deleteTarget, setDeleteTarget] = useState<PlatformClient | null>(null);
  const [deleting, setDeleting]         = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  // Модалка сообщения
  const [msgTarget, setMsgTarget]       = useState<PlatformClient | null>(null);
  const [msgText, setMsgText]           = useState("");
  const [sending, setSending]           = useState(false);
  const [sendError, setSendError]       = useState("");
  const [sendOk, setSendOk]             = useState(false);

  // ─── Debounce поиска ─────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // ─── Загрузка списка ────────────────────────────────────────────
  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_platform_clients", {
        p_search: debounced || null,
        p_filter: filter,
        p_limit:  PAGE_SIZE,
        p_offset: page * PAGE_SIZE,
      });
      if (error) throw error;
      setRows((data?.rows ?? []) as PlatformClient[]);
      setTotal(Number(data?.total ?? 0));
    } catch (e) {
      console.error("loadClients error:", e);
      setRows([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filter, page, debounced]);

  useEffect(() => { loadClients(); }, [loadClients]);

  // ─── История заказов (ленивая загрузка) ─────────────────────────
  async function loadOrders(row: PlatformClient) {
    if (orders[row.key]) return;
    setOrdersLoading(s => new Set(s).add(row.key));
    try {
      if (row.tg_chat_id) {
        const { data } = await supabase.rpc("get_client_cabinet_orders", {
          p_tg_chat_id: row.tg_chat_id,
        });
        setOrders(o => ({ ...o, [row.key]: (data as OrderRow[] | null) ?? [] }));
      } else {
        // Без TG — тянем напрямую по client_ids всех мастеров
        const clientIds = row.masters.map(m => m.client_id);
        const collected: OrderRow[] = [];

        if (clientIds.length) {
          const [{ data: appts }, { data: cleanings }, { data: workshops }] = await Promise.all([
            supabase.from("appointments").select("id, status, date, start_time, price, notes, client_id").in("client_id", clientIds),
            supabase.from("cleaning_orders").select("id, number, status, total_amount, ready_date, notes, created_at, client_id").in("client_id", clientIds),
            supabase.from("workshop_orders").select("id, number, status, total_amount, ready_date, item_type_name, brand, model, created_at, client_id").in("client_id", clientIds),
          ]);
          const masterByClient = new Map(row.masters.map(m => [m.client_id, m.display_name ?? m.profession ?? ""]));
          (appts ?? []).forEach((a: any) => collected.push({
            kind: "appointment", id: a.id, status: a.status, date: a.date,
            time_text: a.start_time, number: null,
            title: (a.notes?.match?.(/^\[([^\]]+)\]/)?.[1]) || "—",
            master_name: masterByClient.get(a.client_id) ?? "",
            total: a.price, ready_date: null,
            created_at: a.date ?? new Date().toISOString(),
          }));
          (cleanings ?? []).forEach((c: any) => collected.push({
            kind: "cleaning", id: c.id, status: c.status, date: null, time_text: null,
            number: c.number, title: c.notes || "Квитанция",
            master_name: masterByClient.get(c.client_id) ?? "",
            total: c.total_amount, ready_date: c.ready_date, created_at: c.created_at,
          }));
          (workshops ?? []).forEach((w: any) => collected.push({
            kind: "workshop", id: w.id, status: w.status, date: null, time_text: null,
            number: w.number,
            title: [w.item_type_name, w.brand, w.model].filter(Boolean).join(" "),
            master_name: masterByClient.get(w.client_id) ?? "",
            total: w.total_amount, ready_date: w.ready_date, created_at: w.created_at,
          }));
        }
        collected.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
        setOrders(o => ({ ...o, [row.key]: collected }));
      }
    } catch (e) {
      console.error("loadOrders error:", e);
      setOrders(o => ({ ...o, [row.key]: [] }));
    } finally {
      setOrdersLoading(s => { const n = new Set(s); n.delete(row.key); return n; });
    }
  }

  function toggleExpand(row: PlatformClient) {
    setExpanded(prev => {
      const n = new Set(prev);
      if (n.has(row.key)) { n.delete(row.key); }
      else { n.add(row.key); void loadOrders(row); }
      return n;
    });
  }

  // ─── Удаление ───────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const body = deleteTarget.phone
        ? { phone: deleteTarget.phone }
        : { client_id: deleteTarget.masters[0]?.client_id };
      const { data, error } = await supabase.functions.invoke("admin-delete-client", { body });
      if (error) throw new Error((error as { message?: string })?.message || "Ошибка удаления");
      if (data?.message && data.message !== "ok") throw new Error(data.message);
      setRows(prev => prev.filter(r => r.key !== deleteTarget.key));
      setTotal(t => Math.max(0, t - 1));
      setDeleteTarget(null);
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setDeleting(false);
    }
  }

  // ─── Отправка сообщения ─────────────────────────────────────────
  async function confirmSend() {
    if (!msgTarget?.tg_chat_id || !msgText.trim()) return;
    setSending(true);
    setSendError("");
    setSendOk(false);
    try {
      const { data, error } = await supabase.functions.invoke("admin-send-client-message", {
        body: { tg_chat_id: msgTarget.tg_chat_id, text: msgText.trim() },
      });
      if (error) throw new Error((error as { message?: string })?.message || "Ошибка отправки");
      if (data?.message !== "ok") throw new Error(data?.detail || data?.message || "Не удалось отправить");
      setSendOk(true);
      setMsgText("");
      setTimeout(() => { setMsgTarget(null); setSendOk(false); }, 1200);
    } catch (e: unknown) {
      setSendError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  // ─── Утилиты ────────────────────────────────────────────────────
  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit", month: "2-digit", year: "2-digit",
    });
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // ─── Рендер ─────────────────────────────────────────────────────
  return (
    <div className="p-6">
      {/* В контексте продукта — ProductTabs сверху */}
      {productFromUrl && PRODUCTS.find((p) => p.slug === productFromUrl) && (
        <ProductTabs product={productFromUrl} active="clients" />
      )}

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <ContactRound size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Клиенты</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {productFromUrl ? `${productFromUrl} · ` : "Все · "}
            {total.toLocaleString("ru-RU")} чел.
          </p>
        </div>
        <button
          onClick={() => { setPage(0); loadClients(); }}
          className="ml-auto p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Обновить"
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Фильтры */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {FILTERS.map(tab => (
          <button
            key={tab.slug}
            onClick={() => { setFilter(tab.slug); setPage(0); }}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filter === tab.slug
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Поиск */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Имя, телефон, профессия или имя мастера..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Таблица */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="w-8 px-2 py-3 rounded-tl-xl" />
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Имя / телефон</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">TG</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Мастера</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Активность</th>
              <th className="px-4 py-3 rounded-tr-xl" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Загрузка...</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                {search ? "Ничего не найдено" : "Клиентов нет"}
              </td></tr>
            ) : rows.map(row => {
              const isOpen = expanded.has(row.key);
              const hasTg = row.is_tg_registered && row.tg_chat_id;
              const firstMasters = row.masters.slice(0, 2);
              const extra = row.masters_count - firstMasters.length;
              const ordersList = orders[row.key];

              return (
                <>
                  <tr key={row.key} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="w-8 px-2 py-3 align-top">
                      <button
                        onClick={() => toggleExpand(row)}
                        className="p-1 rounded text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700"
                        title={isOpen ? "Свернуть" : "Развернуть"}
                      >
                        <ChevronRight
                          size={14}
                          className={`transition-transform ${isOpen ? "rotate-90" : ""}`}
                        />
                      </button>
                    </td>

                    {/* Имя + телефон */}
                    <td className="px-4 py-3 align-top">
                      <div className="font-medium text-gray-900 dark:text-white truncate max-w-[220px]">
                        {row.name || "—"}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {row.phone ?? <span className="text-amber-600">нет телефона</span>}
                      </div>
                    </td>

                    {/* TG */}
                    <td className="px-4 py-3 align-top">
                      {hasTg ? (
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-xs text-gray-600 dark:text-gray-300">
                            {row.tg_username ? `@${row.tg_username}` : row.tg_chat_id}
                          </span>
                          {row.lang && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                              {row.lang}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">нет</span>
                      )}
                      {row.tg_registered_at && (
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          рег. {formatDate(row.tg_registered_at)}
                        </div>
                      )}
                    </td>

                    {/* Мастера */}
                    <td className="px-4 py-3 align-top">
                      {row.masters_count === 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-amber-700 bg-amber-100">
                          Новый · 0
                        </span>
                      ) : (
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-indigo-700 bg-indigo-100">
                            {row.masters_count}
                          </span>
                          {firstMasters.map(m => (
                            <span
                              key={m.client_id}
                              className="px-2 py-0.5 rounded-full text-[11px] text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 truncate max-w-[140px]"
                              title={`${m.display_name ?? "—"} · ${m.product ?? ""}`}
                            >
                              {m.display_name ?? m.profession ?? m.product ?? "мастер"}
                            </span>
                          ))}
                          {extra > 0 && (
                            <span className="text-[11px] text-gray-400">+{extra}</span>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Активность */}
                    <td className="px-4 py-3 align-top text-gray-500 dark:text-gray-400 text-xs">
                      {formatDate(row.activity_at)}
                    </td>

                    {/* Действия */}
                    <td className="px-4 py-3 align-top relative">
                      <div className="relative inline-block">
                        <button
                          onClick={() => setActionOpen(actionOpen === row.key ? null : row.key)}
                          className="flex items-center gap-1 px-2 py-1 text-xs rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          Действия <ChevronDown size={12} />
                        </button>

                        {actionOpen === row.key && (
                          <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg z-10 overflow-hidden">
                            <button
                              onClick={() => { setActionOpen(null); toggleExpand(row); }}
                              className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                            >
                              <History size={13} />
                              {isOpen ? "Скрыть историю" : "Посмотреть историю"}
                            </button>
                            <div className="border-t border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() => {
                                  if (!hasTg) return;
                                  setActionOpen(null);
                                  setMsgText("");
                                  setSendError("");
                                  setSendOk(false);
                                  setMsgTarget(row);
                                }}
                                disabled={!hasTg}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                                title={!hasTg ? "Нет Telegram" : undefined}
                              >
                                <Send size={13} />
                                Написать в бот
                              </button>
                            </div>
                            <div className="border-t border-gray-100 dark:border-gray-700">
                              <button
                                onClick={() => {
                                  setActionOpen(null);
                                  setDeleteError("");
                                  setDeleteTarget(row);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                              >
                                <Trash2 size={13} />
                                Удалить клиента
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>

                  {/* Expand-блок */}
                  {isOpen && (
                    <tr key={`${row.key}-expand`} className="bg-gray-50/60 dark:bg-gray-800/30">
                      <td />
                      <td colSpan={5} className="px-4 py-3">
                        {/* Мастера подробно */}
                        {row.masters.length > 0 && (
                          <div className="mb-3">
                            <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                              Мастера ({row.masters_count})
                            </div>
                            <div className="grid gap-1.5 sm:grid-cols-2">
                              {row.masters.map(m => (
                                <div
                                  key={m.client_id}
                                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                      {m.display_name ?? m.profession ?? "—"}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-0.5">
                                      {m.product ?? "—"} · с {formatDate(m.first_seen_at)}
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <div className="text-gray-600 dark:text-gray-300">
                                      {(m.total_visits ?? 0)} визит.
                                    </div>
                                    {m.last_visit && (
                                      <div className="text-[10px] text-gray-400">
                                        посл. {formatDate(m.last_visit)}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* История заказов */}
                        <div>
                          <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">
                            История заказов
                          </div>
                          {!ordersList ? (
                            <div className="text-xs text-gray-400 py-2">Загрузка...</div>
                          ) : ordersList.length === 0 ? (
                            <div className="text-xs text-gray-400 py-2">Заказов нет</div>
                          ) : (
                            <div className="overflow-x-auto">
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-gray-400">
                                    <th className="py-1.5 pr-3 font-medium">Тип</th>
                                    <th className="py-1.5 pr-3 font-medium">№ / Дата</th>
                                    <th className="py-1.5 pr-3 font-medium">Описание</th>
                                    <th className="py-1.5 pr-3 font-medium">Мастер</th>
                                    <th className="py-1.5 pr-3 font-medium">Статус</th>
                                    <th className="py-1.5 pr-3 font-medium text-right">Сумма</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/60">
                                  {ordersList.map(o => (
                                    <tr key={`${o.kind}-${o.id}`} className="text-gray-700 dark:text-gray-300">
                                      <td className="py-1.5 pr-3">
                                        {o.kind === "appointment" ? "Запись" :
                                         o.kind === "cleaning"    ? "Химчистка" : "Ремонт"}
                                      </td>
                                      <td className="py-1.5 pr-3 text-gray-500">
                                        {o.number ?? (o.date ? `${formatDate(o.date)}${o.time_text ? ` ${o.time_text}` : ""}` : "—")}
                                      </td>
                                      <td className="py-1.5 pr-3 max-w-[240px] truncate" title={o.title}>
                                        {o.title}
                                      </td>
                                      <td className="py-1.5 pr-3 truncate max-w-[140px]" title={o.master_name ?? ""}>
                                        {o.master_name ?? "—"}
                                      </td>
                                      <td className="py-1.5 pr-3">{o.status}</td>
                                      <td className="py-1.5 pr-3 text-right">
                                        {o.total ? `${Number(o.total).toLocaleString("ru-RU")} ₽` : "—"}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
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
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              ← Назад
            </button>
            <span className="px-3 py-1.5 text-gray-700 dark:text-gray-300">
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
            >
              Вперёд →
            </button>
          </div>
        </div>
      )}

      {/* Закрытие dropdown вне */}
      {actionOpen && (
        <div className="fixed inset-0 z-0" onClick={() => setActionOpen(null)} />
      )}

      {/* Модалка удаления */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Удалить клиента?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deleteTarget.name ?? deleteTarget.phone ?? "—"}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              {deleteTarget.phone
                ? `Будут удалены: TG-регистрация (если есть), карточки у мастеров (${deleteTarget.masters_count}), все связанные записи и квитанции. Клиент получит уведомление в Telegram.`
                : `Будет удалена карточка у мастера ${deleteTarget.masters[0]?.display_name ?? "—"} и все её записи/квитанции.`}
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 mb-3 flex items-start gap-1.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </p>
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

      {/* Модалка сообщения */}
      {msgTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                  <Send size={18} className="text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                    Написать клиенту
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {msgTarget.name ?? msgTarget.phone ?? msgTarget.tg_chat_id}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMsgTarget(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            <textarea
              value={msgText}
              onChange={(e) => setMsgText(e.target.value.slice(0, 4000))}
              rows={6}
              placeholder="Текст сообщения (поддерживается HTML Telegram)..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <div className="flex justify-between mt-1 text-[11px] text-gray-400">
              <span>{msgText.length} / 4000</span>
              {sendOk && <span className="text-emerald-600">Отправлено ✓</span>}
            </div>

            {sendError && (
              <p className="text-sm text-red-500 mt-2 flex items-start gap-1.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{sendError}</span>
              </p>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={confirmSend}
                disabled={sending || msgText.trim().length === 0 || sendOk}
                className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
              >
                <Send size={14} />
                {sending ? "Отправка..." : "Отправить"}
              </button>
              <button
                onClick={() => setMsgTarget(null)}
                disabled={sending}
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
