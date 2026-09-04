import { Menu, Search, ShoppingBag, UserRound, X, ShieldCheck, Sun, Moon, MessageCircle } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

export function StoreHeader({
  cartCount,
  search,
  onSearchChange,
  onCart,
  onMenu,
  menuOpen,
  onAdmin,
  onAccount,
  onWhatsapp,
}: {
  cartCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onCart: () => void;
  onMenu: () => void;
  menuOpen: boolean;
  onAdmin: () => void;
  onAccount: () => void;
  onWhatsapp: () => void;
}) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  return (
    <header className="store-header sticky top-0 z-40 border-b border-white/10 bg-[#0c0b0a]/90 backdrop-blur-xl">
      <div className="container flex h-[76px] items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button onClick={onMenu} className="icon-button lg:hidden" aria-label="فتح القائمة">
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
          <a href="#top" className="flex items-center gap-3">
            <span className="brand-mark"><img src="/icons/logo.svg" alt="" /></span>
            <span className="hidden text-right sm:block">
              <span className="block text-[10px] tracking-[0.25em] text-[#d6b56b]">ALDHAB ALASWAD</span>
              <span className="block font-serif text-[13px] text-[#f5efdf]">الذهب الأسود للتوابل</span>
            </span>
          </a>
        </div>

        <nav className="hidden items-center gap-7 lg:flex">
          <a className="nav-link active" href="#top">الرئيسية</a>
          <a className="nav-link" href="#collection">المجموعة</a>
          <a className="nav-link" href="#categories">التصنيفات</a>
          <a className="nav-link" href="#ritual">قصتنا</a>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <label className="hidden h-10 w-48 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 text-[#a7a095] md:flex">
            <Search size={16} />
            <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ابحث عن منتج..." className="w-full bg-transparent text-xs text-[#f5efdf] outline-none placeholder:text-[#847e74]" />
          </label>
          <button onClick={onWhatsapp} className="icon-button hidden sm:inline-grid text-[#58d68d]" aria-label="واتساب" title="تواصل معنا عبر واتساب"><MessageCircle size={19} /></button>
          <button onClick={() => { if (user?.role === "admin") onAdmin(); else if (user) onAccount(); else startLogin(); }} className="icon-button" aria-label={user ? "حسابي" : "تسجيل الدخول"}>
            {user?.role === "admin" ? <ShieldCheck size={19} /> : <UserRound size={19} />}
          </button>
          <button onClick={onCart} className="relative icon-button" aria-label="السلة">
            <ShoppingBag size={20} />
            {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
          </button>
          {toggleTheme && <button type="button" onClick={toggleTheme} className="icon-button" aria-label={theme === "dark" ? "تفعيل الوضع الفاتح" : "تفعيل الوضع الليلي"} title={theme === "dark" ? "الوضع الفاتح" : "الوضع الليلي"}>
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
          </button>}
        </div>
      </div>
      <div className="container pb-3 md:hidden">
        <label className="flex h-11 items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 text-[#a7a095]">
          <Search size={16} />
          <input value={search} onChange={(event) => onSearchChange(event.target.value)} placeholder="ابحث عن منتج أو علامة..." className="w-full bg-transparent text-sm text-[#f5efdf] outline-none placeholder:text-[#847e74]" />
        </label>
      </div>
      {menuOpen && <div className="container pb-4 lg:hidden"><div className="glass-panel flex flex-col gap-1 p-3"><a href="#top" onClick={onMenu} className="mobile-nav-link">الرئيسية</a><a href="#collection" onClick={onMenu} className="mobile-nav-link">المنتجات</a><a href="#categories" onClick={onMenu} className="mobile-nav-link">التصنيفات</a><a href="#best-sellers" onClick={onMenu} className="mobile-nav-link">الأكثر مبيعًا</a><a href="#ritual" onClick={onMenu} className="mobile-nav-link">عن المتجر</a><button type="button" onClick={() => { onMenu(); onAccount(); }} className="mobile-nav-link">حسابي</button><button type="button" onClick={() => { onMenu(); onCart(); }} className="mobile-nav-link">السلة {cartCount > 0 ? `(${cartCount})` : ""}</button><button type="button" onClick={() => { onMenu(); onWhatsapp(); }} className="mobile-nav-link text-emerald-400">تواصل مباشر عبر واتساب</button></div></div>}
    </header>
  );
}
