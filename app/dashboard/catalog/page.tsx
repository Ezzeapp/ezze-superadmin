"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, RefreshCw, BookOpen, Pencil, Trash2, X, Check } from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";

type TabType = "services" | "products";

type GlobalService = {
  id: string;
  name: string;
  category: string | null;
  duration_min: number | null;
  price: number | null;
  product: string;
};

type GlobalProduct = {
  id: string;
  name: string;
  category: string | null;
  unit: string | null;
  price: number | null;
  product: string;
};

const PRODUCT_TABS = [
  { slug: "all", label: "Все" },
  ...PRODUCTS.filter((p) => p.slug !== "main").map((p) => ({
    slug: p.slug,
    label: p.label.replace("Ezze ", ""),
  })),
];

export default function CatalogPage() {
  const [tab, setTab] = useState<TabType>("services");
  const [selectedProduct, setSelectedProduct] = useState("beauty");
  const [search, setSearch] = useState("");

  const [services, setServices] = useState<GlobalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [editItem, setEditItem] = useState<GlobalService | GlobalProduct | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDuration, setFormDuration] = useState("");
  const [formUnit, setFormUnit] = useState("");
  const [formPrice, setFormPrice] = useState("");
  const [formProduct, setFormProduct] = useState("beauty");

  useEffect(() => {
    if (tab === "services") loadServices();
    else loadProductsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedProduct]);

  async function loadServices() {
    setLoadingServices(true);
    try {
      let query = supabase.from("global_services").select("*").order("category").order("name");
      if (selectedProduct !== "all") query = query.eq("product", selectedProduct);
      const { data, error } = await query;
      if (error) throw error;
      setServices((data as GlobalService[]) || []);
    } catch (e) {
      console.error("loadServices error:", e);
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadProductsData() {
    setLoadingProducts(true);
    try {
      let query = supabase.from("global_products").select("*").order("category").order("name");
      if (selectedProduct !== "all") query = query.eq("product", selectedProduct);
      const { data, error } = await query;
      if (error) throw error;
      setProducts((data as GlobalProduct[]) || []);
    } catch (e) {
      console.error("loadProducts error:", e);
    } finally {
      setLoadingProducts(false);
    }
  }

  const filteredServices = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return services;
    return services.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q)
    );
  }, [services, search]);

  const filteredProducts = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return products;
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.category || "").toLowerCase().includes(q)
    );
  }, [products, search]);

  function openNew() {
    setIsNew(true);
    setEditItem(null);
    setFormName("");
    setFormCategory("");
    setFormDuration("60");
    setFormUnit("шт");
    setFormPrice("");
    setFormProduct(selectedProduct === "all" ? "beauty" : selectedProduct);
  }

  function openEdit(item: GlobalService | GlobalProduct) {
    setIsNew(false);
    setEditItem(item);
    setFormName(item.name);
    setFormCategory(item.category || "");
    setFormPrice(item.price?.toString() || "");
    setFormProduct(item.product);
    if (tab === "services") {
      setFormDuration((item as GlobalService).duration_min?.toString() || "");
    } else {
      setFormUnit((item as GlobalProduct).unit || "");
    }
  }

  function closeModal() {
    setEditItem(null);
    setIsNew(false);
  }

  const isModalOpen = isNew || editItem !== null;

  async function handleSave() {
    if (!formName.trim()) return;
    setSaving(true);
    try {
      if (tab === "services") {
        const payload = {
          name: formName.trim(),
          category: formCategory.trim() || null,
          duration_min: formDuration ? parseInt(formDuration) : null,
          price: formPrice ? parseFloat(formPrice) : null,
          product: formProduct,
        };
        if (isNew) {
          const { data, error } = await supabase.from("global_services").insert(payload).select().single();
          if (error) throw error;
          setServices((prev) => [...prev, data as GlobalService]);
        } else if (editItem) {
          const { data, error } = await supabase.from("global_services").update(payload).eq("id", editItem.id).select().single();
          if (error) throw error;
          setServices((prev) => prev.map((s) => (s.id === editItem.id ? (data as GlobalService) : s)));
        }
      } else {
        const payload = {
          name: formName.trim(),
          category: formCategory.trim() || null,
          unit: formUnit.trim() || null,
          price: formPrice ? parseFloat(formPrice) : null,
          product: formProduct,
        };
        if (isNew) {
          const { data, error } = await supabase.from("global_products").insert(payload).select().single();
          if (error) throw error;
          setProducts((prev) => [...prev, data as GlobalProduct]);
        } else if (editItem) {
          const { data, error } = await supabase.from("global_products").update(payload).eq("id", editItem.id).select().single();
          if (error) throw error;
          setProducts((prev) => prev.map((p) => (p.id === editItem.id ? (data as GlobalProduct) : p)));
        }
      }
      closeModal();
    } catch (e) {
      console.error("handleSave error:", e);
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const table = tab === "services" ? "global_services" : "global_products";
      const { error } = await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (error) throw error;
      if (tab === "services") setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      else setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (e) {
      console.error("confirmDelete error:", e);
    } finally {
      setDeleting(false);
    }
  }

  const loading = tab === "services" ? loadingServices : loadingProducts;
  const items = tab === "services" ? filteredServices : filteredProducts;
  const total = tab === "services" ? services.length : products.length;

  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Глобальный справочник</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === "services" ? "Услуги" : "Товары"} · {total.toLocaleString("ru-RU")} записей
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => tab === "services" ? loadServices() : loadProductsData()}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Обновить"
          >
            <RefreshCw size={15} />
          </button>
          <button
            onClick={openNew}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            <Plus size={15} />
            Добавить
          </button>
        </div>
      </div>

      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: "services", label: "Услуги" },
          { key: "products", label: "Товары" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); }}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key
                ? "border-indigo-600 text-indigo-600"
                : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white",
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5 mb-4">
        {PRODUCT_TABS.map((p) => (
          <button
            key={p.slug}
            onClick={() => setSelectedProduct(p.slug)}
            className={[
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              selectedProduct === p.slug
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700",
            ].join(" ")}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="relative mb-4">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию или категории..."
          className="w-full pl-9 pr-4 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Название</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Категория</th>
              {tab === "services" ? (
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Длит. (мин)</th>
              ) : (
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Ед. изм.</th>
              )}
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Цена</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Продукт</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">Загрузка...</td></tr>
            ) : items.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400 text-sm">{search ? "Ничего не найдено" : "Записей нет"}</td></tr>
            ) : items.map((item) => {
              const svc = tab === "services" ? (item as GlobalService) : null;
              const prd = tab === "products" ? (item as GlobalProduct) : null;
              return (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[200px]">
                    <span className="truncate block">{item.name}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[160px]">
                    <span className="truncate block">{item.category || "—"}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {svc ? (svc.duration_min ?? "—") : (prd?.unit || "—")}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {item.price != null ? item.price.toLocaleString("ru-RU") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {item.product}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(item)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                        title="Редактировать"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Удалить"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isNew ? "Добавить" : "Редактировать"} {tab === "services" ? "услугу" : "товар"}
              </h2>
              <button onClick={closeModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название *</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  autoFocus
                  placeholder={tab === "services" ? "Стрижка, Массаж..." : "Шампунь, Краска..."}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Категория</label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  placeholder="Волосы, Уход, Окрашивание..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              {tab === "services" ? (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Длительность (мин)</label>
                  <input
                    type="number"
                    value={formDuration}
                    onChange={(e) => setFormDuration(e.target.value)}
                    min="0"
                    placeholder="60"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Единица измерения</label>
                  <input
                    type="text"
                    value={formUnit}
                    onChange={(e) => setFormUnit(e.target.value)}
                    placeholder="шт, кг, л, мл..."
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Цена</label>
                <input
                  type="number"
                  value={formPrice}
                  onChange={(e) => setFormPrice(e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Продукт</label>
                <select
                  value={formProduct}
                  onChange={(e) => setFormProduct(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRODUCTS.filter((p) => p.slug !== "main").map((p) => (
                    <option key={p.slug} value={p.slug}>{p.label.replace("Ezze ", "")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={!formName.trim() || saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Сохраняем..." : <><Check size={14} /> Сохранить</>}
              </button>
              <button
                onClick={closeModal}
                disabled={saving}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Удалить запись?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{deleteTarget.name}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleting ? "Удаляем..." : "Удалить"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
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
