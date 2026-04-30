"use client";
import { useState, useEffect, useMemo, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import {
  Search, RefreshCw, UsersRound, Trash2, X, AlertCircle,
  ChevronRight, Crown, Globe, Lock, UserMinus, Pause, Play,
} from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";
import ProductTabs from "../../components/ProductTabs";

const PRODUCT_TABS = [
  { slug: "all", label: "Все" },
  ...PRODUCTS.filter((p) => p.slug !== "main").map((p) => ({
    slug: p.slug,
    label: p.label.replace("Ezze ", ""),
  })),
];

const PRODUCT_EMOJI: Record<string, string> = {
  beauty: "💄", clinic: "🏥", workshop: "🔧", edu: "📚",
  hotel: "🏨", food: "🍕", event: "🎉", farm: "🌾",
  transport: "🚗", build: "🏗️", trade: "🛒", cleaning: "🧹",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Владелец",
  admin: "Админ",
  operator: "Оператор",
  worker: "Сотрудник",
  member: "Участник",
};
const ROLE_COLORS: Record<string, string> = {
  owner:    "text-amber-700 bg-amber-100",
  admin:    "text-purple-700 bg-purple-100",
  operator: "text-indigo-700 bg-indigo-100",
  worker:   "text-blue-700 bg-blue-100",
  member:   "text-gray-700 bg-gray-100",
};
const STATUS_LABELS: Record<string, string> = {
  active:  "Активен",
  paused:  "Пауза",
  removed: "Удалён",
};
const STATUS_COLORS: Record<string, string> = {
  active:  "text-green-700 bg-green-100",
  paused:  "text-amber-700 bg-amber-100",
  removed: "text-gray-700 bg-gray-100",
};

type OwnerRef = {
  id: string;
  email: string | null;
  plan: string | null;
  master_profiles: { display_name: string | null; phone: string | null }[] | null;
};

type Team = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo: string | null;
  is_public: boolean;
  currency: string | null;
  product: string;
  owner_id: string;
  created_at: string;
  updated_at: string | null;
  owner: OwnerRef | null;
  members_count: number;
};

type MemberUser = {
  id: string;
  email: string | null;
  master_profiles: { display_name: string | null; phone: string | null }[] | null;
};

type Member = {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  status: string;
  joined_at: string;
  commission_pct: number | null;
  tg_chat_id: string | null;
  user: MemberUser | null;
};

const PAGE_SIZE = 30;

