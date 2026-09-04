import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpLeft,
  Check,
  ChevronLeft,
  Clock3,
  Heart,
  Home as HomeIcon,
  Leaf,
  LockKeyhole,
  MessageCircle,
  PackageCheck,
  RotateCcw,
  Search,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  UserRound,
  WifiOff,
  X,
} from "lucide-react";
import { StoreHeader } from "@/components/store/StoreHeader";
import { ProductCard } from "@/components/store/ProductCard";
import { ProductModal } from "@/components/store/ProductModal";
import { CartDrawer } from "@/components/store/CartDrawer";
import { PWAInstallPrompt } from "@/components/store/PWAInstallPrompt";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import type { Product } from "../../../drizzle/schema";

const HERO_IMAGE = "/manus-storage/spices-dark_a0717697.jpeg";
const CATEGORY_IMAGES = [
  "/product-images/category-1.svg",
  "/product-images/category-2.svg",
  "/product-images/category-3.svg",
  "/product-images/category-4.svg",
  "/product-images/category-5.svg",
  "/product-images/category-6.svg",
  "/product-images/category-7.svg",
  "/product-images/category-8.svg",
  "/product-images/category-9.svg",
];

type CartState = {
  productId: number;
  quantity: number;
  optionKey: string;
  unitPrice: number;
}[];

function formatCurrency(value: number, currency: string) {
  return `${value.toFixed(2)} ${currency}`;
}

