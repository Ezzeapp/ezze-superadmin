"use client";
import { useEffect, useMemo, useState } from "react";
import { Search, Plus, Pencil, Trash2, X, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import ProductTabs from "../../components/ProductTabs";

// ── Types ─────────────────────────────────────────────────────────────────────
type RentalCategory = "transport" | "tool" | "event" | "sport" | "household" | "other";
type PricingUnit = "hour" | "day" | "week" | "month";

type GlobalRentalItem = {
  id: string;
  product: string;
  name: string;
  category: RentalCategory;
  subcategory: string | null;
  default_pricing_unit: PricingUnit;
  default_price_per_day: number;
  default_price_per_hour: number | null;
  default_min_rental_minutes: number;
  default_deposit_required: boolean;
  default_deposit_percent: number;
  icon: string | null;
  sort_order: number;
  active: boolean;
  created_at: string;
};

const CATEGORY_LABELS: Record<RentalCategory, string> = {
  transport: "Транспорт",
  tool:      "Инструмент",
  event:     "Мероприятия",
  sport:     "Спорт",
  household: "Бытовое",
  other:     "Прочее",
};

const CATEGORY_COLORS: Record<RentalCategory, string> = {
  transport: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  tool:      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  event:     "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300",
  sport:     "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
  household: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300",
  other:     "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

const PRICING_UNIT_LABELS: Record<PricingUnit, string> = {
  hour:  "час",
  day:   "день",
  week:  "неделя",
  month: "месяц",
};

const PAGE_SIZE = 50;

// ── Component ─────────────────────────────────────────────────────────────────
export default function RentalCatalogPage() {
  const [items, setItems] = useState<GlobalRentalItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [editing, setEditing] = useState<GlobalRentalItem | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GlobalRentalItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [category, setCategory] = useState<RentalCategory>("transport");
  const [subcategory, setSubcategory] = useState("");
  const [pricingUnit, setPricingUnit] = useState<PricingUnit>("day");
  const [pricePerDay, setPricePerDay] = useState("");
  const [pricePerHour, setPricePerHour] = useState("");
  const [depositRequired, setDepositRequired] = useState(false);
  const [depositPercent, setDepositPercent] = useState("0");
  const [sortOrder, setSortOrder] = useState("0");
  const [active, setActive] = useState(true);
  const [error, setError] = useState("");

  // ── Load ─────────────────────────────────────────────────────────────────────
  async function loadItems() {
    setLoading(true);
    const { data, error } = await supabase
      .from("global_rental_items")
      .select("*")
      .eq("product", "rental")
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });
    setLoading(false);
    if (error) {
      console.error("Load error:", error);
      return;
    }
    setItems((data ?? []) as GlobalRentalItem[]);
  }

  useEffect(() => {
    loadItems();
  }, []);

  // ── Filter / paginate ────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (q && !`${it.name} ${it.subcategory ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [items, search, categoryFilter]);

  const paged = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.category] = (c[it.category] || 0) + 1;
    return c;
  }, [items]);

  // ── Form helpers ─────────────────────────────────────────────────────────────
  function resetForm() {
    setName("");
    setCategory("transport");
    setSubcategory("");
    setPricingUnit("day");
    setPricePerDay("");
    setPricePerHour("");
    setDepositRequired(false);
    setDepositPercent("0");
    setSortOrder("0");
    setActive(true);
    setError("");
  }

  function openAdd() {
    resetForm();
    setAddOpen(true);
  }

  function openEdit(item: GlobalRentalItem) {
    setName(item.name);
    setCategory(item.category);
    setSubcategory(item.subcategory ?? "");
    setPricingUnit(item.default_pricing_unit);
    setPricePerDay(String(item.default_price_per_day ?? ""));
    setPricePerHour(item.default_price_per_hour != null ? String(item.default_price_per_hour) : "");
    setDepositRequired(item.default_deposit_required);
    setDepositPercent(String(item.default_deposit_percent ?? 0));
    setSortOrder(String(item.sort_order ?? 0));
    setActive(item.active);
    setError("");
    setEditing(item);
  }

  function closeForm() {
    setAddOpen(false);
    setEditing(null);
    resetForm();
  }

  async function handleSave() {
    if (!name.trim()) { setError("Введите название"); return; }
    if (!pricePerDay && !pricePerHour) { setError("Укажите цену за день или за час"); return; }
    setSaving(true);
    setError("");
    const payload = {
      name: name.trim(),
      category,
      subcategory: subcategory.trim() || null,
      default_pricing_unit: pricingUnit,
      default_price_per_day: Number(pricePerDay) || 0,
      default_price_per_hour: pricePerHour ? Number(pricePerHour) : null,
      default_deposit_required: depositRequired,
      default_deposit_percent: depositRequired ? (Number(depositPercent) || 0) : 0,
      sort_order: Number(sortOrder) || 0,
      active,
      product: "rental",
    };
    let resp;
    if (editing) {
      resp = await supabase.from("global_rental_items").update(payload).eq("id", editing.id);
    } else {
      resp = await supabase.from("global_rental_items").insert(payload);
    }
    setSaving(false);
    if (resp.error) {
      setError("Ошибка: " + resp.error.message);
      return;
    }
    closeForm();
    loadItems();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    const { error } = await supabase.from("global_rental_items").delete().eq("id", deleteTarget.id);
    setDeleting(false);
    if (error) {
      console.error("Delete error:", error);
      return;
    }
    setDeleteTarget(null);
    loadItems();
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6">
      <ProductTabs product="rental" active="catalog">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <KeyRound size={24} className="text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Справочник объектов аренды
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {items.length} позиций · продукт <code className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded text-xs">rental</code>
            </p>
          </div>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
        >
          <Plus size={16} />
          Добавить позицию
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Поиск по названию..."
            className="w-full h-9 pl-9 pr-3 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4">
        {[
          { key: "all", label: "Все" },
          ...Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ key: k, label: v })),
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setCategoryFilter(tab.key); setPage(1); }}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              categoryFilter === tab.key
                ? "bg-indigo-600 text-white border-indigo-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700 dark:hover:bg-gray-700"
            }`}
          >
            {tab.label} ({counts[tab.key] ?? 0})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 size={20} className="animate-spin text-gray-400" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-gray-200 dark:border-gray-700">
          <KeyRound size={32} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {items.length === 0 ? "Справочник пуст. Добавьте первую позицию." : "Ничего не найдено"}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-900">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800 text-xs uppercase text-gray-500 dark:text-gray-400">
              <tr>
                <th className="text-left p-3 font-medium">Название</th>
                <th className="text-left p-3 font-medium">Категория</th>
                <th className="text-left p-3 font-medium">Подкат.</th>
                <th className="text-right p-3 font-medium">Цена/день</th>
                <th className="text-right p-3 font-medium">Цена/час</th>
                <th className="text-center p-3 font-medium">Депозит</th>
                <th className="text-center p-3 font-medium">Порядок</th>
                <th className="text-center p-3 font-medium">Активен</th>
                <th className="w-20 p-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {paged.map((item) => (
                <tr key={item.id} className={`hover:bg-gray-50 dark:hover:bg-gray-800 ${!item.active ? "opacity-50" : ""}`}>
                  <td className="p-3 font-medium text-gray-900 dark:text-white">{item.name}</td>
                  <td className="p-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_COLORS[item.category]}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                  </td>
                  <td className="p-3 text-gray-500 dark:text-gray-400 text-xs">{item.subcategory ?? "—"}</td>
                  <td className="p-3 text-right tabular-nums">
                    {item.default_price_per_day > 0 ? item.default_price_per_day.toLocaleString("ru") : "—"}
                  </td>
                  <td className="p-3 text-right tabular-nums">
                    {item.default_price_per_hour != null && item.default_price_per_hour > 0
                      ? item.default_price_per_hour.toLocaleString("ru")
                      : "—"}
                  </td>
                  <td className="p-3 text-center text-xs">
                    {item.default_deposit_required ? `${item.default_deposit_percent}%` : "—"}
                  </td>
                  <td className="p-3 text-center text-xs text-gray-500">{item.sort_order}</td>
                  <td className="p-3 text-center">
                    <span className={`inline-block w-2 h-2 rounded-full ${item.active ? "bg-green-500" : "bg-gray-300"}`} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700"
                        title="Редактировать"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        className="p-1.5 rounded text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700"
                        title="Удалить"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-2 mt-4">
          <button
            onClick={() => setPage((p) => p - 1)}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-md border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
          >
            Назад
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= totalPages}
            className="px-3 py-1.5 rounded-md border text-sm font-medium disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-gray-800 dark:border-gray-700"
          >
            Далее
          </button>
        </div>
      )}

      {/* Add / Edit modal */}
      {(addOpen || editing) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editing ? "Редактировать позицию" : "Новая позиция справочника"}
              </h2>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Легковой автомобиль (эконом)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Категория</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as RentalCategory)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Подкатегория</label>
                  <input
                    value={subcategory}
                    onChange={(e) => setSubcategory(e.target.value)}
                    placeholder="Авто, Бензо..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Основная единица тарификации</label>
                <select
                  value={pricingUnit}
                  onChange={(e) => setPricingUnit(e.target.value as PricingUnit)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {Object.entries(PRICING_UNIT_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Цена / день</label>
                  <input
                    type="number"
                    min={0}
                    value={pricePerDay}
                    onChange={(e) => setPricePerDay(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Цена / час</label>
                  <input
                    type="number"
                    min={0}
                    value={pricePerHour}
                    onChange={(e) => setPricePerHour(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="border rounded-lg p-3 dark:border-gray-700 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={depositRequired}
                    onChange={(e) => setDepositRequired(e.target.checked)}
                  />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">Требуется депозит</span>
                </label>
                {depositRequired && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">% от стоимости аренды</label>
                    <input
                      type="number"
                      min={0}
                      max={500}
                      value={depositPercent}
                      onChange={(e) => setDepositPercent(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Например: 100 = равен стоимости, 50 = половина</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Порядок сортировки</label>
                  <input
                    type="number"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer pb-2">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                    />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Активна</span>
                  </label>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>

            <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-2 justify-end">
              <button
                onClick={closeForm}
                disabled={saving}
                className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? "Сохраняем..." : editing ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-sm">
            <div className="p-6">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Удалить позицию?</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                «{deleteTarget.name}» будет удалена из справочника. Существующие объекты у мастеров не пострадают.
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {deleting ? "Удаляем..." : "Удалить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </ProductTabs>
    </div>
  );
}
