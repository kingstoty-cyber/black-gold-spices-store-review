import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ChevronDown, Heart, LogOut, MapPin, Package, Trash2, UserRound, MessageCircle, ShoppingBag, RefreshCw } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const statusLabels: Record<string, string> = { new: "جديد", reviewing: "قيد المراجعة", confirmed: "تم التأكيد", preparing: "قيد التجهيز", ready_to_ship: "جاهز للشحن", shipped: "تم الشحن", delivered: "تم التسليم", completed: "مكتمل", cancelled: "ملغي", returned: "مرتجع" };

export default function AccountPanel() {
  const { user, loading, logout } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [activeSection, setActiveSection] = useState<"orders" | "favorites" | "profile">("orders");
  const ordersQuery = trpc.customer.orders.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const favoritesQuery = trpc.customer.favorites.useQuery(undefined, { enabled: Boolean(user), retry: false });
  const settingsQuery = trpc.catalog.settings.useQuery();
  const orderDetailsQuery = trpc.customer.orderDetails.useQuery(
    { orderId: selectedOrderId || 0 },
    { enabled: Boolean(user && selectedOrderId), retry: false },
  );
  const syncFavorites = trpc.customer.syncFavorites.useMutation({
    onSuccess: () => favoritesQuery.refetch(),
    onError: () => toast.error("تعذر تحديث المفضلة، حاول مرة أخرى"),
  });

  useEffect(() => { if (!loading && !user) startLogin(); }, [loading, user]);

  if (loading || !user) return <div className="flex min-h-screen items-center justify-center bg-[#0c0b0a] text-[#d6b56b]">جارٍ تجهيز حسابك...</div>;

  const favorites = favoritesQuery.data ?? [];
  const orders = ordersQuery.data ?? [];

  function contactWhatsapp() {
    const number = (settingsQuery.data?.whatsappNumber || "").replace(/\D/g, "");
    if (!settingsQuery.data?.enableWhatsapp || !number) { toast.error("رقم WhatsApp غير مضاف من لوحة الإدارة"); return; }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent("السلام عليكم، أريد المساعدة بخصوص حسابي وطلباتي في الذهب الأسود.")}`, "_blank", "noopener,noreferrer");
  }

  function removeFavorite(productId: number) {
    syncFavorites.mutate({ productIds: favorites.filter((item) => item.productId !== productId).map((item) => item.productId) });
  }

  return <div className="min-h-screen bg-[#0c0b0a] px-4 py-8 text-[#f8f2e5]" dir="rtl">
    <div className="mx-auto max-w-6xl">
      <button onClick={() => setLocation("/")} className="subtle-link mb-8">← العودة إلى المتجر</button>
      <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><span className="section-kicker">ALDHAB ALASWAD / MY SPACE</span><h1 className="mt-2 font-serif text-4xl">أهلًا، {user.name || "بك"}</h1><p className="mt-2 text-sm text-[#9d9589]">طلباتك ومفضلاتك وتفاصيل حسابك محفوظة في مكان واحد.</p></div>
        <button onClick={() => logout().then(() => setLocation("/"))} className="ghost-button w-fit"><LogOut size={16} /> تسجيل الخروج</button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="admin-stat"><span className="admin-stat-icon"><UserRound size={18} /></span><span className="text-xs text-[#968e83]">البريد</span><strong className="!text-lg truncate">{user.email || "غير مضاف"}</strong></div>
        <div className="admin-stat"><span className="admin-stat-icon"><Package size={18} /></span><span className="text-xs text-[#968e83]">الطلبات</span><strong>{orders.length}</strong></div>
        <div className="admin-stat"><span className="admin-stat-icon"><Heart size={18} /></span><span className="text-xs text-[#968e83]">المفضلة</span><strong>{favorites.length}</strong></div>
      </div>

      <div className="account-tabs mt-6">
        <button className={activeSection === "orders" ? "active" : ""} onClick={() => setActiveSection("orders")}><Package size={16}/> طلباتي <b>{orders.length}</b></button>
        <button className={activeSection === "favorites" ? "active" : ""} onClick={() => setActiveSection("favorites")}><Heart size={16}/> المفضلة <b>{favorites.length}</b></button>
        <button className={activeSection === "profile" ? "active" : ""} onClick={() => setActiveSection("profile")}><UserRound size={16}/> حسابي</button>
      </div>
      <div className="account-hero mt-6"><div><span className="section-kicker">MY ACCOUNT</span><h2>كل ما يخص طلباتك في مكان واحد</h2><p>تابع الطلبات، احفظ منتجاتك المفضلة، وتواصل مع المتجر بسهولة.</p></div><div className="account-hero-badge"><ShoppingBag size={20}/><span>{orders.length} طلب</span></div></div>
      <div className="mt-6 grid gap-6">
        {activeSection === "orders" && <section className="admin-card">
          <div className="mb-6 flex items-center justify-between"><div><span className="section-kicker">ORDER HISTORY</span><h2 className="mt-2 font-serif text-2xl">طلباتي وتفاصيلها</h2></div><span className="text-xs text-[#8f887e]">مرتبطة بهذا الحساب</span></div>
          {ordersQuery.isLoading ? <div className="space-y-3"><div className="skeleton-card h-20" /><div className="skeleton-card h-20" /></div> : orders.length ? <div className="space-y-3">
            {orders.map((order) => <div key={order.id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
              <button type="button" onClick={() => setSelectedOrderId(selectedOrderId === order.id ? null : order.id)} className="flex w-full items-center justify-between gap-4 px-4 py-4 text-right hover:bg-white/[0.03]">
                <span><strong className="mb-1 block text-[#efe5d3]">طلب #{order.id}</strong><span className="text-xs text-[#8f887e]">{new Date(order.createdAt).toLocaleDateString("ar-LY")} · {Number(order.total).toFixed(2)} LYD</span></span>
                <span className="flex items-center gap-3"><strong className="text-[#d6b56b]">{statusLabels[order.status] || order.status}</strong><ChevronDown size={17} className={`transition-transform ${selectedOrderId === order.id ? "rotate-180" : ""}`} /></span>
              </button>
              {selectedOrderId === order.id && <div className="border-t border-white/10 px-4 py-5">{orderDetailsQuery.isLoading ? <div className="skeleton-card h-28" /> : orderDetailsQuery.data?.order.id === order.id ? <div className="space-y-5">
                <div className="order-timeline"><span className="done">تم الطلب</span><span className={order.status === "new" ? "current" : "done"}>التأكيد</span><span className={order.status === "preparing" ? "current" : order.status === "new" || order.status === "reviewing" ? "" : "done"}>التجهيز</span><span className={order.status === "shipped" ? "current" : order.status === "delivered" || order.status === "completed" ? "done" : ""}>التوصيل</span><span className={order.status === "delivered" || order.status === "completed" ? "done" : ""}>التسليم</span></div>
                <div className="grid gap-3 sm:grid-cols-2"><div className="health-row"><span>العميل</span><strong>{orderDetailsQuery.data.order.customerName}</strong></div><div className="health-row"><span>الهاتف</span><strong>{orderDetailsQuery.data.order.customerPhone}</strong></div><div className="health-row"><span>الدفع</span><strong>{orderDetailsQuery.data.order.paymentMethod === "cod" ? "الدفع عند الاستلام" : orderDetailsQuery.data.order.paymentMethod}</strong></div><div className="health-row"><span>حالة الدفع</span><strong>{orderDetailsQuery.data.order.paymentStatus === "paid" ? "مدفوع" : "معلق"}</strong></div></div>
                {orderDetailsQuery.data.order.address && <div className="health-row"><span>العنوان</span><strong>{orderDetailsQuery.data.order.address}</strong></div>}
                <div><h3 className="mb-3 font-serif text-lg">المنتجات</h3><div className="space-y-2">{orderDetailsQuery.data.items.map((item) => <div key={item.id} className="flex items-center gap-3 rounded-xl border border-white/10 p-3"><img src={item.imageUrl || ""} alt={item.productName} className="h-12 w-12 rounded-lg object-cover bg-white/5" /><div className="min-w-0 flex-1"><p className="truncate text-sm">{item.productName}</p><p className="text-xs text-[#8f887e]">{item.quantity} × {Number(item.unitPrice).toFixed(2)} LYD {item.selectedOptions ? `· ${item.selectedOptions}` : ""}</p></div><strong className="text-[#d6b56b]">{(item.quantity * Number(item.unitPrice)).toFixed(2)} LYD</strong></div>)}</div></div>
                <div className="flex justify-between border-t border-white/10 pt-4 font-serif text-xl"><span>الإجمالي</span><strong className="text-[#d6b56b]">{Number(orderDetailsQuery.data.order.total).toFixed(2)} LYD</strong></div>
              </div> : <p className="text-sm text-[#a59d92]">تعذر تحميل تفاصيل الطلب.</p>}</div>}
            </div>)}
          </div> : <div className="empty-catalog min-h-[230px]"><Package size={22} className="text-[#d6b56b]" /><h3 className="font-serif text-xl">لا توجد طلبات بعد</h3><p>ستظهر طلباتك هنا بعد أول عملية شراء.</p><button onClick={() => setLocation("/")} className="subtle-link">استكشف المنتجات ←</button></div>}
        </section>}

        {activeSection === "favorites" && <section className="admin-card"><div className="mb-5 flex items-center justify-between"><div><span className="section-kicker">SAVED ITEMS</span><h2 className="mt-2 font-serif text-2xl">مفضلتي</h2></div><span className="text-xs text-[var(--store-muted)]">{favorites.length} منتج</span></div>
          {favoritesQuery.isLoading ? <div className="grid gap-3 sm:grid-cols-2"><div className="skeleton-card h-24" /><div className="skeleton-card h-24" /></div> : favorites.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{favorites.map((item) => <div key={item.productId} className="favorite-card"><img src={`/product-images/${item.productId}.svg`} alt={item.name} /><div className="min-w-0 flex-1"><p className="truncate font-serif text-lg">{item.name}</p><p className="mt-1 text-sm text-[#d6b56b]">{Number(item.price).toFixed(0)} {item.currency}</p>{item.stock <= 0 && <span className="text-[11px] text-[#a59d92]">غير متوفر حاليًا</span>}<button type="button" onClick={() => removeFavorite(item.productId)} className="mt-3 subtle-link">إزالة من المفضلة <Trash2 size={14}/></button></div></div>)}</div> : <div className="empty-catalog min-h-[230px]"><Heart size={22} className="text-[#d6b56b]" /><h3 className="font-serif text-xl">لا توجد مفضلات</h3><p>اضغط على القلب بجانب أي منتج لحفظه هنا.</p><button onClick={() => setLocation("/")} className="subtle-link">تصفح المنتجات ←</button></div>}
        </section>}

        {activeSection === "profile" && <section className="admin-card"><div className="flex items-center justify-between"><div><span className="section-kicker">PROFILE & SUPPORT</span><h2 className="mt-2 font-serif text-2xl">تفاصيل الحساب</h2></div><span className="account-avatar"><UserRound size={22}/></span></div><div className="mt-6 grid gap-3 sm:grid-cols-3"><div className="health-row"><span>الاسم</span><strong>{user.name || "غير مضاف"}</strong></div><div className="health-row"><span>الهاتف</span><strong>{user.phone || "غير مضاف"}</strong></div><div className="health-row"><span>البريد</span><strong className="max-w-[220px] truncate">{user.email || "غير مضاف"}</strong></div></div><div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={contactWhatsapp} className="quick-action"><MapPin size={17} /> إدارة عناويني</button><button onClick={contactWhatsapp} className="quick-action"><MessageCircle size={17} /> تواصل مباشر مع المتجر</button></div></section>}
      </div>
      <nav className="mobile-bottom-nav account-mobile-nav" aria-label="تنقل الحساب">
        <button type="button" onClick={() => setLocation("/")}><ShoppingBag size={18}/><span>المتجر</span></button>
        <button type="button" className={activeSection === "orders" ? "active" : ""} onClick={() => setActiveSection("orders")}><Package size={18}/><span>طلباتي</span></button>
        <button type="button" className={activeSection === "favorites" ? "active" : ""} onClick={() => setActiveSection("favorites")}><Heart size={18}/><span>المفضلة</span></button>
        <button type="button" className={activeSection === "profile" ? "active" : ""} onClick={() => setActiveSection("profile")}><UserRound size={18}/><span>حسابي</span></button>
      </nav>
    </div>
  </div>;
}
