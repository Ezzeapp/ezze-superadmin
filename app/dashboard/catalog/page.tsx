"use client";
import { useState, useEffect, useMemo } from "react";
import { Search, Plus, RefreshCw, BookOpen, Pencil, Trash2, X, Check, ChevronUp, ChevronDown, GripVertical, Shirt, LayoutGrid, Sofa, Footprints, Wind, BedDouble, Package, Scissors, Sparkles, Droplets, Layers, WashingMachine, type LucideIcon } from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";

type TabType = "services" | "products" | "order_types";

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

type OrderTypeConfig = {
  slug: string;
  label: string;
  icon: string;
  sort_order: number;
  active: boolean;
  description?: string;
};

const PRODUCT_TABS = [
  { slug: "all", label: "Все" },
  ...PRODUCTS.filter((p) => p.slug !== "main").map((p) => ({
    slug: p.slug,
    label: p.label.replace("Ezze ", ""),
  })),
];

// Icon map for order types preview
const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, LayoutGrid, Sofa, Footprints, Wind, BedDouble,
  Package, Scissors, Sparkles, Droplets, Layers, WashingMachine,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

function OrderTypeIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon size={size} />;
}

const DEFAULT_ORDER_TYPES: OrderTypeConfig[] = [
  { slug: "clothing",  label: "Одежда",     icon: "Shirt",       sort_order: 0, active: true,  description: "Одежда, пальто, куртки, костюмы" },
  { slug: "carpet",    label: "Ковёр",       icon: "LayoutGrid",  sort_order: 1, active: true,  description: "Ковры, дорожки (цена за кв.м)" },
  { slug: "furniture", label: "Мебель",      icon: "Sofa",        sort_order: 2, active: true,  description: "Диваны, кресла, матрасы" },
  { slug: "shoes",     label: "Обувь",       icon: "Footprints",  sort_order: 3, active: false, description: "Обувь, сапоги, ботинки" },
  { slug: "curtains",  label: "Шторы",       icon: "Wind",        sort_order: 4, active: false, description: "Шторы, тюль, занавески" },
  { slug: "bedding",   label: "Постельное",  icon: "BedDouble",   sort_order: 5, active: false, description: "Одеяла, подушки, постельное" },
];

