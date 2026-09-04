import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Check,
  Eye,
  ImagePlus,
  LayoutDashboard,
  PackagePlus,
  Pencil,
  RotateCcw,
  Settings2,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  UsersRound,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

type Tab = "overview" | "products" | "orders" | "settings";
type ProductForm = {
  name: string;
  slug: string;
  kiloPrice: string;
  oldKiloPrice: string;
  sku: string;
  barcode: string;
  imageUrl: string;
  gallery: string;
  stock: string;
  weight: string;
  shortDescription: string;
  description: string;
  categoryId: string;
  brand: string;
  status: "active" | "draft" | "out_of_stock";
  seoTitle: string;
  seoDescription: string;
  isFeatured: boolean;
  isNew: boolean;
  isBestSeller: boolean;
};

const orderStatus: Record<string, string> = {
  new: "جديد", reviewing: "قيد المراجعة", confirmed: "تم التأكيد", preparing: "قيد التجهيز",
  ready_to_ship: "جاهز للشحن", shipped: "تم الشحن", delivered: "تم التسليم", completed: "مكتمل",
  cancelled: "ملغي", returned: "مرتجع",
};

const emptyProduct: ProductForm = {
  name: "", slug: "", kiloPrice: "", oldKiloPrice: "", sku: "", barcode: "", imageUrl: "", gallery: "",
  stock: "0", weight: "", shortDescription: "", description: "", categoryId: "", brand: "الذهب الأسود",
  status: "active", seoTitle: "", seoDescription: "", isFeatured: false, isNew: false, isBestSeller: false,
};

function roundPrice(value: number) {
  return Math.max(0, Math.round(value));
}

function buildOptions(kiloPrice: number) {
  return [
    { key: "100g", label: "100غ", price: roundPrice(kiloPrice / 10) },
    { key: "250g", label: "250غ", price: roundPrice(kiloPrice / 4) },
    { key: "500g", label: "500غ", price: roundPrice(kiloPrice / 2) },
    { key: "1kg", label: "1 كيلو", price: roundPrice(kiloPrice) },
  ];
}

function kiloFromProduct(product: any) {
  try {
    const options = JSON.parse(product.options || "[]");
    const oneKg = options.find((item: any) => item.key === "1kg");
    if (oneKg?.price != null) return String(roundPrice(Number(oneKg.price)));
  } catch { /* fallback below */ }
  return String(roundPrice(Number(product.price) * 10));
}

