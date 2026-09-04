import { Heart, Plus, Sparkles } from "lucide-react";
import type { Product } from "../../../../drizzle/schema";

export function ProductCard({ product, onAdd, onOpen, onFavorite, favorite }: { product: Product; onAdd: () => void; onOpen: () => void; onFavorite: () => void; favorite: boolean }) {
  const oldPrice = product.oldPrice ? Number(product.oldPrice) : 0;
  const price = Number(product.price);
  const discount = oldPrice > price ? Math.round(((oldPrice - price) / oldPrice) * 100) : 0;
  return (
    <article className="product-card group">
      <div className="product-image-wrap" onClick={onOpen} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") onOpen(); }} role="button" tabIndex={0} aria-label={`فتح ${product.name}`}>
        <img src={product.imageUrl || `/product-images/${product.id}.svg`} alt={product.name} className="product-image" loading="lazy" />
        <div className="absolute inset-x-3 top-3 flex items-center justify-between">
          <div className="flex gap-2">
            {product.isNew === 1 && <span className="eyebrow-chip">جديد</span>}
            {discount > 0 && <span className="sale-chip">-{discount}%</span>}
          </div>
          <button onClick={(event) => { event.stopPropagation(); onFavorite(); }} className={`icon-button small ${favorite ? "text-[#d6b56b]" : "text-white/70"}`} aria-label="إضافة للمفضلة"><Heart size={16} fill={favorite ? "currentColor" : "none"} /></button>
        </div>
        <span className="product-hover-cta">عرض التفاصيل</span>
      </div>
      <div className="px-4 pb-4 pt-4">
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[10px] uppercase tracking-[0.18em] text-[#8f887e]">{product.brand || "NOIR EDIT"}</span>
          {product.isBestSeller === 1 && <Sparkles size={15} className="text-[#d6b56b]" />}
        </div>
        <button onClick={onOpen} className="mb-2 block text-right font-serif text-lg leading-tight text-[#f7f1e4] transition-colors hover:text-[#d6b56b]">{product.name}</button>
        <p className="mb-4 min-h-10 text-xs leading-6 text-[#aaa39a]">{product.shortDescription || "صياغة راقية ترافق تفاصيل يومك."}</p>
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col"><span className="font-serif text-lg text-[#d6b56b]">{Math.round(price)} <small className="font-sans text-[10px] text-[#a89a82]">{product.currency}</small></span>{oldPrice > price && <span className="text-xs text-[#746e65] line-through">{Math.round(oldPrice)} {product.currency}</span>}</div>
          <button onClick={onAdd} disabled={product.stock <= 0} className="gold-button compact disabled:cursor-not-allowed disabled:opacity-40"><Plus size={16} /> أضف</button>
        </div>
      </div>
    </article>
  );
}