export default function CatalogPage() {
  const [tab, setTab] = useState<TabType>("services");
  const [selectedProduct, setSelectedProduct] = useState("beauty");
  const [search, setSearch] = useState("");

  // ── Services & Products state ────────────────────────────────────────────────
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

  // ── Order Types state ────────────────────────────────────────────────────────
  const [orderTypes, setOrderTypes] = useState<OrderTypeConfig[]>([]);
  const [loadingOrderTypes, setLoadingOrderTypes] = useState(false);
  const [savingOrderTypes, setSavingOrderTypes] = useState(false);
  const [orderTypesChanged, setOrderTypesChanged] = useState(false);

  const [editingType, setEditingType] = useState<OrderTypeConfig | null>(null);
  const [isNewType, setIsNewType] = useState(false);
  const [typeFormSlug, setTypeFormSlug] = useState("");
  const [typeFormLabel, setTypeFormLabel] = useState("");
  const [typeFormIcon, setTypeFormIcon] = useState("Package");
  const [typeFormDesc, setTypeFormDesc] = useState("");

  const [deleteTypeTarget, setDeleteTypeTarget] = useState<OrderTypeConfig | null>(null);

  useEffect(() => {
    if (tab === "services") loadServices();
    else if (tab === "products") loadProductsData();
    else if (tab === "order_types") loadOrderTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedProduct]);

  // ── Services load / save ─────────────────────────────────────────────────────
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

  // ── Order Types load / save ──────────────────────────────────────────────────
  async function loadOrderTypes() {
    setLoadingOrderTypes(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("value")
        .eq("product", "cleaning")
        .eq("key", "cleaning_order_types_config")
        .maybeSingle();
      if (error) throw error;
      if (data?.value) {
        try {
          const parsed = JSON.parse(data.value) as OrderTypeConfig[];
          setOrderTypes(parsed.length > 0 ? parsed : DEFAULT_ORDER_TYPES);
        } catch {
          setOrderTypes(DEFAULT_ORDER_TYPES);
        }
      } else {
        setOrderTypes(DEFAULT_ORDER_TYPES);
      }
      setOrderTypesChanged(false);
    } catch (e) {
      console.error("loadOrderTypes error:", e);
      setOrderTypes(DEFAULT_ORDER_TYPES);
    } finally {
      setLoadingOrderTypes(false);
    }
  }

  async function saveOrderTypes() {
    setSavingOrderTypes(true);
    try {
      const { error } = await supabase
        .from("app_settings")
        .upsert(
          { product: "cleaning", key: "cleaning_order_types_config", value: JSON.stringify(orderTypes) },
          { onConflict: "product,key" }
        );
      if (error) throw error;
      setOrderTypesChanged(false);
    } catch (e) {
      console.error("saveOrderTypes error:", e);
    } finally {
      setSavingOrderTypes(false);
    }
  }

  function updateOrderTypes(updated: OrderTypeConfig[]) {
    setOrderTypes(updated);
    setOrderTypesChanged(true);
  }

  function toggleTypeActive(slug: string) {
    updateOrderTypes(orderTypes.map(t => t.slug === slug ? { ...t, active: !t.active } : t));
  }

  function moveType(index: number, direction: "up" | "down") {
    const arr = [...orderTypes];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= arr.length) return;
    [arr[index], arr[targetIndex]] = [arr[targetIndex], arr[index]];
    // Update sort_order values
    const reordered = arr.map((t, i) => ({ ...t, sort_order: i }));
    updateOrderTypes(reordered);
  }

  function openNewType() {
    setIsNewType(true);
    setEditingType(null);
    setTypeFormSlug("");
    setTypeFormLabel("");
    setTypeFormIcon("Package");
    setTypeFormDesc("");
  }

  function openEditType(t: OrderTypeConfig) {
    setIsNewType(false);
    setEditingType(t);
    setTypeFormSlug(t.slug);
    setTypeFormLabel(t.label);
    setTypeFormIcon(t.icon);
    setTypeFormDesc(t.description ?? "");
  }

  function closeTypeModal() {
    setEditingType(null);
    setIsNewType(false);
  }

  function saveTypeForm() {
    if (!typeFormSlug.trim() || !typeFormLabel.trim()) return;
    const slug = typeFormSlug.trim().toLowerCase().replace(/\s+/g, "_");
    if (isNewType) {
      // Check slug uniqueness
      if (orderTypes.some(t => t.slug === slug)) {
        alert("Тип с таким слагом уже существует");
        return;
      }
      const newType: OrderTypeConfig = {
        slug,
        label: typeFormLabel.trim(),
        icon: typeFormIcon,
        sort_order: orderTypes.length,
        active: false,
        description: typeFormDesc.trim() || undefined,
      };
      updateOrderTypes([...orderTypes, newType]);
    } else if (editingType) {
      updateOrderTypes(orderTypes.map(t =>
        t.slug === editingType.slug
          ? { ...t, slug, label: typeFormLabel.trim(), icon: typeFormIcon, description: typeFormDesc.trim() || undefined }
          : t
      ));
    }
    closeTypeModal();
  }

  function confirmDeleteType() {
    if (!deleteTypeTarget) return;
    updateOrderTypes(
      orderTypes
        .filter(t => t.slug !== deleteTypeTarget.slug)
        .map((t, i) => ({ ...t, sort_order: i }))
    );
    setDeleteTypeTarget(null);
  }

  // ── Filters ──────────────────────────────────────────────────────────────────
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

  // ── Services/Products modal ──────────────────────────────────────────────────
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

  const isTypeModalOpen = isNewType || editingType !== null;

  return (
    <div className="p-6 max-w-6xl">
      {/* ── Header ── */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Глобальный справочник</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === "order_types"
              ? `Типы заказов · Cleaning · ${orderTypes.length} типов`
              : `${tab === "services" ? "Услуги" : "Товары"} · ${total.toLocaleString("ru-RU")} записей`
            }
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tab !== "order_types" && (
            <button
              onClick={() => tab === "services" ? loadServices() : loadProductsData()}
              className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Обновить"
            >
              <RefreshCw size={15} />
            </button>
          )}
          {tab === "order_types" ? (
            <>
              <button
                onClick={loadOrderTypes}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Сбросить"
              >
                <RefreshCw size={15} />
              </button>
              {orderTypesChanged && (
                <button
                  onClick={saveOrderTypes}
                  disabled={savingOrderTypes}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  <Check size={14} />
                  {savingOrderTypes ? "Сохранение..." : "Сохранить"}
                </button>
              )}
              <button
                onClick={openNewType}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
              >
                <Plus size={15} />
                Добавить
              </button>
            </>
          ) : (
            <button
              onClick={openNew}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              <Plus size={15} />
              Добавить
            </button>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {([
          { key: "services", label: "Услуги" },
          { key: "products", label: "Товары" },
          { key: "order_types", label: "Типы заказов" },
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

      {/* ── Product filter (for services/products only) ── */}
      {tab !== "order_types" && (
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
      )}

      {/* ── Search (for services/products only) ── */}
      {tab !== "order_types" && (
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
      )}

      {/* ── Order Types tab ── */}
      {tab === "order_types" && (
        <div>
          {/* Info banner */}
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Типы заказов для продукта <strong>Cleaning</strong>. Активные типы отображаются как вкладки в POS-кассе.
              После изменений нажмите <strong>Сохранить</strong>.
            </p>
          </div>

          {loadingOrderTypes ? (
            <div className="text-center py-12 text-gray-400 text-sm">Загрузка...</div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-10"></th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-12">Икон.</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Слаг</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Название</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Описание</th>
                    <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide w-20">Активен</th>
                    <th className="px-4 py-3 w-16"></th>
                    <th className="px-4 py-3 w-20"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {orderTypes.map((t, idx) => (
                    <tr key={t.slug} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      {/* Reorder */}
                      <td className="px-2 py-3">
                        <div className="flex flex-col gap-0.5">
                          <button
                            onClick={() => moveType(idx, "up")}
                            disabled={idx === 0}
                            className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors"
                          >
                            <ChevronUp size={13} />
                          </button>
                          <button
                            onClick={() => moveType(idx, "down")}
                            disabled={idx === orderTypes.length - 1}
                            className="p-0.5 rounded text-gray-300 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-20 transition-colors"
                          >
                            <ChevronDown size={13} />
                          </button>
                        </div>
                      </td>
                      {/* Icon */}
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                          <OrderTypeIcon name={t.icon} size={16} />
                        </div>
                      </td>
                      {/* Slug */}
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">
                          {t.slug}
                        </code>
                      </td>
                      {/* Label */}
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                        {t.label}
                      </td>
                      {/* Description */}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px]">
                        <span className="truncate block text-xs">{t.description || "—"}</span>
                      </td>
                      {/* Active toggle */}
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleTypeActive(t.slug)}
                          className={[
                            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                            t.active ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700",
                          ].join(" ")}
                        >
                          <span
                            className={[
                              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
                              t.active ? "translate-x-4" : "translate-x-0",
                            ].join(" ")}
                          />
                        </button>
                      </td>
                      {/* Edit */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditType(t)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                            title="Редактировать"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTypeTarget(t)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Save hint */}
          {orderTypesChanged && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={saveOrderTypes}
                disabled={savingOrderTypes}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Check size={15} />
                {savingOrderTypes ? "Сохранение..." : "Сохранить изменения"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Services / Products table ── */}
      {tab !== "order_types" && (
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
      )}

      {/* ── Service/Product modal ── */}
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

      {/* ── Order Type modal ── */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                {isNewType ? "Добавить тип" : "Редактировать тип"}
              </h2>
              <button onClick={closeTypeModal} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors">
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Слаг *</label>
                <input
                  type="text"
                  value={typeFormSlug}
                  onChange={(e) => setTypeFormSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                  autoFocus
                  placeholder="clothing, carpet..."
                  disabled={!isNewType}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Латинские буквы и _, не изменяется после создания</p>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название *</label>
                <input
                  type="text"
                  value={typeFormLabel}
                  onChange={(e) => setTypeFormLabel(e.target.value)}
                  placeholder="Одежда, Ковёр..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Иконка</label>
                <div className="flex items-center gap-2">
                  <select
                    value={typeFormIcon}
                    onChange={(e) => setTypeFormIcon(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {ICON_OPTIONS.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                  <div className="w-9 h-9 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-800">
                    <OrderTypeIcon name={typeFormIcon} size={18} />
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Описание</label>
                <input
                  type="text"
                  value={typeFormDesc}
                  onChange={(e) => setTypeFormDesc(e.target.value)}
                  placeholder="Краткое описание..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={saveTypeForm}
                disabled={!typeFormSlug.trim() || !typeFormLabel.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Check size={14} /> Сохранить
              </button>
              <button
                onClick={closeTypeModal}
                className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete service/product confirm ── */}
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

      {/* ── Delete order type confirm ── */}
      {deleteTypeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-red-600" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Удалить тип заказа?</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">«{deleteTypeTarget.label}» ({deleteTypeTarget.slug})</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={confirmDeleteType}
                className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
              <button
                onClick={() => setDeleteTypeTarget(null)}
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