export default function AdminPanel() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const statsQuery = trpc.admin.stats.useQuery(undefined, { enabled: isAdmin });
  const recentOrdersQuery = trpc.admin.recentOrders.useQuery(undefined, { enabled: isAdmin });
  const productsQuery = trpc.catalog.adminProducts.useQuery(undefined, { enabled: isAdmin });
  const categoriesQuery = trpc.catalog.categories.useQuery(undefined, { enabled: isAdmin });
  const settingsQuery = trpc.catalog.settings.useQuery();

  const createProduct = trpc.catalog.create.useMutation({
    onSuccess: async () => { toast.success("تمت إضافة المنتج بنجاح"); setEditingId(null); resetProduct(); await productsQuery.refetch(); },
    onError: (error) => toast.error(error.message || "تعذر إضافة المنتج"),
  });
  const updateProduct = trpc.catalog.update.useMutation({
    onSuccess: async () => { toast.success("تم تحديث المنتج بنجاح"); setEditingId(null); resetProduct(); await productsQuery.refetch(); },
    onError: (error) => toast.error(error.message || "تعذر تحديث المنتج"),
  });
  const saveSettings = trpc.admin.saveSettings.useMutation({
    onSuccess: () => toast.success("تم حفظ إعدادات المتجر"),
    onError: (error) => toast.error(error.message || "تعذر حفظ الإعدادات"),
  });

  const [tab, setTab] = useState<Tab>("overview");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [product, setProduct] = useState<ProductForm>(emptyProduct);
  const [settings, setSettings] = useState({
    storeName: "الذهب الأسود", tagline: "نكهات أصيلة من قلب الطبيعة", whatsappNumber: "", currency: "LYD",
    localShippingFee: "15", freeShippingThreshold: "250", enableWhatsapp: true, enableOnlinePayment: false,
  });

  const stats = statsQuery.data ?? { revenue: "0", orders: 0, products: 0, customers: 0, lowStock: 0 };
  const liveSettings = settingsQuery.data;
  const categories = categoriesQuery.data ?? [];
  const products = productsQuery.data ?? [];
  const recentOrders = recentOrdersQuery.data ?? [];
  const selectedCategory = useMemo(() => categories.find((item) => String(item.id) === product.categoryId), [categories, product.categoryId]);
  const pricingPreview = useMemo(() => {
    const kilo = Number(product.kiloPrice);
    return Number.isFinite(kilo) && kilo >= 0 ? buildOptions(kilo) : [];
  }, [product.kiloPrice]);

  function resetProduct() { setProduct(emptyProduct); }

  useEffect(() => {
    const tabParam = new URLSearchParams(location.split("?")[1] || "").get("tab") as Tab | null;
    if (tabParam && ["products", "settings", "overview", "orders"].includes(tabParam)) setTab(tabParam);
  }, [location]);

  useEffect(() => {
    if (!liveSettings) return;
    setSettings({
      storeName: liveSettings.storeName,
      tagline: liveSettings.tagline,
      whatsappNumber: liveSettings.whatsappNumber || "",
      currency: liveSettings.currency,
      localShippingFee: String(liveSettings.localShippingFee),
      freeShippingThreshold: String(liveSettings.freeShippingThreshold),
      enableWhatsapp: liveSettings.enableWhatsapp === 1,
      enableOnlinePayment: liveSettings.enableOnlinePayment === 1,
    });
  }, [liveSettings]);

  function editProduct(item: any) {
    setEditingId(item.id);
    setTab("products");
    setProduct({
      name: item.name || "", slug: item.slug || "", kiloPrice: kiloFromProduct(item),
      oldKiloPrice: item.oldPrice ? String(roundPrice(Number(item.oldPrice) * 10)) : "",
      sku: item.sku || "", barcode: item.barcode || "", imageUrl: item.imageUrl || "", gallery: item.gallery || "",
      stock: String(item.stock ?? 0), weight: item.weight ? String(item.weight) : "", shortDescription: item.shortDescription || "",
      description: item.description || "", categoryId: item.categoryId ? String(item.categoryId) : "", brand: item.brand || "",
      status: item.status || "active", seoTitle: item.seoTitle || "", seoDescription: item.seoDescription || "",
      isFeatured: item.isFeatured === 1, isNew: item.isNew === 1, isBestSeller: item.isBestSeller === 1,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submitProduct(event: React.FormEvent) {
    event.preventDefault();
    const kiloPrice = Number(product.kiloPrice);
    if (!product.name.trim() || !product.sku.trim() || !Number.isFinite(kiloPrice) || kiloPrice < 0) {
      toast.error("تحقق من اسم المنتج وسعر الكيلو وSKU"); return;
    }
    if (!selectedCategory) { toast.error("اختر تصنيف المنتج أولًا"); return; }
    if (Number(product.stock) < 0 || !Number.isInteger(Number(product.stock))) { toast.error("المخزون يجب أن يكون رقمًا صحيحًا موجبًا"); return; }

    const options = buildOptions(kiloPrice);
    const payload = {
      name: product.name.trim(), slug: product.slug.trim() || `${product.sku.trim().toLowerCase()}-${Date.now()}`,
      shortDescription: product.shortDescription.trim() || undefined, description: product.description.trim() || undefined,
      price: options[0].price.toFixed(2), oldPrice: product.oldKiloPrice ? (roundPrice(Number(product.oldKiloPrice)) / 10).toFixed(2) : undefined,
      currency: settings.currency || "LYD", sku: product.sku.trim(), barcode: product.barcode.trim() || undefined,
      imageUrl: product.imageUrl.trim() || "/product-images/category-6.svg", gallery: product.gallery.trim() || product.imageUrl.trim() || undefined,
      options: JSON.stringify(options), stock: Number(product.stock), weight: product.weight ? Number(product.weight).toFixed(2) : undefined,
      categoryId: Number(product.categoryId), brand: product.brand.trim() || undefined, status: product.status,
      seoTitle: product.seoTitle.trim() || `${product.name.trim()} | ${settings.storeName}`,
      seoDescription: product.seoDescription.trim() || product.shortDescription.trim() || undefined,
      isFeatured: product.isFeatured, isNew: product.isNew, isBestSeller: product.isBestSeller,
    };
    if (editingId) updateProduct.mutate({ id: editingId, ...payload }); else createProduct.mutate(payload);
  }

  function saveStoreSettings(event: React.FormEvent) { event.preventDefault(); saveSettings.mutate(settings); }

  if (!user) return <DashboardLayout><div className="admin-shell flex min-h-[70vh] items-center justify-center" dir="rtl"><div className="admin-card max-w-md text-center"><ShieldCheck className="mx-auto text-[var(--store-gold)]" size={28} /><h1 className="mt-5 font-serif text-3xl">سجّل الدخول للمتابعة</h1><p className="mt-3 text-sm leading-7 text-[var(--store-muted)]">هذه الصفحة لا تعرض أي بيانات إدارية قبل اكتمال تسجيل الدخول.</p></div></div></DashboardLayout>;
  if (user.role !== "admin") return <DashboardLayout><div className="admin-shell flex min-h-[70vh] items-center justify-center" dir="rtl"><div className="admin-card max-w-md text-center"><ShieldCheck className="mx-auto text-[var(--store-gold)]" size={28} /><h1 className="mt-5 font-serif text-3xl">هذه المساحة محمية</h1><p className="mt-3 text-sm leading-7 text-[var(--store-muted)]">حسابك مسجل بنجاح، لكنه لا يملك صلاحية الوصول إلى لوحة الإدارة.</p><button type="button" onClick={() => setLocation("/")} className="gold-button mt-6 w-full"><ArrowRight size={16} /> العودة إلى المتجر</button></div></div></DashboardLayout>;

  return <DashboardLayout>
    <div className="admin-shell" dir="rtl">
      <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div><span className="section-kicker">ALDHAB ALASWAD / CONTROL ROOM</span><h1 className="mt-2 font-serif text-4xl text-[var(--store-heading)]">لوحة الإدارة</h1><p className="mt-2 text-sm text-[var(--store-muted)]">إدارة كاملة للكتالوج والطلبات والإعدادات، مع معاينة فورية للموقع.</p></div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setLocation("/")} className="ghost-button"><Eye size={16} /> معاينة الموقع</button>
          <button type="button" onClick={() => setLocation("/")} className="ghost-button"><ArrowRight size={16} /> خروج إلى المتجر</button>
          <div className="flex items-center gap-2 rounded-full border border-[#d6b56b]/20 bg-[#d6b56b]/10 px-4 py-2 text-xs text-[#d6b56b]"><ShieldCheck size={15} /> مدير مسؤول</div>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">{[
        { id: "overview", label: "نظرة عامة", icon: LayoutDashboard }, { id: "products", label: "المنتجات", icon: Boxes },
        { id: "orders", label: "الطلبات", icon: ShoppingCart }, { id: "settings", label: "الإعدادات", icon: Settings2 },
      ].map((item) => <button key={item.id} type="button" onClick={() => setTab(item.id as Tab)} className={`admin-tab ${tab === item.id ? "active" : ""}`}><item.icon size={16} /> {item.label}</button>)}</div>

      {tab === "overview" && <>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">{[
          { label: "إجمالي المبيعات", value: `${Number(stats.revenue).toFixed(2)} LYD`, icon: BarChart3 }, { label: "الطلبات", value: stats.orders, icon: ShoppingCart },
          { label: "المنتجات", value: stats.products, icon: Boxes }, { label: "العملاء", value: stats.customers, icon: UsersRound }, { label: "مخزون منخفض", value: stats.lowStock, icon: PackagePlus },
        ].map((item) => <div key={item.label} className="admin-stat"><span className="admin-stat-icon"><item.icon size={18} /></span><span className="text-xs text-[var(--store-muted)]">{item.label}</span><strong>{item.value}</strong></div>)}</div>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="admin-card"><div className="mb-6 flex items-center justify-between"><div><span className="section-kicker">CATALOG HEALTH</span><h2 className="mt-2 font-serif text-2xl">حالة المتجر</h2></div><span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs text-emerald-300">متصل</span></div><div className="space-y-5"><div className="health-row"><span><span className="health-dot good" /> قاعدة البيانات</span><strong>جاهزة</strong></div><div className="health-row"><span><span className="health-dot good" /> المصادقة</span><strong>محمية</strong></div><div className="health-row"><span><span className="health-dot good" /> WhatsApp</span><strong>{liveSettings?.enableWhatsapp ? "مفعّل" : "غير مفعّل"}</strong></div><div className="health-row"><span><span className="health-dot" /> الدفع الإلكتروني</span><strong className="text-[var(--store-muted)]">جاهز للربط</strong></div></div></div>
          <div className="admin-card"><span className="section-kicker">QUICK ACTIONS</span><h2 className="mt-2 font-serif text-2xl">إجراءات سريعة</h2><div className="mt-6 space-y-3"><button type="button" onClick={() => { setTab("products"); setEditingId(null); resetProduct(); }} className="quick-action"><PackagePlus size={17} /> إضافة منتج جديد</button><button type="button" onClick={() => setTab("settings")} className="quick-action"><Settings2 size={17} /> ضبط WhatsApp والشحن</button><button type="button" onClick={() => setLocation("/")} className="quick-action"><Eye size={17} /> معاينة ما يراه العميل</button></div></div>
        </div>
      </>}

      {tab === "products" && <div className="grid gap-6 lg:grid-cols-[minmax(390px,.8fr)_minmax(0,1.2fr)]">
        <form onSubmit={submitProduct} className="admin-card space-y-4">
          <div className="mb-2 flex items-start justify-between gap-3"><div><span className="section-kicker">{editingId ? "EDIT PRODUCT" : "NEW PRODUCT"}</span><h2 className="mt-2 font-serif text-2xl">{editingId ? "تعديل الصنف بالكامل" : "إضافة صنف جديد"}</h2><p className="mt-2 text-xs leading-6 text-[var(--store-muted)]">أدخل <strong className="text-[var(--store-gold)]">سعر الكيلو</strong> فقط؛ يحسب النظام 100غ و250غ و500غ و1 كيلو ويقربها لأقرب رقم صحيح.</p></div>{editingId && <button type="button" onClick={() => { setEditingId(null); resetProduct(); }} className="icon-button small" title="إلغاء التعديل"><RotateCcw size={15} /></button>}</div>
          <label className="field-label">اسم الصنف<input required value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="مثال: كمون حب" /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">سعر الكيلو (د.ل)<input required inputMode="decimal" min="0" step="0.01" type="number" value={product.kiloPrice} onChange={(e) => setProduct({ ...product, kiloPrice: e.target.value })} placeholder="مثال: 70" /></label><label className="field-label">سعر الكيلو القديم (اختياري)<input min="0" step="0.01" type="number" value={product.oldKiloPrice} onChange={(e) => setProduct({ ...product, oldKiloPrice: e.target.value })} placeholder="للعروض" /></label></div>
          {pricingPreview.length > 0 && <div className="pricing-preview">{pricingPreview.map((item) => <div key={item.key}><span>{item.label}</span><strong>{item.price} د.ل</strong></div>)}</div>}
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">SKU<input required value={product.sku} onChange={(e) => setProduct({ ...product, sku: e.target.value })} placeholder="30001" /></label><label className="field-label">الباركود<input value={product.barcode} onChange={(e) => setProduct({ ...product, barcode: e.target.value })} placeholder="اختياري" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">المخزون<input type="number" min="0" step="1" required value={product.stock} onChange={(e) => setProduct({ ...product, stock: e.target.value })} /></label><label className="field-label">الوزن المرجعي (كغ)<input type="number" min="0" step="0.01" value={product.weight} onChange={(e) => setProduct({ ...product, weight: e.target.value })} placeholder="اختياري" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">التصنيف<select value={product.categoryId} onChange={(e) => setProduct({ ...product, categoryId: e.target.value })}><option value="">اختر التصنيف</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="field-label">حالة الصنف<select value={product.status} onChange={(e) => setProduct({ ...product, status: e.target.value as ProductForm["status"] })}><option value="active">نشط ويظهر في المتجر</option><option value="draft">مسودة</option><option value="out_of_stock">غير متوفر</option></select></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">رابط الصورة الرئيسية<input value={product.imageUrl} onChange={(e) => setProduct({ ...product, imageUrl: e.target.value })} placeholder="/product-images/1.svg أو رابط صورة" /></label><label className="field-label">صور إضافية<input value={product.gallery} onChange={(e) => setProduct({ ...product, gallery: e.target.value })} placeholder="روابط مفصولة بفواصل" /></label></div>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">العلامة<input value={product.brand} onChange={(e) => setProduct({ ...product, brand: e.target.value })} /></label><label className="field-label">الرابط المختصر (Slug)<input value={product.slug} onChange={(e) => setProduct({ ...product, slug: e.target.value })} placeholder="يُنشأ تلقائيًا إن تركته فارغًا" /></label></div>
          <label className="field-label">الوصف القصير<textarea rows={2} value={product.shortDescription} onChange={(e) => setProduct({ ...product, shortDescription: e.target.value })} placeholder="وصف واضح مناسب للتوابل والاستخدامات الغذائية" /></label>
          <label className="field-label">الوصف الكامل<textarea rows={4} value={product.description} onChange={(e) => setProduct({ ...product, description: e.target.value })} placeholder="تفاصيل الصنف، الاستخدام، الجودة، التخزين..." /></label>
          <div className="grid gap-4 sm:grid-cols-2"><label className="field-label">عنوان SEO<input value={product.seoTitle} onChange={(e) => setProduct({ ...product, seoTitle: e.target.value })} /></label><label className="field-label">وصف SEO<input value={product.seoDescription} onChange={(e) => setProduct({ ...product, seoDescription: e.target.value })} /></label></div>
          <div className="grid gap-2 sm:grid-cols-3">{[["isFeatured", "مميز"], ["isNew", "جديد"], ["isBestSeller", "الأكثر مبيعًا"]].map(([key, label]) => <label key={key} className="check-option"><input type="checkbox" checked={product[key as "isFeatured" | "isNew" | "isBestSeller"]} onChange={(e) => setProduct({ ...product, [key]: e.target.checked })} /><span>{label}</span></label>)}</div>
          <button disabled={createProduct.isPending || updateProduct.isPending} className="gold-button w-full" type="submit">{createProduct.isPending || updateProduct.isPending ? "جارٍ الحفظ..." : editingId ? "حفظ كل التعديلات" : "إضافة الصنف"}<Check size={16} /></button>
        </form>

        <div className="admin-card min-w-0"><div className="mb-5 flex items-center justify-between gap-3"><div><span className="section-kicker">LIVE CATALOG</span><h2 className="mt-2 font-serif text-2xl">الأصناف الحالية</h2></div><span className="text-xs text-[var(--store-muted)]">{products.length} صنف</span></div><div className="max-h-[760px] space-y-2 overflow-y-auto pr-1">{products.map((item) => <div key={item.id} className={`catalog-row ${editingId === item.id ? "selected" : ""}`}><img src={item.imageUrl || `/product-images/${item.id}.svg`} alt={item.name} /><div className="min-w-0 flex-1"><p className="truncate font-serif text-base">{item.name}</p><p className="mt-1 truncate text-xs text-[var(--store-muted)]">{item.sku} · {categories.find((c) => c.id === item.categoryId)?.name || "بدون تصنيف"} · مخزون {item.stock}</p><p className="mt-1 text-xs text-[var(--store-gold)]">1 كغ: {kiloFromProduct(item)} د.ل · 100غ: {roundPrice(Number(item.price))} د.ل</p></div><div className="flex shrink-0 items-center gap-1"><button type="button" onClick={() => editProduct(item)} className="icon-button small" title={`تعديل ${item.name}`}><Pencil size={15} /></button><button type="button" onClick={() => toast.info("الحذف غير متاح من الواجهة لتجنب حذف طلبات مرتبطة بالصنف. غيّر الحالة إلى مسودة أو غير متوفر بدلًا من ذلك.")} className="icon-button small text-red-300/70" title="الحذف محمي"><Trash2 size={15} /></button></div></div>)}{!products.length && <div className="empty-catalog min-h-[220px]"><ImagePlus size={22} className="text-[#d6b56b]" /><p>لم تضف أصناف بعد.</p></div>}</div></div>
      </div>}

      {tab === "orders" && <div className="admin-card"><div className="mb-6 flex items-center justify-between"><div><span className="section-kicker">ORDER DESK</span><h2 className="mt-2 font-serif text-2xl">آخر الطلبات</h2></div><button type="button" onClick={() => recentOrdersQuery.refetch()} className="subtle-link">تحديث</button></div>{recentOrdersQuery.isLoading ? <div className="space-y-3"><div className="skeleton-card h-16" /><div className="skeleton-card h-16" /></div> : recentOrders.length ? <div className="space-y-3">{recentOrders.map((order) => <div key={order.id} className="order-row"><div><strong>طلب #{order.id}</strong><p>{order.customerName} · {order.customerPhone}</p></div><div className="text-center"><strong>{Number(order.total).toFixed(2)} {order.paymentMethod === "cod" ? "LYD" : ""}</strong><p>{new Date(order.createdAt).toLocaleDateString("ar-LY")}</p></div><span className="status-badge">{orderStatus[order.status] || order.status}</span></div>)}</div> : <div className="empty-catalog min-h-[240px]"><ShoppingCart size={24} className="text-[#d6b56b]" /><h3 className="font-serif text-xl">لا توجد طلبات</h3></div>}</div>}

      {tab === "settings" && <form onSubmit={saveStoreSettings} className="admin-card max-w-3xl space-y-5"><div className="mb-2"><span className="section-kicker">STORE SETTINGS</span><h2 className="mt-2 font-serif text-2xl">إعدادات المتجر</h2><p className="mt-2 text-sm text-[var(--store-muted)]">تظهر التعديلات مباشرة بعد الحفظ ويمكن معاينتها من زر «معاينة الموقع».</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">اسم المتجر<input value={settings.storeName} onChange={(e) => setSettings({ ...settings, storeName: e.target.value })} /></label><label className="field-label">العملة<input value={settings.currency} onChange={(e) => setSettings({ ...settings, currency: e.target.value })} /></label></div><label className="field-label">الوصف المختصر<input value={settings.tagline} onChange={(e) => setSettings({ ...settings, tagline: e.target.value })} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="field-label">رقم WhatsApp<input value={settings.whatsappNumber} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} placeholder="2189..." /></label><label className="field-label">رسوم التوصيل<input inputMode="decimal" value={settings.localShippingFee} onChange={(e) => setSettings({ ...settings, localShippingFee: e.target.value })} /></label></div><label className="field-label">الشحن المجاني فوق<input inputMode="decimal" value={settings.freeShippingThreshold} onChange={(e) => setSettings({ ...settings, freeShippingThreshold: e.target.value })} /></label><div className="space-y-3"><label className="check-option"><input type="checkbox" checked={settings.enableWhatsapp} onChange={(e) => setSettings({ ...settings, enableWhatsapp: e.target.checked })} /><span>تفعيل الطلب والتواصل عبر WhatsApp</span></label><label className="check-option"><input type="checkbox" checked={settings.enableOnlinePayment} onChange={(e) => setSettings({ ...settings, enableOnlinePayment: e.target.checked })} /><span>تفعيل الدفع الإلكتروني عند ربط بوابة الدفع</span></label></div><button disabled={saveSettings.isPending} className="gold-button" type="submit">{saveSettings.isPending ? "جارٍ الحفظ..." : "حفظ الإعدادات"}<Check size={16} /></button></form>}
    </div>
  </DashboardLayout>;
}
