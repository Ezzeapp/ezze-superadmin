"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "next/navigation";
import ProductTabs from "../../components/ProductTabs";
import {
  Search, Plus, RefreshCw, BookOpen, Pencil, Trash2, X, Check, ChevronUp, ChevronDown,
  ChevronsUpDown, GripVertical, Shirt, LayoutGrid, Sofa, Footprints, Wind, BedDouble,
  Package, Scissors, Sparkles, Droplets, Layers, WashingMachine, Download, Upload,
  type LucideIcon,
} from "lucide-react";
import { supabase, PRODUCTS } from "../../lib/supabase";

// ── Types ─────────────────────────────────────────────────────────────────────
type TabType = "services" | "products" | "order_types";

type GlobalService = {
  id: string;
  name: string;
  order_type: string | null;   // cleaning: 'clothing' | 'carpet' | 'furniture' | etc.
  category: string | null;     // subcategory text for cleaning, category for others
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

type InlineEdit = { id: string; field: string; value: string };

// ── Constants ─────────────────────────────────────────────────────────────────
const PAGE_SIZE = 50;

const PRODUCT_TABS = [
  { slug: "all", label: "Все" },
  ...PRODUCTS.filter((p) => p.slug !== "main").map((p) => ({
    slug: p.slug,
    label: p.label.replace("Ezze ", ""),
  })),
];

const PRODUCT_COLORS: Record<string, string> = {
  beauty:   "bg-pink-100 text-pink-700",
  cleaning: "bg-blue-100 text-blue-700",
  clinic:   "bg-green-100 text-green-700",
  farm:     "bg-amber-100 text-amber-700",
  auto:     "bg-orange-100 text-orange-700",
  fitness:  "bg-violet-100 text-violet-700",
  hotel:    "bg-sky-100 text-sky-700",
  laundry:  "bg-cyan-100 text-cyan-700",
  photo:    "bg-rose-100 text-rose-700",
  vet:      "bg-lime-100 text-lime-700",
};

const ICON_MAP: Record<string, LucideIcon> = {
  Shirt, LayoutGrid, Sofa, Footprints, Wind, BedDouble,
  Package, Scissors, Sparkles, Droplets, Layers, WashingMachine,
};
const ICON_OPTIONS = Object.keys(ICON_MAP);

const COMMON_UNITS = ["шт", "кг", "г", "л", "мл", "упак", "пара", "компл", "м", "кв.м"];
const DURATION_PRESETS = [15, 30, 45, 60, 90, 120];

const DEFAULT_ORDER_TYPES: OrderTypeConfig[] = [
  { slug: "clothing",  label: "Одежда",     icon: "Shirt",      sort_order: 0, active: true,  description: "Одежда, пальто, куртки, костюмы" },
  { slug: "carpet",    label: "Ковёр",       icon: "LayoutGrid", sort_order: 1, active: true,  description: "Ковры, дорожки (цена за кв.м)" },
  { slug: "furniture", label: "Мебель",      icon: "Sofa",       sort_order: 2, active: true,  description: "Диваны, кресла, матрасы" },
  { slug: "shoes",     label: "Обувь",       icon: "Footprints", sort_order: 3, active: false, description: "Обувь, сапоги, ботинки" },
  { slug: "curtains",  label: "Шторы",       icon: "Wind",       sort_order: 4, active: false, description: "Шторы, тюль, занавески" },
  { slug: "bedding",   label: "Постельное",  icon: "BedDouble",  sort_order: 5, active: false, description: "Одеяла, подушки, постельное" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function OrderTypeIcon({ name, size = 16 }: { name: string; size?: number }) {
  const Icon = ICON_MAP[name] ?? Package;
  return <Icon size={size} />;
}

function SortIcon({ col, sortKey, sortAsc }: { col: string; sortKey: string; sortAsc: boolean }) {
  if (sortKey !== col) return <ChevronsUpDown size={13} className="ml-1 text-gray-300" />;
  return sortAsc
    ? <ChevronUp size={13} className="ml-1 text-indigo-600" />
    : <ChevronDown size={13} className="ml-1 text-indigo-600" />;
}

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, ""));
  return lines.slice(1).map((line) => {
    const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,)|(?<=,)$)/g) || line.split(",");
    return Object.fromEntries(
      headers.map((h, i) => [h, (values[i] ?? "").trim().replace(/^["']|["']$/g, "")])
    );
  });
}

function exportToCSV(rows: GlobalService[] | GlobalProduct[], tab: "services" | "products") {
  const headers = tab === "services"
    ? ["name", "category", "duration_min", "price", "product"]
    : ["name", "category", "unit", "price", "product"];
  const bom = "\uFEFF";
  const csv = bom + [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => {
        const v = (r as Record<string, unknown>)[h];
        return v != null ? `"${String(v).replace(/"/g, '""')}"` : "";
      }).join(",")
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${tab}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function CatalogPage() {
  const searchParams = useSearchParams();
  const productFromUrl = searchParams.get("product");
  const [tab, setTab] = useState<TabType>("services");
  const [selectedProduct, setSelectedProduct] = useState(productFromUrl || "beauty");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortKey, setSortKey] = useState("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);

  // ── Services & Products ──────────────────────────────────────────────────────
  const [services, setServices] = useState<GlobalService[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [products, setProducts] = useState<GlobalProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Add modal (new item only)
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formName, setFormName] = useState("");
  const [formOrderType, setFormOrderType] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [formDuration, setFormDuration] = useState("60");
  const [formUnit, setFormUnit] = useState("шт");
  const [formPrice, setFormPrice] = useState("");
  const [formProduct, setFormProduct] = useState("beauty");

  // Inline editing
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [inlineSaving, setInlineSaving] = useState<string | null>(null); // item id

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // CSV Import
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importPreview, setImportPreview] = useState<Record<string, string>[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Order Types ──────────────────────────────────────────────────────────────
  const [orderTypes, setOrderTypes] = useState<OrderTypeConfig[]>([]);
  const [loadingOrderTypes, setLoadingOrderTypes] = useState(false);
  const [savingOrderTypes, setSavingOrderTypes] = useState(false);

  const [editingType, setEditingType] = useState<OrderTypeConfig | null>(null);
  const [isNewType, setIsNewType] = useState(false);
  const [typeFormSlug, setTypeFormSlug] = useState("");
  const [typeFormLabel, setTypeFormLabel] = useState("");
  const [typeFormIcon, setTypeFormIcon] = useState("Package");
  const [typeFormDesc, setTypeFormDesc] = useState("");
  const [deleteTypeTarget, setDeleteTypeTarget] = useState<{ type: OrderTypeConfig; usedCount: number } | null>(null);

  // Drag & drop for order types
  const [draggedIdx, setDraggedIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // ── Load data ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (tab === "services") loadServices();
    else if (tab === "products") loadProductsData();
    // order_types loaded separately (not on selectedProduct change)
    setPage(1);
    setSelectedIds(new Set());
    setCategoryFilter("all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedProduct]);

  // Load order types only when tab switches — product-independent
  useEffect(() => {
    if (tab === "order_types") loadOrderTypes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadServices() {
    setLoadingServices(true);
    try {
      let q = supabase.from("global_services").select("*").order("category").order("name");
      if (selectedProduct !== "all") q = q.eq("product", selectedProduct);
      const { data, error } = await q;
      if (error) throw error;
      setServices((data as GlobalService[]) || []);
    } finally {
      setLoadingServices(false);
    }
  }

  async function loadProductsData() {
    setLoadingProducts(true);
    try {
      let q = supabase.from("global_products").select("*").order("category").order("name");
      if (selectedProduct !== "all") q = q.eq("product", selectedProduct);
      const { data, error } = await q;
      if (error) throw error;
      setProducts((data as GlobalProduct[]) || []);
    } finally {
      setLoadingProducts(false);
    }
  }

  async function loadOrderTypes() {
    setLoadingOrderTypes(true);
    try {
      const { data } = await supabase
        .from("app_settings")
        .select("value")
        .eq("product", "cleaning")
        .eq("key", "cleaning_order_types_config")
        .maybeSingle();
      // Mark: next setOrderTypes call is from DB load — don't auto-save it back
      skipNextOTSave.current = true;
      if (data?.value) {
        try { setOrderTypes(JSON.parse(data.value) || DEFAULT_ORDER_TYPES); }
        catch { setOrderTypes(DEFAULT_ORDER_TYPES); }
      } else {
        setOrderTypes(DEFAULT_ORDER_TYPES);
      }
    } finally {
      setLoadingOrderTypes(false);
    }
  }

  // ── Auto-save order types ─────────────────────────────────────────────────────
  const isFirstOTRender = useRef(true);
  const skipNextOTSave = useRef(false);
  useEffect(() => {
    if (isFirstOTRender.current) { isFirstOTRender.current = false; return; }
    if (orderTypes.length === 0) return;
    if (skipNextOTSave.current) { skipNextOTSave.current = false; return; }
    const timer = setTimeout(async () => {
      setSavingOrderTypes(true);
      try {
        const { error } = await supabase
          .from("app_settings")
          .upsert(
            { product: "cleaning", key: "cleaning_order_types_config", value: JSON.stringify(orderTypes) },
            { onConflict: "product,key" }
          );
        if (error) console.error("Failed to save order types:", error);
      } finally {
        setSavingOrderTypes(false);
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [orderTypes]);

  // ── Sorting & filtering ───────────────────────────────────────────────────────
  const rawItems = tab === "services" ? services : products;

  const uniqueCategories = useMemo(() => {
    const cats = new Set<string>();
    rawItems.forEach((item) => { if (item.category) cats.add(item.category); });
    return Array.from(cats).sort();
  }, [rawItems]);

  const filteredItems = useMemo(() => {
    const q = search.toLowerCase().trim();
    let result = rawItems.filter((item) => {
      const matchSearch = !q || item.name.toLowerCase().includes(q) || (item.category || "").toLowerCase().includes(q);
      const matchCat = categoryFilter === "all" || item.category === categoryFilter;
      return matchSearch && matchCat;
    });
    result = [...result].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.name.localeCompare(b.name, "ru");
      else if (sortKey === "category") cmp = (a.category || "").localeCompare(b.category || "", "ru");
      else if (sortKey === "price") cmp = (a.price ?? 0) - (b.price ?? 0);
      else if (sortKey === "duration") cmp = ((a as GlobalService).duration_min ?? 0) - ((b as GlobalService).duration_min ?? 0);
      return sortAsc ? cmp : -cmp;
    });
    return result;
  }, [rawItems, search, categoryFilter, sortKey, sortAsc]);

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / PAGE_SIZE));
  const pageItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const isAllPageSelected = pageItems.length > 0 && pageItems.every((i) => selectedIds.has(i.id));

  function toggleSort(key: string) {
    if (sortKey === key) setSortAsc((a) => !a);
    else { setSortKey(key); setSortAsc(true); }
  }

  // ── Order types operations ────────────────────────────────────────────────────
  function updateOrderTypes(updated: OrderTypeConfig[]) {
    setOrderTypes(updated);
  }

  function toggleTypeActive(slug: string) {
    updateOrderTypes(orderTypes.map((t) => (t.slug === slug ? { ...t, active: !t.active } : t)));
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

  function saveTypeForm() {
    if (!typeFormSlug.trim() || !typeFormLabel.trim()) return;
    const slug = typeFormSlug.trim().toLowerCase().replace(/\s+/g, "_");
    if (isNewType) {
      if (orderTypes.some((t) => t.slug === slug)) { alert("Тип с таким слагом уже существует"); return; }
      updateOrderTypes([...orderTypes, {
        slug, label: typeFormLabel.trim(), icon: typeFormIcon,
        sort_order: orderTypes.length, active: true,
        description: typeFormDesc.trim() || undefined,
      }]);
    } else if (editingType) {
      updateOrderTypes(orderTypes.map((t) =>
        t.slug === editingType.slug
          ? { ...t, slug, label: typeFormLabel.trim(), icon: typeFormIcon, description: typeFormDesc.trim() || undefined }
          : t
      ));
    }
    setEditingType(null);
    setIsNewType(false);
  }

  async function confirmDeleteType() {
    if (!deleteTypeTarget) return;
    updateOrderTypes(
      orderTypes.filter((t) => t.slug !== deleteTypeTarget.type.slug).map((t, i) => ({ ...t, sort_order: i }))
    );
    setDeleteTypeTarget(null);
  }

  async function openDeleteType(t: OrderTypeConfig) {
    const { count } = await supabase
      .from("cleaning_item_types")
      .select("id", { count: "exact", head: true })
      .eq("category", t.slug);
    setDeleteTypeTarget({ type: t, usedCount: count ?? 0 });
  }

  // Drag & drop
  function handleDragStart(idx: number) { setDraggedIdx(idx); }
  function handleDragOver(e: React.DragEvent, idx: number) { e.preventDefault(); setDragOverIdx(idx); }
  function handleDrop(idx: number) {
    if (draggedIdx === null || draggedIdx === idx) { setDraggedIdx(null); setDragOverIdx(null); return; }
    const arr = [...orderTypes];
    const [removed] = arr.splice(draggedIdx, 1);
    arr.splice(idx, 0, removed);
    updateOrderTypes(arr.map((t, i) => ({ ...t, sort_order: i })));
    setDraggedIdx(null);
    setDragOverIdx(null);
  }

  // ── Inline edit ───────────────────────────────────────────────────────────────
  function startInlineEdit(id: string, field: string, value: string | null | undefined) {
    setInlineEdit({ id, field, value: value != null ? String(value) : "" });
  }

  async function saveInlineEdit() {
    if (!inlineEdit) return;
    const { id, field, value } = inlineEdit;
    setInlineEdit(null);
    const trimmed = value.trim();
    const table = tab === "services" ? "global_services" : "global_products";
    const update: Record<string, unknown> = {};
    if (field === "name") { if (!trimmed) return; update.name = trimmed; }
    else if (field === "order_type") update.order_type = trimmed || null;
    else if (field === "category") update.category = trimmed || null;
    else if (field === "price") update.price = trimmed ? parseFloat(trimmed) : null;
    else if (field === "duration") update.duration_min = trimmed ? parseInt(trimmed) : null;
    else if (field === "unit") update.unit = trimmed || null;

    setInlineSaving(id);
    try {
      const { data, error } = await supabase.from(table).update(update).eq("id", id).select().single();
      if (error) throw error;
      if (tab === "services") setServices((prev) => prev.map((s) => (s.id === id ? (data as GlobalService) : s)));
      else setProducts((prev) => prev.map((p) => (p.id === id ? (data as GlobalProduct) : p)));
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setInlineSaving(null);
    }
  }

  function InlineCell({ id, field, display, type = "text", className = "" }: {
    id: string; field: string; display: string | number | null | undefined; type?: string; className?: string;
  }) {
    const isEditing = inlineEdit?.id === id && inlineEdit?.field === field;
    const isSaving = inlineSaving === id;
    if (isEditing) {
      return (
        <input
          autoFocus
          type={type}
          className={`w-full px-2 py-1 text-sm rounded border border-indigo-400 bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 ${className}`}
          value={inlineEdit!.value}
          onChange={(e) => setInlineEdit({ ...inlineEdit!, value: e.target.value })}
          onBlur={saveInlineEdit}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveInlineEdit(); } if (e.key === "Escape") setInlineEdit(null); }}
        />
      );
    }
    const displayStr = display != null ? String(display) : null;
    return (
      <div
        onClick={() => !isSaving && startInlineEdit(id, field, displayStr)}
        className={`min-h-[1.5rem] px-1 rounded cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors group ${isSaving ? "opacity-50 cursor-wait" : ""} ${className}`}
        title="Нажмите для редактирования"
      >
        <span className="text-sm">{display ?? <span className="text-gray-400 text-xs">—</span>}</span>
      </div>
    );
  }

  // ── Inline order type select cell ─────────────────────────────────────────────
  const OT_COLORS: Record<string, string> = {
    clothing: "bg-blue-100 text-blue-700",
    carpet: "bg-green-100 text-green-700",
    furniture: "bg-amber-100 text-amber-700",
    shoes: "bg-rose-100 text-rose-700",
    curtains: "bg-violet-100 text-violet-700",
    bedding: "bg-sky-100 text-sky-700",
  };
  function renderOrderTypeCell(svc: GlobalService, isSaving: boolean) {
    const isEditing = inlineEdit?.id === svc.id && inlineEdit?.field === "order_type";
    if (isEditing) {
      return (
        <select
          autoFocus
          value={inlineEdit!.value}
          onChange={(e) => setInlineEdit({ ...inlineEdit!, value: e.target.value })}
          onBlur={saveInlineEdit}
          className="h-7 text-xs appearance-none rounded border border-indigo-400 bg-white dark:bg-gray-800 px-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">—</option>
          {DEFAULT_ORDER_TYPES.map((t) => (
            <option key={t.slug} value={t.slug}>{t.label}</option>
          ))}
        </select>
      );
    }
    const val = svc.order_type;
    const label = DEFAULT_ORDER_TYPES.find((t) => t.slug === val)?.label;
    return (
      <button
        onClick={() => !isSaving && startInlineEdit(svc.id, "order_type", val)}
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${val ? (OT_COLORS[val] ?? "bg-gray-100 text-gray-600") : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"} transition-colors`}
        title="Нажмите для изменения"
      >
        {label ?? (val || "—")}
      </button>
    );
  }

  // ── Add new item ──────────────────────────────────────────────────────────────
  function openAdd() {
    setFormName(""); setFormOrderType("clothing"); setFormCategory(""); setFormDuration("60");
    setFormUnit("шт"); setFormPrice("");
    setFormProduct(selectedProduct === "all" ? "beauty" : selectedProduct);
    setAddOpen(true);
  }

  async function handleSave() {
    if (!formName.trim()) return;
    // Duplicate check
    const existing = tab === "services" ? services : products;
    const isDuplicate = existing.some(
      (item) => item.name.toLowerCase() === formName.trim().toLowerCase() && item.product === formProduct
    );
    if (isDuplicate && !confirm(`«${formName}» уже есть в справочнике для этого продукта. Добавить дубликат?`)) return;

    setSaving(true);
    try {
      if (tab === "services") {
        const payload = {
          name: formName.trim(),
          order_type: formProduct === "cleaning" ? (formOrderType || "clothing") : null,
          category: formCategory.trim() || null,
          duration_min: formDuration ? parseInt(formDuration) : null,
          price: formPrice ? parseFloat(formPrice) : null, product: formProduct,
        };
        const { data, error } = await supabase.from("global_services").insert(payload).select().single();
        if (error) throw error;
        setServices((prev) => [...prev, data as GlobalService]);
      } else {
        const payload = {
          name: formName.trim(), category: formCategory.trim() || null,
          unit: formUnit.trim() || null,
          price: formPrice ? parseFloat(formPrice) : null, product: formProduct,
        };
        const { data, error } = await supabase.from("global_products").insert(payload).select().single();
        if (error) throw error;
        setProducts((prev) => [...prev, data as GlobalProduct]);
      }
      setAddOpen(false);
    } catch (e) {
      console.error(e);
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  // ── Delete single ─────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const table = tab === "services" ? "global_services" : "global_products";
      await supabase.from(table).delete().eq("id", deleteTarget.id);
      if (tab === "services") setServices((prev) => prev.filter((s) => s.id !== deleteTarget.id));
      else setProducts((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  }

  // ── Bulk delete ───────────────────────────────────────────────────────────────
  async function handleBulkDelete() {
    if (selectedIds.size === 0) return;
    if (!confirm(`Удалить ${selectedIds.size} записей? Это действие нельзя отменить.`)) return;
    setBulkDeleting(true);
    try {
      const table = tab === "services" ? "global_services" : "global_products";
      const ids = Array.from(selectedIds);
      await supabase.from(table).delete().in("id", ids);
      if (tab === "services") setServices((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      else setProducts((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
    } finally {
      setBulkDeleting(false);
    }
  }

  // ── CSV Import ────────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setImportPreview(parseCSV(text).slice(0, 5));
    };
    reader.readAsText(file, "utf-8");
  }

  async function handleImport() {
    if (!importFile) return;
    setImporting(true);
    try {
      const text = await importFile.text();
      const rows = parseCSV(text);
      const table = tab === "services" ? "global_services" : "global_products";
      const toInsert = rows
        .filter((r) => r.name?.trim())
        .map((r) => ({
          name: r.name.trim(),
          category: r.category?.trim() || null,
          price: r.price ? parseFloat(r.price) : null,
          product: r.product?.trim() || (selectedProduct === "all" ? "beauty" : selectedProduct),
          ...(tab === "services"
            ? { duration_min: r.duration_min ? parseInt(r.duration_min) : null }
            : { unit: r.unit?.trim() || null }),
        }));
      if (toInsert.length === 0) { alert("Нет валидных строк для импорта"); return; }
      const { error } = await supabase.from(table).insert(toInsert);
      if (error) throw error;
      alert(`Импортировано ${toInsert.length} записей`);
      setImportOpen(false);
      setImportFile(null);
      setImportPreview([]);
      if (tab === "services") loadServices();
      else loadProductsData();
    } catch (e) {
      console.error(e);
      alert("Ошибка импорта");
    } finally {
      setImporting(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const loading = tab === "services" ? loadingServices : loadingProducts;
  const isTypeModalOpen = isNewType || editingType !== null;

  return (
    <div className="p-6">
      {productFromUrl && PRODUCTS.find((p) => p.slug === productFromUrl) && (
        <ProductTabs product={productFromUrl} active="catalog" />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <BookOpen size={20} className="text-indigo-600" />
        <div>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Глобальный справочник</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {tab === "order_types"
              ? `Типы заказов · Cleaning · ${orderTypes.length} типов${savingOrderTypes ? " · Сохраняем..." : ""}`
              : `${tab === "services" ? "Услуги" : "Товары"} · ${(tab === "services" ? services : products).length.toLocaleString("ru-RU")} записей`
            }
          </p>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {tab !== "order_types" && (
            <>
              <button
                onClick={() => { setImportOpen(true); setImportFile(null); setImportPreview([]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Импорт CSV"
              >
                <Upload size={15} />
                Импорт
              </button>
              <button
                onClick={() => exportToCSV(tab === "services" ? services : products, tab as "services" | "products")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                title="Экспорт CSV"
              >
                <Download size={15} />
                Экспорт
              </button>
              <button
                onClick={() => tab === "services" ? loadServices() : loadProductsData()}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                title="Обновить"
              >
                <RefreshCw size={15} />
              </button>
            </>
          )}
          {tab === "order_types" && (
            <>
              <button onClick={loadOrderTypes} className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors" title="Сбросить">
                <RefreshCw size={15} />
              </button>
              <button onClick={openNewType} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
                <Plus size={15} />
                Добавить
              </button>
            </>
          )}
          {tab !== "order_types" && (
            <button onClick={openAdd} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors">
              <Plus size={15} />
              Добавить
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-gray-200 dark:border-gray-700">
        {([ { key: "services", label: "Услуги" }, { key: "products", label: "Товары" }, { key: "order_types", label: "Типы заказов" } ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setSearch(""); setSortKey("name"); setSortAsc(true); setPage(1); }}
            className={["px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              tab === key ? "border-indigo-600 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            ].join(" ")}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Product filter */}
      {tab !== "order_types" && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {PRODUCT_TABS.map((p) => (
            <button
              key={p.slug}
              onClick={() => setSelectedProduct(p.slug)}
              className={["px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
                selectedProduct === p.slug
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700"
              ].join(" ")}
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Order Types */}
      {tab === "order_types" && (
        <div>
          <div className="mb-4 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800/30">
            <p className="text-sm text-indigo-700 dark:text-indigo-300">
              Типы заказов для <strong>Cleaning</strong>. Перетащите строку для смены порядка. Изменения сохраняются автоматически.
            </p>
          </div>

          {loadingOrderTypes ? (
            <div className="text-center py-12 text-gray-400 text-sm">Загрузка...</div>
          ) : (
            <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <th className="w-10 px-3 py-3"></th>
                    <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Икон.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Слаг</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Название</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Описание</th>
                    <th className="w-20 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wide">Активен</th>
                    <th className="w-20 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                  {orderTypes.map((t, idx) => (
                    <tr
                      key={t.slug}
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDrop={() => handleDrop(idx)}
                      onDragEnd={() => { setDraggedIdx(null); setDragOverIdx(null); }}
                      className={[
                        "transition-colors",
                        draggedIdx === idx ? "opacity-40" : "",
                        dragOverIdx === idx && draggedIdx !== idx ? "bg-indigo-50 dark:bg-indigo-900/20" : "hover:bg-gray-50 dark:hover:bg-gray-800/30",
                      ].join(" ")}
                    >
                      <td className="px-3 py-3 cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500">
                        <GripVertical size={15} />
                      </td>
                      <td className="px-4 py-3">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300">
                          <OrderTypeIcon name={t.icon} size={16} />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-gray-600 dark:text-gray-300">{t.slug}</code>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{t.label}</td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[200px]">
                        <span className="truncate block text-xs">{t.description || "—"}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleTypeActive(t.slug)}
                          className={["relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200",
                            t.active ? "bg-indigo-600" : "bg-gray-200 dark:bg-gray-700"].join(" ")}
                        >
                          <span className={["pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200",
                            t.active ? "translate-x-4" : "translate-x-0"].join(" ")} />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => openEditType(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors" title="Редактировать">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => openDeleteType(t)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors" title="Удалить">
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
        </div>
      )}

      {/* Services / Products */}
      {tab !== "order_types" && (
        <>
          {/* Search + category filter */}
          <div className="flex flex-wrap gap-2 mb-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); setCategoryFilter("all"); }}
                placeholder="Поиск по названию или категории..."
                className="w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
                  <X size={14} />
                </button>
              )}
            </div>
            {uniqueCategories.length > 0 && (
              <select
                value={categoryFilter}
                onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="all">Все категории</option>
                {uniqueCategories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            )}
          </div>

          {/* Bulk actions bar */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/40">
              <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Выбрано: {selectedIds.size}</span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-red-600 text-white text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <Trash2 size={13} />
                {bulkDeleting ? "Удаляем..." : "Удалить выбранные"}
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="text-xs text-indigo-500 hover:underline ml-auto">
                Снять выделение
              </button>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={isAllPageSelected}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedIds((prev) => { const next = new Set(prev); pageItems.forEach((i) => next.add(i.id)); return next; });
                        else setSelectedIds((prev) => { const next = new Set(prev); pageItems.forEach((i) => next.delete(i.id)); return next; });
                      }}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("name")} className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-900 dark:hover:text-white">
                      Название<SortIcon col="name" sortKey={sortKey} sortAsc={sortAsc} />
                    </button>
                  </th>
                  {(selectedProduct === "cleaning" || selectedProduct === "all") && tab === "services" && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">
                      Тип заказа
                    </th>
                  )}
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("category")} className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-900 dark:hover:text-white">
                      {tab === "services" && (selectedProduct === "cleaning" || selectedProduct === "all") ? "Подкатегория" : "Категория"}<SortIcon col="category" sortKey={sortKey} sortAsc={sortAsc} />
                    </button>
                  </th>
                  {tab === "services" ? (
                    <th className="px-4 py-3 text-left">
                      <button onClick={() => toggleSort("duration")} className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-900 dark:hover:text-white">
                        Длит.<SortIcon col="duration" sortKey={sortKey} sortAsc={sortAsc} />
                      </button>
                    </th>
                  ) : (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Ед. изм.</th>
                  )}
                  <th className="px-4 py-3 text-left">
                    <button onClick={() => toggleSort("price")} className="flex items-center text-xs font-medium text-gray-500 uppercase tracking-wide hover:text-gray-900 dark:hover:text-white">
                      Цена<SortIcon col="price" sortKey={sortKey} sortAsc={sortAsc} />
                    </button>
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wide">Продукт</th>
                  <th className="px-4 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">Загрузка...</td></tr>
                ) : pageItems.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-12 text-gray-400 text-sm">{search || categoryFilter !== "all" ? "Ничего не найдено" : "Записей нет"}</td></tr>
                ) : pageItems.map((item) => {
                  const svc = tab === "services" ? (item as GlobalService) : null;
                  const prd = tab === "products" ? (item as GlobalProduct) : null;
                  const isSaving = inlineSaving === item.id;
                  const colorClass = PRODUCT_COLORS[item.product] ?? "bg-gray-100 text-gray-600";
                  return (
                    <tr key={item.id} className={`transition-colors ${isSaving ? "bg-indigo-50/50 dark:bg-indigo-900/10" : "hover:bg-gray-50 dark:hover:bg-gray-800/30"}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(item.id)}
                          onChange={(e) => setSelectedIds((prev) => { const next = new Set(prev); e.target.checked ? next.add(item.id) : next.delete(item.id); return next; })}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900 dark:text-white max-w-[220px]">
                        <InlineCell id={item.id} field="name" display={item.name} />
                      </td>
                      {(selectedProduct === "cleaning" || selectedProduct === "all") && tab === "services" && (
                        <td className="px-4 py-3">
                          {svc ? renderOrderTypeCell(svc, isSaving) : null}
                        </td>
                      )}
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 max-w-[160px]">
                        <InlineCell id={item.id} field="category" display={item.category} />
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 w-24">
                        {svc ? (
                          <InlineCell id={item.id} field="duration" display={svc.duration_min} type="number" />
                        ) : (
                          <InlineCell id={item.id} field="unit" display={prd?.unit} />
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 w-24">
                        <InlineCell id={item.id} field="price" display={item.price} type="number" />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                          {item.product}
                        </span>
                      </td>
                      <td className="px-4 py-3 w-10">
                        <button
                          onClick={() => setDeleteTarget({ id: item.id, name: item.name })}
                          className="p-1.5 rounded-lg text-gray-300 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                          title="Удалить"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-3 text-sm text-gray-500 dark:text-gray-400">
              <span>
                {((page - 1) * PAGE_SIZE) + 1}–{Math.min(page * PAGE_SIZE, filteredItems.length)} из {filteredItems.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronUp size={14} className="rotate-[-90deg]" />
                </button>
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  const p = totalPages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= totalPages - 3 ? totalPages - 6 + i : page - 3 + i;
                  return (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={["px-2.5 py-1 rounded-lg text-xs font-medium transition-colors",
                        p === page ? "bg-indigo-600 text-white" : "hover:bg-gray-100 dark:hover:bg-gray-800"
                      ].join(" ")}
                    >
                      {p}
                    </button>
                  );
                })}
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
                >
                  <ChevronDown size={14} className="rotate-[-90deg]" />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Add modal ── */}
      {addOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Добавить {tab === "services" ? "услугу" : "товар"}
              </h2>
              <button onClick={() => setAddOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название *</label>
                <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} autoFocus
                  placeholder={tab === "services" ? "Стрижка, Массаж..." : "Шампунь, Краска..."}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  onKeyDown={(e) => e.key === "Enter" && handleSave()}
                />
              </div>
              {tab === "services" && formProduct === "cleaning" && (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Тип заказа</label>
                  <select value={formOrderType} onChange={(e) => setFormOrderType(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {DEFAULT_ORDER_TYPES.map((t) => (
                      <option key={t.slug} value={t.slug}>{t.label}</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">
                  {tab === "services" && formProduct === "cleaning" ? "Подкатегория" : "Категория"}
                </label>
                <input type="text" value={formCategory} onChange={(e) => setFormCategory(e.target.value)}
                  placeholder={tab === "services" && formProduct === "cleaning" ? "Верхняя одежда, Детская одежда..." : "Волосы, Уход..."}
                  list="category-suggestions"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <datalist id="category-suggestions">
                  {uniqueCategories.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              {tab === "services" ? (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Длительность (мин)</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {DURATION_PRESETS.map((d) => (
                      <button key={d} type="button" onClick={() => setFormDuration(String(d))}
                        className={["px-2 py-0.5 rounded text-xs font-medium transition-colors",
                          formDuration === String(d) ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                        ].join(" ")}
                      >{d} мин</button>
                    ))}
                  </div>
                  <input type="number" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} min="0" placeholder="60"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Единица измерения</label>
                  <div className="flex flex-wrap gap-1 mb-1.5">
                    {COMMON_UNITS.map((u) => (
                      <button key={u} type="button" onClick={() => setFormUnit(u)}
                        className={["px-2 py-0.5 rounded text-xs font-medium transition-colors",
                          formUnit === u ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400"
                        ].join(" ")}
                      >{u}</button>
                    ))}
                  </div>
                  <input type="text" value={formUnit} onChange={(e) => setFormUnit(e.target.value)} placeholder="шт"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Цена</label>
                <input type="number" value={formPrice} onChange={(e) => setFormPrice(e.target.value)} min="0" placeholder="0"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Продукт</label>
                <select value={formProduct} onChange={(e) => setFormProduct(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {PRODUCTS.filter((p) => p.slug !== "main").map((p) => (
                    <option key={p.slug} value={p.slug}>{p.label.replace("Ezze ", "")}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={handleSave} disabled={!formName.trim() || saving}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Сохраняем..." : <><Check size={14} /> Сохранить</>}
              </button>
              <button onClick={() => setAddOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-xs mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Удалить запись?</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">«{deleteTarget.name}» будет удалено из справочника.</p>
            <div className="flex gap-2">
              <button onClick={confirmDelete} disabled={deleting} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors">
                {deleting ? "Удаляем..." : "Удалить"}
              </button>
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Order Type modal (add/edit) ── */}
      {isTypeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">{isNewType ? "Новый тип" : "Редактировать тип"}</h2>
              <button onClick={() => { setEditingType(null); setIsNewType(false); }} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={16} /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Слаг (латиница/цифры) *</label>
                <input type="text" value={typeFormSlug} onChange={(e) => setTypeFormSlug(e.target.value)} placeholder="my_type"
                  disabled={!isNewType}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Название *</label>
                <input type="text" value={typeFormLabel} onChange={(e) => setTypeFormLabel(e.target.value)} autoFocus={!isNewType} placeholder="Одежда"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Иконка</label>
                <div className="grid grid-cols-6 gap-1.5 mb-2">
                  {ICON_OPTIONS.map((name) => {
                    const Icon = ICON_MAP[name];
                    return (
                      <button key={name} type="button" onClick={() => setTypeFormIcon(name)} title={name}
                        className={["p-2 rounded-lg border transition-colors flex items-center justify-center",
                          typeFormIcon === name ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600" : "border-gray-200 dark:border-gray-700 text-gray-500 hover:border-indigo-300"
                        ].join(" ")}
                      >
                        <Icon size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1 block">Описание</label>
                <input type="text" value={typeFormDesc} onChange={(e) => setTypeFormDesc(e.target.value)} placeholder="Краткое описание..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button onClick={saveTypeForm} disabled={!typeFormSlug.trim() || !typeFormLabel.trim()}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Check size={14} /> Сохранить
              </button>
              <button onClick={() => { setEditingType(null); setIsNewType(false); }} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete order type confirmation ── */}
      {deleteTypeTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-xs mx-4">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Удалить тип «{deleteTypeTarget.type.label}»?</h2>
            {deleteTypeTarget.usedCount > 0 && (
              <div className="mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  В каталоге химчистки {deleteTypeTarget.usedCount} позиций с этим типом. После удаления они останутся без категории.
                </p>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Тип будет удалён из конфигурации POS-кассы.</p>
            <div className="flex gap-2">
              <button onClick={confirmDeleteType} className="flex-1 py-2 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors">
                Удалить
              </button>
              <button onClick={() => setDeleteTypeTarget(null)} className="flex-1 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CSV Import modal ── */}
      {importOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                Импорт CSV · {tab === "services" ? "Услуги" : "Товары"}
              </h2>
              <button onClick={() => setImportOpen(false)} className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white"><X size={16} /></button>
            </div>
            <div className="mb-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 font-mono">
              {tab === "services"
                ? "name,category,duration_min,price,product"
                : "name,category,unit,price,product"}
            </div>
            <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex flex-col items-center justify-center gap-2 py-8 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors"
            >
              <Upload size={24} />
              <span className="text-sm">{importFile ? importFile.name : "Выберите CSV файл"}</span>
            </button>
            {importPreview.length > 0 && (
              <div className="mt-3 overflow-x-auto">
                <p className="text-xs text-gray-500 mb-1">Предпросмотр (первые 5 строк):</p>
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr>{Object.keys(importPreview[0]).map((k) => <th key={k} className="px-2 py-1 text-left border border-gray-200 bg-gray-50 dark:bg-gray-800 dark:border-gray-700 font-medium text-gray-500">{k}</th>)}</tr>
                  </thead>
                  <tbody>
                    {importPreview.map((row, i) => (
                      <tr key={i}>{Object.values(row).map((v, j) => <td key={j} className="px-2 py-1 border border-gray-100 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 truncate max-w-[80px]">{v}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="flex gap-2 mt-4">
              <button onClick={handleImport} disabled={!importFile || importing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                <Upload size={14} />
                {importing ? "Импортируем..." : "Импортировать"}
              </button>
              <button onClick={() => setImportOpen(false)} className="px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