export default function Home() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null
  );
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const { user } = useAuth();
  const guestFavoritesKey = "noir-favorites-guest";
  const userFavoritesKey = user
    ? `noir-favorites-user-${user.id}`
    : guestFavoritesKey;
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("noir-favorites-guest") || "[]");
    } catch {
      return [];
    }
  });
  const serverFavoritesQuery = trpc.customer.favorites.useQuery(undefined, {
    enabled: Boolean(user),
    retry: false,
  });
  const syncFavorites = trpc.customer.syncFavorites.useMutation();
  const favoriteHydratedFor = useRef<number | null>(null);
  const [cart, setCart] = useState<CartState>(() => {
    try {
      return JSON.parse(localStorage.getItem("noir-cart") || "[]");
    } catch {
      return [];
    }
  });
  const [checkout, setCheckout] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    method: "cod",
  });
  const catalogInput = useMemo(
    () => ({
      search: search.trim() || undefined,
      categoryId: selectedCategoryId ?? undefined,
    }),
    [search, selectedCategoryId]
  );
  const productsQuery = trpc.catalog.products.useQuery(catalogInput);
  const categoriesQuery = trpc.catalog.categories.useQuery();
  const settingsQuery = trpc.catalog.settings.useQuery();
  const createOrder = trpc.checkout.createOrder.useMutation();
  const products = productsQuery.data ?? [];
  const settings = settingsQuery.data;
  const currency = settings?.currency || "LYD";
  const storeName = settings?.storeName || "الذهب الأسود للتوابل";
  const categories = categoriesQuery.data ?? [];
  const selectedCategory = categories.find(
    category => category.id === selectedCategoryId
  );

  useEffect(() => {
    localStorage.setItem("noir-cart", JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    if (user && favoriteHydratedFor.current !== user.id) return;
    try {
      localStorage.setItem(userFavoritesKey, JSON.stringify(favorites));
    } catch {}
  }, [favorites, userFavoritesKey, user]);

  useEffect(() => {
    if (!user) {
      favoriteHydratedFor.current = null;
      try {
        setFavorites(
          JSON.parse(localStorage.getItem(guestFavoritesKey) || "[]")
        );
      } catch {
        setFavorites([]);
      }
      return;
    }
    if (
      serverFavoritesQuery.isLoading ||
      serverFavoritesQuery.data === undefined
    )
      return;
    if (favoriteHydratedFor.current === user.id) return;
    favoriteHydratedFor.current = user.id;
    let stored: number[] = [];
    try {
      stored = JSON.parse(
        localStorage.getItem(`noir-favorites-user-${user.id}`) ||
          localStorage.getItem(guestFavoritesKey) ||
          "[]"
      );
    } catch {}
    const serverIds = serverFavoritesQuery.data.map(item => item.productId);
    const merged = Array.from(new Set([...serverIds, ...stored]));
    setFavorites(merged);
    syncFavorites.mutate({ productIds: merged });
    try {
      localStorage.removeItem(guestFavoritesKey);
    } catch {}
  }, [user, serverFavoritesQuery.isLoading, serverFavoritesQuery.data]);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);

  const cartItems = useMemo(
    () =>
      cart
        .map(line => {
          const product = products.find(item => item.id === line.productId);
          return product
            ? {
                product,
                quantity: line.quantity,
                optionKey: line.optionKey || "100g",
                unitPrice: line.unitPrice || Number(product.price),
              }
            : null;
        })
        .filter(Boolean) as {
        product: Product;
        quantity: number;
        optionKey: string;
        unitPrice: number;
      }[],
    [cart, products]
  );
  const cartCount = cart.reduce((sum, line) => sum + line.quantity, 0);
  const subtotal = cartItems.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0
  );
  const shippingFee =
    subtotal >= Number(settings?.freeShippingThreshold || 250)
      ? 0
      : Number(settings?.localShippingFee || 15);
  const featured = products
    .filter(product => product.isFeatured === 1 || product.isNew === 1)
    .slice(0, 6);
  const bestSellers = products
    .filter(product => product.isBestSeller === 1)
    .slice(0, 6);
  // The category query already returns every matching product; keep the full
  // result so users can browse the complete category on mobile and desktop.
  const isSearching = Boolean(search.trim());
  // Search and category results must show the complete server response. The
  // featured/best-seller slices are only for the unfiltered storefront home.
  const displayFeatured = isSearching || selectedCategoryId
    ? products
    : featured.length
      ? featured
      : products.slice(0, 6);
  const displayBestSellers = isSearching || selectedCategoryId
    ? []
    : bestSellers.length
      ? bestSellers
      : products.slice(6, 12);

  function addToCart(
    product: Product,
    optionKey = "100g",
    unitPrice = Number(product.price)
  ) {
    if (product.stock <= 0) {
      toast.error("هذا المنتج غير متوفر حاليًا");
      return;
    }
    setCart(current => {
      const existing = current.find(
        item => item.productId === product.id && item.optionKey === optionKey
      );
      return existing
        ? current.map(item =>
            item.productId === product.id && item.optionKey === optionKey
              ? {
                  ...item,
                  quantity: Math.min(item.quantity + 1, product.stock),
                }
              : item
          )
        : [
            ...current,
            { productId: product.id, quantity: 1, optionKey, unitPrice },
          ];
    });
    navigator.vibrate?.(12);
    toast.success("أضيفت القطعة إلى سلتك", { description: product.name });
  }

  function changeQuantity(
    productId: number,
    optionKey: string,
    quantity: number
  ) {
    const product = products.find(item => item.id === productId);
    const safeQuantity = product
      ? Math.min(quantity, Math.max(product.stock, 0))
      : quantity;
    setCart(current =>
      safeQuantity <= 0
        ? current.filter(
            item =>
              !(item.productId === productId && item.optionKey === optionKey)
          )
        : current.map(item =>
            item.productId === productId && item.optionKey === optionKey
              ? { ...item, quantity: safeQuantity }
              : item
          )
    );
  }

  function toggleFavorite(productId: number) {
    setFavorites(current => {
      const exists = current.includes(productId);
      const next = exists
        ? current.filter(id => id !== productId)
        : [...current, productId];
      if (user) syncFavorites.mutate({ productIds: next });
      navigator.vibrate?.(8);
      toast.success(exists ? "أزيلت من المفضلة" : "أضيفت إلى المفضلة");
      return next;
    });
  }

  function buildWhatsappUrl(
    orderId: number,
    name: string,
    phone: string,
    address: string,
    notes: string,
    lines: {
      product: Product;
      quantity: number;
      optionKey?: string;
      unitPrice?: number;
    }[],
    total: number
  ) {
    const number = (settings?.whatsappNumber || "").replace(/\D/g, "");
    if (!number) return null;
    const items = lines
      .map(
        line =>
          `• ${line.quantity} × ${line.product.name} (${line.optionKey === "1kg" ? "1 كيلو" : line.optionKey === "500g" ? "500غ" : line.optionKey === "250g" ? "250غ" : "100غ"}) — ${formatCurrency((line.unitPrice || Number(line.product.price)) * line.quantity, currency)}`
      )
      .join("\n");
    const message = `طلب جديد من ${storeName}\nرقم الطلب: #${orderId}\nالعميل: ${name}\nالهاتف: ${phone}\n\nالمنتجات:\n${items}\n\nالإجمالي: ${formatCurrency(total, currency)}\nالعنوان: ${address || "سيتم تحديده عبر واتساب"}\nطريقة الدفع: الدفع عند الاستلام\nملاحظات: ${notes || "لا توجد"}`;
    return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  }

  function openDirectWhatsapp() {
    const number = (settings?.whatsappNumber || "").replace(/\D/g, "");
    if (!settings?.enableWhatsapp || !number) {
      toast.error("التواصل عبر WhatsApp غير مفعّل أو لم يُضف الرقم بعد");
      return;
    }
    const message = `السلام عليكم، أريد الاستفسار عن منتجات الذهب الأسود للتوابل.`;
    window.open(
      `https://wa.me/${number}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function selectCategory(categoryId: number) {
    setSelectedCategoryId(categoryId);
    window.history.pushState({ categoryId }, "", `#category-${categoryId}`);
    document
      .getElementById("collection")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearCategory() {
    setSelectedCategoryId(null);
    if (window.location.hash.startsWith("#category-"))
      window.history.pushState(
        {},
        "",
        window.location.pathname + window.location.search
      );
  }

  function openProduct(product: Product) {
    setSelectedProduct(product);
    window.history.pushState(
      { productId: product.id },
      "",
      `#product-${product.id}`
    );
  }

  function closeProduct() {
    if (window.location.hash.startsWith("#product-")) window.history.back();
    else setSelectedProduct(null);
  }

  function scrollToSection(id: string) {
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
    setMenuOpen(false);
  }

  useEffect(() => {
    const onPopState = () => {
      const productMatch = window.location.hash.match(/^#product-(\d+)$/);
      const categoryMatch = window.location.hash.match(/^#category-(\d+)$/);
      setSelectedProduct(
        productMatch
          ? products.find(item => item.id === Number(productMatch[1])) || null
          : null
      );
      setSelectedCategoryId(categoryMatch ? Number(categoryMatch[1]) : null);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [products]);

  async function quickWhatsapp(
    product: Product,
    optionKey = "100g",
    unitPrice = Number(product.price)
  ) {
    if (!settings?.enableWhatsapp || !settings?.whatsappNumber) {
      toast.error("الطلب عبر WhatsApp غير مفعّل أو لم يُضف الرقم بعد");
      return;
    }
    try {
      const result = await createOrder.mutateAsync({
        customerName: "زائر المتجر",
        customerPhone: "يُستكمل عبر واتساب",
        paymentMethod: "whatsapp",
        shippingMethod: "local_delivery",
        subtotal: String(unitPrice),
        discount: "0",
        shipping: "0",
        total: String(unitPrice),
        isWhatsapp: true,
        items: [
          {
            productId: product.id,
            productName: product.name,
            imageUrl: product.imageUrl,
            quantity: 1,
            unitPrice: String(unitPrice),
            selectedOptions: optionKey,
          },
        ],
      });
      const url = buildWhatsappUrl(
        result.orderId,
        "زائر المتجر",
        "يُستكمل عبر واتساب",
        "سيتم تحديده عبر واتساب",
        "",
        [{ product, quantity: 1, optionKey, unitPrice }],
        Number(unitPrice)
      );
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      toast.success("تم تجهيز طلبك لواتساب");
    } catch {
      toast.error("تعذر إنشاء الطلب، حاول مرة أخرى");
    }
  }

  async function submitCheckout(event: FormEvent) {
    event.preventDefault();
    if (!checkout.name.trim() || !checkout.phone.trim()) {
      toast.error("أدخل الاسم ورقم الهاتف لإكمال الطلب");
      return;
    }
    try {
      const total = subtotal + shippingFee;
      const result = await createOrder.mutateAsync({
        customerName: checkout.name,
        customerPhone: checkout.phone,
        customerEmail: checkout.email || undefined,
        address: checkout.address || undefined,
        paymentMethod: checkout.method,
        shippingMethod: "local_delivery",
        subtotal: subtotal.toFixed(2),
        discount: "0",
        shipping: shippingFee.toFixed(2),
        total: total.toFixed(2),
        notes: checkout.notes || undefined,
        isWhatsapp: checkout.method === "whatsapp",
        items: cartItems.map(({ product, quantity, optionKey, unitPrice }) => ({
          productId: product.id,
          productName: product.name,
          imageUrl: product.imageUrl,
          quantity,
          unitPrice: String(unitPrice),
          selectedOptions: optionKey,
        })),
      });
      if (checkout.method === "whatsapp") {
        const url = buildWhatsappUrl(
          result.orderId,
          checkout.name,
          checkout.phone,
          checkout.address,
          checkout.notes,
          cartItems,
          total
        );
        if (url) window.open(url, "_blank", "noopener,noreferrer");
        else toast.error("أضف رقم WhatsApp من لوحة الإدارة أولًا");
      }
      setCart([]);
      setCheckoutOpen(false);
      setCartOpen(false);
      setCheckout({
        name: "",
        phone: "",
        email: "",
        address: "",
        notes: "",
        method: "cod",
      });
      toast.success(`تم استلام طلبك #${result.orderId}`, {
        description: "سنعاود التواصل معك قريبًا.",
      });
    } catch {
      toast.error("تعذر إنشاء الطلب، تحقق من البيانات وحاول مجددًا");
    }
  }

  return (
    <div
      id="top"
      className="min-h-screen overflow-x-hidden bg-[#0c0b0a] text-[#f8f2e5]"
      dir="rtl"
    >
      <PWAInstallPrompt />
      <StoreHeader
        cartCount={cartCount}
        search={search}
        onSearchChange={setSearch}
        onCart={() => setCartOpen(true)}
        onMenu={() => setMenuOpen(open => !open)}
        menuOpen={menuOpen}
        onAdmin={() => setLocation("/admin")}
        onAccount={() => setLocation("/account")}
        onWhatsapp={openDirectWhatsapp}
      />
      <main>
        <section className="container pt-6 sm:pt-8">
          <div className="hero-shell">
            <div
              className="hero-image"
              style={{
                backgroundImage: `linear-gradient(90deg, rgba(12,11,10,.96) 0%, rgba(12,11,10,.76) 38%, rgba(12,11,10,.18) 100%), url(${HERO_IMAGE})`,
              }}
            />
            <div className="hero-grain" />
            <div className="relative z-10 grid min-h-[560px] items-end gap-10 px-6 py-10 sm:px-10 lg:grid-cols-[1fr_0.9fr] lg:items-center lg:px-20 lg:py-20">
              <div className="max-w-xl">
                <div className="mb-7 flex items-center gap-3 text-xs tracking-[0.24em] text-[#d6b56b]">
                  <span className="gold-line" /> الذهب الأسود / توابل ومكونات
                  طبيعية
                </div>
                <h1 className="max-w-lg font-serif text-5xl leading-[1.12] text-[#f8f0df] sm:text-7xl">
                  جودة عالية
                  <br />
                  <span className="text-gold-gradient">من قلب الطبيعة.</span>
                </h1>
                <p className="mt-7 max-w-md text-sm leading-8 text-[#d4ccc0] sm:text-base">
                  تشكيلة مميزة من أجود التوابل والبهارات والمكونات الطبيعية،
                  نختارها بعناية لتمنح مطبخك نكهة أصيلة في كل وصفة.
                </p>
                <div className="mt-9 flex flex-wrap gap-3">
                  <a href="#collection" className="gold-button">
                    تسوق الآن <ArrowLeft size={17} />
                  </a>
                  <a href="#ritual" className="ghost-button">
                    اكتشف عالم الذهب الأسود
                  </a>
                </div>
                <div className="mt-10 flex flex-wrap items-center gap-5 text-[11px] text-[#b8ada0]">
                  <span className="flex items-center gap-2">
                    <Leaf size={15} className="text-[#d6b56b]" /> مكونات مختارة
                  </span>
                  <span className="flex items-center gap-2">
                    <PackageCheck size={15} className="text-[#d6b56b]" /> تغليف
                    يحفظ النكهة
                  </span>
                  <span className="flex items-center gap-2">
                    <ShieldCheck size={15} className="text-[#d6b56b]" /> دفع آمن
                  </span>
                </div>
              </div>
              <div className="hidden justify-self-end lg:flex">
                <div className="hero-note glass-panel p-6">
                  <span className="mb-12 block text-[10px] tracking-[0.28em] text-[#d6b56b]">
                    طعم أصيل
                  </span>
                  <p className="font-serif text-2xl leading-9 text-[#f6eddb]">
                    "نكهة تبدأ
                    <br />
                    من اختيار جيد."
                  </p>
                  <div className="mt-10 flex items-center gap-3 text-[10px] tracking-[0.12em] text-[#9f968b]">
                    <span className="h-px w-8 bg-[#d6b56b]" /> EST. 2026
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-5 sm:py-7">
          <div className="trust-grid">
            <div>
              <span className="trust-icon">
                <Truck size={18} />
              </span>
              <div>
                <strong>توصيل سريع</strong>
                <span>إلى المناطق المتاحة</span>
              </div>
            </div>
            <div>
              <span className="trust-icon">
                <ShieldCheck size={18} />
              </span>
              <div>
                <strong>جودة مضمونة</strong>
                <span>نختار الأفضل لك</span>
              </div>
            </div>
            <div>
              <span className="trust-icon">
                <LockKeyhole size={18} />
              </span>
              <div>
                <strong>دفع آمن</strong>
                <span>بياناتك محمية</span>
              </div>
            </div>
            <div>
              <span className="trust-icon">
                <MessageCircle size={18} />
              </span>
              <div>
                <strong>دعم مباشر</strong>
                <span>تواصل معنا عبر واتساب</span>
              </div>
            </div>
          </div>
        </section>
        <section className="container py-5 sm:py-7">
          <div className="spice-process">
            <div className="process-title">
              <span className="section-kicker">من الحبة... إلى النكهة</span>
              <h2>تجربة بسيطة تبدأ من اختيارك</h2>
            </div>
            <div className="process-steps">
              <div>
                <span>01</span>
                <Leaf size={22} />
                <strong>اختيار المكونات</strong>
              </div>
              <i>←</i>
              <div>
                <span>02</span>
                <Sparkles size={22} />
                <strong>الطحن والتجهيز</strong>
              </div>
              <i>←</i>
              <div>
                <span>03</span>
                <PackageCheck size={22} />
                <strong>تعبئة بعناية</strong>
              </div>
              <i>←</i>
              <div>
                <span>04</span>
                <ShoppingBag size={22} />
                <strong>إلى مطبخك</strong>
              </div>
            </div>
          </div>
        </section>
        <section id="categories" className="container py-10 sm:py-14">
          <div className="section-heading">
            <div>
              <span className="section-kicker">SHOP BY CATEGORY</span>
              <h2>تسوق حسب التصنيف</h2>
            </div>
            <button
              type="button"
              onClick={() => {
                clearCategory();
                document
                  .getElementById("collection")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
              className="subtle-link"
            >
              كل التصنيفات <ArrowUpLeft size={15} />
            </button>
          </div>
          <div className="category-grid">
            {categories.map((category, index) => (
              <button
                type="button"
                key={category.id}
                onClick={() => selectCategory(category.id)}
                className={`category-card text-right ${selectedCategoryId === category.id ? "selected" : ""}`}
              >
                <img
                  src={CATEGORY_IMAGES[index % CATEGORY_IMAGES.length]}
                  alt={category.name}
                />
                <div className="category-overlay" />
                <div className="relative z-10 flex items-end justify-between">
                  <div>
                    <span className="mb-2 block text-[10px] tracking-[0.2em] text-[#d6b56b]">
                      CATEGORY {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="font-serif text-2xl">{category.name}</h3>
                  </div>
                  <ChevronLeft size={20} className="text-[#e2c987]" />
                </div>
              </button>
            ))}
          </div>
        </section>
        <section
          id="collection"
          className="container py-10 scroll-mt-24 sm:py-14"
        >
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE EDIT</span>
              <h2>
                {selectedCategory ? selectedCategory.name : "مختارات تليق بك"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {selectedCategoryId && (
                <button
                  type="button"
                  onClick={clearCategory}
                  className="category-back-button"
                >
                  <ArrowRight size={15} /> العودة إلى التصنيفات
                </button>
              )}
              <span className="text-xs text-[#8f887e]">
                {products.length} قطعة
              </span>
            </div>
          </div>
          {productsQuery.isLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="skeleton-card" />
              ))}
            </div>
          ) : displayFeatured.length ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {displayFeatured.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addToCart(product)}
                  onOpen={() => openProduct(product)}
                  onFavorite={() => toggleFavorite(product.id)}
                  favorite={favorites.includes(product.id)}
                />
              ))}
            </div>
          ) : (
            <div className="empty-catalog">
              <Sparkles size={24} className="text-[#d6b56b]" />
              <h3 className="font-serif text-2xl">المجموعة تستعد للظهور</h3>
              <p>أضف أول منتجاتك من لوحة الإدارة لتظهر هنا تلقائيًا.</p>
              <a href="#ritual" className="subtle-link">
                تعرّف على المنظومة <ArrowLeft size={15} />
              </a>
            </div>
          )}
        </section>
        <section className="container py-10 sm:py-14">
          <div className="editorial-banner">
            <div className="editorial-copy">
              <span className="section-kicker">اختيارنا لك</span>
              <h2 className="font-serif text-4xl leading-tight sm:text-5xl">
                من الحبة...
                <br />
                <em>إلى النكهة.</em>
              </h2>
              <p>
                نختار التوابل والمكونات بعناية، ونقدمها لك بأوزان واضحة وجودة
                مناسبة للمطبخ اليومي والضيافة.
              </p>
              <a href="#ritual" className="subtle-link">
                اكتشف اختياراتنا <ArrowLeft size={15} />
              </a>
            </div>
            <div className="editorial-orb" />
          </div>
        </section>
        {displayBestSellers.length > 0 && (
          <section
            id="best-sellers"
            className="container py-10 sm:py-14 scroll-mt-24"
          >
            <div className="section-heading">
              <div>
                <span className="section-kicker">LOVED BY MANY</span>
                <h2>الأكثر طلبًا</h2>
              </div>
              <a href="#collection" className="subtle-link">
                كل القطع <ArrowLeft size={15} />
              </a>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
              {displayBestSellers.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAdd={() => addToCart(product)}
                  onOpen={() => openProduct(product)}
                  onFavorite={() => toggleFavorite(product.id)}
                  favorite={favorites.includes(product.id)}
                />
              ))}
            </div>
          </section>
        )}
        <section id="ritual" className="container py-14 sm:py-20">
          <div className="ritual-card">
            <div>
              <span className="section-kicker">OUR PHILOSOPHY</span>
              <h2 className="mt-4 max-w-xl font-serif text-4xl leading-tight sm:text-6xl">
                مذاقٌ أصيل.
                <br />
                <span className="text-gold-gradient">فرقٌ كبير.</span>
              </h2>
            </div>
            <div className="max-w-sm text-sm leading-8 text-[#a8a095]">
              <p>
                في الذهب الأسود للتوابل، نختار كل صنف ليكون إضافة حقيقية لمطبخك؛
                من البهارات اليومية إلى الحبوب والمكسرات والفواكه المجففة.
              </p>
              <div className="mt-7 flex items-center gap-3 text-[#d6b56b]">
                <span className="h-px w-10 bg-[#d6b56b]" /> اختيارات المطبخ
              </div>
            </div>
          </div>
        </section>
        {settings?.enableWhatsapp && settings?.whatsappNumber && (
          <button
            type="button"
            onClick={openDirectWhatsapp}
            className="whatsapp-float"
            aria-label="تواصل معنا مباشرة عبر واتساب"
          >
            <MessageCircle size={21} />
            <span>تواصل معنا</span>
          </button>
        )}
      </main>
      {!isOnline && (
        <div className="offline-banner" role="status">
          <WifiOff size={16} /> أنت غير متصل بالإنترنت. سيعود الاتصال تلقائيًا
          عند توفر الشبكة.
        </div>
      )}
      <nav className="mobile-bottom-nav" aria-label="التنقل السريع">
        <button type="button" onClick={() => scrollToSection("top")}>
          <HomeIcon size={18} />
          <span>الرئيسية</span>
        </button>
        <button type="button" onClick={() => scrollToSection("categories")}>
          <Search size={18} />
          <span>التصنيفات</span>
        </button>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="mobile-bottom-cart"
        >
          <ShoppingBag size={19} />
          {cartCount > 0 && <b>{cartCount}</b>}
          <span>السلة</span>
        </button>
        <button
          type="button"
          onClick={() => {
            if (user) setLocation("/account");
            else startLogin();
          }}
        >
          <UserRound size={18} />
          <span>حسابي</span>
        </button>
      </nav>
      <footer className="border-t border-white/10">
        <div className="container flex flex-col gap-5 py-8 text-xs text-[#8f887e] sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 الذهب الأسود. صُمم ليكون طقسًا.</p>
          <div className="flex gap-5">
            <a href="#top" className="hover:text-[#d6b56b]">
              العودة للأعلى
            </a>
            <button
              onClick={() => setLocation("/admin")}
              className="hover:text-[#d6b56b]"
            >
              مساحة الإدارة
            </button>
          </div>
        </div>
      </footer>
      <ProductModal
        product={selectedProduct}
        open={Boolean(selectedProduct)}
        onOpenChange={open => !open && setSelectedProduct(null)}
        onAdd={(optionKey, unitPrice) =>
          selectedProduct && addToCart(selectedProduct, optionKey, unitPrice)
        }
        onWhatsapp={(optionKey, unitPrice) =>
          selectedProduct &&
          quickWhatsapp(selectedProduct, optionKey, unitPrice)
        }
        onFavorite={() => selectedProduct && toggleFavorite(selectedProduct.id)}
        favorite={
          selectedProduct ? favorites.includes(selectedProduct.id) : false
        }
      />
      <CartDrawer
        open={cartOpen}
        items={cartItems}
        currency={currency}
        onClose={() => setCartOpen(false)}
        onChangeQuantity={changeQuantity}
        onRemove={(id, optionKey) => changeQuantity(id, optionKey, 0)}
        onCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0c0b0a]/95 px-4 py-8 backdrop-blur-md">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-white/10 bg-[#171411] p-5 shadow-2xl sm:p-8">
            <div className="mb-8 flex items-center justify-between">
              <div>
                <span className="section-kicker">CHECKOUT</span>
                <h2 className="mt-2 font-serif text-3xl">خطوتك الأخيرة</h2>
              </div>
              <button
                onClick={() => setCheckoutOpen(false)}
                className="icon-button"
              >
                <X size={20} />
              </button>
            </div>
            <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
              <form onSubmit={submitCheckout} className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field-label">
                    الاسم الكامل
                    <input
                      required
                      value={checkout.name}
                      onChange={event =>
                        setCheckout({ ...checkout, name: event.target.value })
                      }
                      placeholder="مثال: محمد العارف"
                    />
                  </label>
                  <label className="field-label">
                    رقم الهاتف
                    <input
                      required
                      value={checkout.phone}
                      onChange={event =>
                        setCheckout({ ...checkout, phone: event.target.value })
                      }
                      placeholder="091 000 0000"
                    />
                  </label>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="field-label">
                    البريد الإلكتروني <span>(اختياري)</span>
                    <input
                      type="email"
                      value={checkout.email}
                      onChange={event =>
                        setCheckout({ ...checkout, email: event.target.value })
                      }
                      placeholder="name@example.com"
                    />
                  </label>
                  <label className="field-label">
                    العنوان
                    <input
                      value={checkout.address}
                      onChange={event =>
                        setCheckout({
                          ...checkout,
                          address: event.target.value,
                        })
                      }
                      placeholder="المدينة، الحي، الشارع"
                    />
                  </label>
                </div>
                <label className="field-label">
                  ملاحظات إضافية <span>(اختياري)</span>
                  <textarea
                    rows={3}
                    value={checkout.notes}
                    onChange={event =>
                      setCheckout({ ...checkout, notes: event.target.value })
                    }
                    placeholder="وقت مناسب للتوصيل أو تفاصيل التغليف..."
                  />
                </label>
                <div>
                  <span className="field-label mb-3 block">طريقة الدفع</span>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCheckout({ ...checkout, method: "cod" })
                      }
                      className={`payment-option ${checkout.method === "cod" ? "selected" : ""}`}
                    >
                      <PackageCheck size={18} /> الدفع عند الاستلام
                    </button>
                    <button
                      type="button"
                      disabled={
                        !settings?.enableWhatsapp || !settings?.whatsappNumber
                      }
                      onClick={() =>
                        setCheckout({ ...checkout, method: "whatsapp" })
                      }
                      className={`payment-option ${checkout.method === "whatsapp" ? "selected" : ""} ${!settings?.enableWhatsapp || !settings?.whatsappNumber ? "disabled" : ""}`}
                    >
                      <MessageCircle size={18} /> الطلب عبر WhatsApp
                    </button>
                    <button
                      type="button"
                      disabled
                      className="payment-option disabled"
                    >
                      <LockKeyhole size={18} /> الدفع الإلكتروني قريبًا
                    </button>
                  </div>
                </div>
                <button
                  disabled={createOrder.isPending}
                  className="gold-button w-full sm:w-auto"
                  type="submit"
                >
                  {createOrder.isPending
                    ? "جارٍ تأكيد الطلب..."
                    : "تأكيد الطلب"}{" "}
                  <Check size={17} />
                </button>
              </form>
              <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <h3 className="mb-5 font-serif text-xl">ملخص الطلب</h3>
                <div className="space-y-4">
                  {cartItems.map(
                    ({ product, quantity, optionKey, unitPrice }) => (
                      <div
                        key={`${product.id}-${optionKey}`}
                        className="flex gap-3"
                      >
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm">{product.name}</p>
                          <p className="mt-1 text-xs text-[#8e857a]">
                            {quantity} × {formatCurrency(unitPrice, currency)}
                          </p>
                        </div>
                        <span className="text-sm text-[#d6b56b]">
                          {formatCurrency(unitPrice * quantity, currency)}
                        </span>
                      </div>
                    )
                  )}
                </div>
                <div className="my-5 h-px bg-white/10" />
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between text-[#999087]">
                    <span>الإجمالي الفرعي</span>
                    <span>{formatCurrency(subtotal, currency)}</span>
                  </div>
                  <div className="flex justify-between text-[#999087]">
                    <span>الشحن</span>
                    <span>
                      {shippingFee === 0
                        ? "مجاني"
                        : formatCurrency(shippingFee, currency)}
                    </span>
                  </div>
                  <div className="flex justify-between pt-2 font-serif text-xl text-[#d6b56b]">
                    <span>الإجمالي</span>
                    <span>
                      {formatCurrency(subtotal + shippingFee, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