export default function TeamsPage() {
  const searchParams = useSearchParams();
  const productFromUrl = searchParams.get("product");
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState(productFromUrl || "all");
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);

  // Модалка деталей
  const [detailTeam, setDetailTeam] = useState<Team | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // Удаление команды
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Действия с участником
  const [memberSaving, setMemberSaving] = useState<string | null>(null);

  // Debounce поиска
  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim().toLowerCase());
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const loadTeams = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("teams")
        .select(
          `id, name, slug, description, logo, is_public, currency, product, owner_id, created_at, updated_at,
           owner:users!owner_id(id, email, plan, master_profiles(display_name, phone))`,
          { count: "exact" }
        )
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (selectedProduct !== "all") {
        query = query.eq("product", selectedProduct);
      }

      const { data, error, count } = await query;
      if (error) throw error;

      const teamsRaw = (data ?? []) as unknown as Team[];

      // Подтягиваем кол-во участников одним запросом
      const teamIds = teamsRaw.map((t) => t.id);
      const counts: Record<string, number> = {};
      if (teamIds.length) {
        const { data: memData } = await supabase
          .from("team_members")
          .select("team_id, status")
          .in("team_id", teamIds)
          .eq("status", "active");
        for (const m of memData ?? []) {
          counts[(m as { team_id: string }).team_id] =
            (counts[(m as { team_id: string }).team_id] || 0) + 1;
        }
      }

      setTeams(teamsRaw.map((t) => ({ ...t, members_count: counts[t.id] || 0 })));
      setTotal(count || 0);
    } catch (e) {
      console.error("loadTeams error:", e);
      setTeams([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [selectedProduct, page]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  const filtered = useMemo(() => {
    const q = debounced;
    if (!q) return teams;
    return teams.filter((t) => {
      const name = (t.name || "").toLowerCase();
      const slug = (t.slug || "").toLowerCase();
      const ownerName = (t.owner?.master_profiles?.[0]?.display_name || "").toLowerCase();
      const ownerEmail = (t.owner?.email || "").toLowerCase();
      const ownerPhone = (t.owner?.master_profiles?.[0]?.phone || "").toLowerCase();
      return (
        name.includes(q) ||
        slug.includes(q) ||
        ownerName.includes(q) ||
        ownerEmail.includes(q) ||
        ownerPhone.includes(q)
      );
    });
  }, [teams, debounced]);

  async function openDetails(team: Team) {
    setDetailTeam(team);
    setMembers([]);
    setLoadingMembers(true);
    try {
      const { data, error } = await supabase
        .from("team_members")
        .select(
          `id, team_id, user_id, role, status, joined_at, commission_pct, tg_chat_id,
           user:users!user_id(id, email, master_profiles(display_name, phone))`
        )
        .eq("team_id", team.id)
        .order("joined_at", { ascending: true });
      if (error) throw error;
      setMembers((data ?? []) as unknown as Member[]);
    } catch (e) {
      console.error("loadMembers error:", e);
      setMembers([]);
    } finally {
      setLoadingMembers(false);
    }
  }

  async function removeMember(memberId: string) {
    setMemberSaving(memberId);
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ status: "removed" })
        .eq("id", memberId);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, status: "removed" } : m))
      );
      if (detailTeam) {
        setTeams((prev) =>
          prev.map((t) =>
            t.id === detailTeam.id
              ? { ...t, members_count: Math.max(0, t.members_count - 1) }
              : t
          )
        );
      }
    } catch (e) {
      console.error("removeMember error:", e);
      alert("Не удалось удалить участника");
    } finally {
      setMemberSaving(null);
    }
  }

  async function togglePauseMember(member: Member) {
    setMemberSaving(member.id);
    const next = member.status === "paused" ? "active" : "paused";
    try {
      const { error } = await supabase
        .from("team_members")
        .update({ status: next })
        .eq("id", member.id);
      if (error) throw error;
      setMembers((prev) =>
        prev.map((m) => (m.id === member.id ? { ...m, status: next } : m))
      );
    } catch (e) {
      console.error("togglePauseMember error:", e);
      alert("Не удалось изменить статус");
    } finally {
      setMemberSaving(null);
    }
  }

  async function confirmDeleteTeam() {
    if (!deleteTeamTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      // Каскад: invites → members → team
      const { error: invErr } = await supabase
        .from("team_invites")
        .delete()
        .eq("team_id", deleteTeamTarget.id);
      if (invErr) throw invErr;

      const { error: memErr } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", deleteTeamTarget.id);
      if (memErr) throw memErr;

      const { error: teamErr } = await supabase
        .from("teams")
        .delete()
        .eq("id", deleteTeamTarget.id);
      if (teamErr) throw teamErr;

      setTeams((prev) => prev.filter((t) => t.id !== deleteTeamTarget.id));
      setTotal((t) => Math.max(0, t - 1));
      setDeleteTeamTarget(null);
      if (detailTeam?.id === deleteTeamTarget.id) {
        setDetailTeam(null);
      }
    } catch (e: unknown) {
      setDeleteError(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      setDeleting(false);
    }
  }

  function formatDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  function ownerName(team: Team) {
    return team.owner?.master_profiles?.[0]?.display_name || team.owner?.email || "—";
  }

  function ownerPhone(team: Team) {
    return team.owner?.master_profiles?.[0]?.phone || "";
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="p-6">
      {productFromUrl && PRODUCTS.find((p) => p.slug === productFromUrl) && (
        <ProductTabs product={productFromUrl} active="teams" />
      )}

      {/* Заголовок */}
      <div className="flex items-center gap-3 mb-6">
        <UsersRound size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Команды</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {productFromUrl ? `${productFromUrl} · ` : "Все · "}
            {total.toLocaleString("ru-RU")} шт.
          </p>
        </div>
        <button
          onClick={() => {
            setPage(0);
            loadTeams();
          }}
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
              onClick={() => {
                setSelectedProduct(tab.slug);
                setPage(0);
              }}
              className={[
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                selectedProduct === tab.slug
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              {tab.slug !== "all" && (PRODUCT_EMOJI[tab.slug] || "")} {tab.label}
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
          placeholder="Поиск по названию, slug, владельцу или телефону..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {/* Таблица */}
      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-visible">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide rounded-tl-xl">Команда</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Владелец</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Продукт</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Участников</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Видимость</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Создана</th>
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
                  {search ? "Ничего не найдено" : "Команд нет"}
                </td>
              </tr>
            ) : (
              filtered.map((team) => (
                <tr
                  key={team.id}
                  onClick={() => openDetails(team)}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors cursor-pointer"
                >
                  {/* Команда */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {team.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={team.logo}
                          alt=""
                          className="w-7 h-7 rounded-full object-cover bg-gray-100"
                        />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-[10px] font-semibold text-indigo-600">
                          {team.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-medium text-gray-900 dark:text-white truncate max-w-[180px]">
                          {team.name}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">/{team.slug}</div>
                      </div>
                    </div>
                  </td>

                  {/* Владелец */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <Crown size={12} className="text-amber-500 shrink-0" />
                      <div className="min-w-0">
                        <div className="text-gray-700 dark:text-gray-300 truncate max-w-[160px]">
                          {ownerName(team)}
                        </div>
                        {ownerPhone(team) && (
                          <div className="text-[11px] text-gray-400 mt-0.5">{ownerPhone(team)}</div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Продукт */}
                  <td className="px-4 py-3">
                    <span className="text-sm">
                      {PRODUCT_EMOJI[team.product] || "📦"} {team.product}
                    </span>
                  </td>

                  {/* Участники */}
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-indigo-700 bg-indigo-100">
                      {team.members_count}
                    </span>
                  </td>

                  {/* Видимость */}
                  <td className="px-4 py-3">
                    {team.is_public ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-green-700 bg-green-100">
                        <Globe size={11} /> Публичная
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-gray-700 bg-gray-100">
                        <Lock size={11} /> Приватная
                      </span>
                    )}
                  </td>

                  {/* Дата */}
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">
                    {formatDate(team.created_at)}
                  </td>

                  {/* Действия */}
                  <td className="px-4 py-3 text-right">
                    <ChevronRight size={14} className="inline text-gray-400" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500 dark:text-gray-400">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} из{" "}
            {total.toLocaleString("ru-RU")}
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

      {/* Модалка деталей команды */}
      {detailTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setDetailTeam(null)}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {detailTeam.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={detailTeam.logo}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-base font-semibold text-indigo-600 shrink-0">
                    {detailTeam.name?.[0]?.toUpperCase() || "?"}
                  </div>
                )}
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                    {detailTeam.name}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    /{detailTeam.slug} · {PRODUCT_EMOJI[detailTeam.product] || ""} {detailTeam.product}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailTeam(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1">
              {/* Метаданные */}
              <div className="grid grid-cols-2 gap-3 mb-5 text-sm">
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Владелец
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300">
                    <Crown size={13} className="text-amber-500" />
                    {ownerName(detailTeam)}
                  </div>
                  {ownerPhone(detailTeam) && (
                    <div className="text-xs text-gray-400 mt-0.5">{ownerPhone(detailTeam)}</div>
                  )}
                  {detailTeam.owner?.email && (
                    <div className="text-xs text-gray-400 mt-0.5">{detailTeam.owner.email}</div>
                  )}
                  {detailTeam.owner?.plan && (
                    <div className="text-[10px] text-indigo-600 mt-0.5 uppercase">
                      Тариф: {detailTeam.owner.plan}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Создана
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {formatDate(detailTeam.created_at)}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    Обновлена: {formatDate(detailTeam.updated_at)}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Видимость
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {detailTeam.is_public ? (
                      <span className="inline-flex items-center gap-1">
                        <Globe size={12} className="text-green-600" /> Публичная
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1">
                        <Lock size={12} className="text-gray-500" /> Приватная
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                    Валюта
                  </div>
                  <div className="text-gray-700 dark:text-gray-300">
                    {detailTeam.currency || "—"}
                  </div>
                </div>

                {detailTeam.description && (
                  <div className="col-span-2">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1">
                      Описание
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm">
                      {detailTeam.description}
                    </p>
                  </div>
                )}
              </div>

              {/* Участники */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                    Участники ({members.filter((m) => m.status !== "removed").length} активных
                    {members.length !== members.filter((m) => m.status !== "removed").length &&
                      `, ${members.length} всего`})
                  </div>
                </div>

                {loadingMembers ? (
                  <div className="text-xs text-gray-400 py-4 text-center">Загрузка...</div>
                ) : members.length === 0 ? (
                  <div className="text-xs text-gray-400 py-4 text-center">Участников нет</div>
                ) : (
                  <div className="space-y-1.5">
                    {members.map((m) => {
                      const name =
                        m.user?.master_profiles?.[0]?.display_name ||
                        m.user?.email ||
                        "—";
                      const phone = m.user?.master_profiles?.[0]?.phone || "";
                      const removed = m.status === "removed";
                      return (
                        <div
                          key={m.id}
                          className={[
                            "flex items-center gap-3 px-3 py-2 rounded-lg border",
                            removed
                              ? "border-gray-100 dark:border-gray-800 opacity-50"
                              : "border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
                          ].join(" ")}
                        >
                          <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-[10px] font-semibold text-gray-600 dark:text-gray-300 shrink-0">
                            {name?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {name}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">
                              {phone}
                              {phone && m.user?.email && " · "}
                              {m.user?.email}
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  ROLE_COLORS[m.role] || ROLE_COLORS.member
                                }`}
                              >
                                {ROLE_LABELS[m.role] || m.role}
                              </span>
                              <span
                                className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                  STATUS_COLORS[m.status] || STATUS_COLORS.active
                                }`}
                              >
                                {STATUS_LABELS[m.status] || m.status}
                              </span>
                              {m.commission_pct != null && (
                                <span className="text-[10px] text-gray-400">
                                  · {m.commission_pct}%
                                </span>
                              )}
                              <span className="text-[10px] text-gray-400">
                                · с {formatDate(m.joined_at)}
                              </span>
                            </div>
                          </div>
                          {!removed && (
                            <div className="flex gap-1 shrink-0">
                              <button
                                onClick={() => togglePauseMember(m)}
                                disabled={memberSaving === m.id}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors disabled:opacity-50"
                                title={m.status === "paused" ? "Активировать" : "Поставить на паузу"}
                              >
                                {m.status === "paused" ? <Play size={14} /> : <Pause size={14} />}
                              </button>
                              <button
                                onClick={() => {
                                  if (confirm(`Удалить участника "${name}" из команды?`)) {
                                    removeMember(m.id);
                                  }
                                }}
                                disabled={memberSaving === m.id}
                                className="p-1.5 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                                title="Удалить из команды"
                              >
                                <UserMinus size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer — действия команды */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex justify-between gap-2">
              <button
                onClick={() => {
                  setDeleteError("");
                  setDeleteTeamTarget(detailTeam);
                }}
                className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Удалить команду
              </button>
              <button
                onClick={() => setDetailTeam(null)}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка подтверждения удаления */}
      {deleteTeamTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  Удалить команду?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {deleteTeamTarget.name}
                </p>
              </div>
            </div>

            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
              Будут удалены: команда, все приглашения и записи участников. Сами пользователи
              (мастера и сотрудники) останутся, но потеряют доступ к данным команды.
            </p>

            {deleteError && (
              <p className="text-sm text-red-500 mb-3 flex items-start gap-1.5">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{deleteError}</span>
              </p>
            )}

            <div className="flex gap-2">
              <button
                onClick={confirmDeleteTeam}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Удаляем..." : "Да, удалить"}
              </button>
              <button
                onClick={() => {
                  setDeleteTeamTarget(null);
                  setDeleteError("");
                }}
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
