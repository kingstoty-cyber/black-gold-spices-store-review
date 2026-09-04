import fs from "node:fs/promises";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { categories, products } from "../drizzle/schema";

type SourceProduct = { id: number; name: string; code: string; price: number; rawPrice: number; category: string };

const categoryImages: Record<string, string> = {
  "توابل وبهارات": "/product-images/category-6.svg",
  "بقوليات وحبوب": "/product-images/category-3.svg",
  "مكسرات": "/product-images/category-9.svg",
  "فواكه مجففة": "/product-images/category-7.svg",
  "حلويات وشوكولاتة": "/product-images/category-5.svg",
  "مخبوزات ومكونات حلويات": "/product-images/category-4.svg",
  "زيتون ومخللات": "/product-images/category-8.svg",
  "أجبان ومنتجات مبردة": "/product-images/category-1.svg",
  "أصناف متنوعة": "/product-images/category-2.svg",
};

function slugFor(item: SourceProduct) {
  return `${item.code}-${item.id}`;
}

function descriptionFor(item: SourceProduct) {
  const categoryDescriptions: Record<string, string> = {
    "توابل وبهارات": "بهار مختار بعناية ليمنح أطباقك عمقًا ورائحة دافئة.",
    "بقوليات وحبوب": "حبوب مختارة للاستخدام اليومي، بطعم أصيل وقوام متوازن.",
    "مكسرات": "مكسرات منتقاة بعناية، مناسبة للتقديم والضيافة والوصفات اليومية.",
    "فواكه مجففة": "ثمار مجففة بطعم غني، مثالية للوجبات الخفيفة والحلويات.",
    "حلويات وشوكولاتة": "مكوّن حلو يضيف لمسة احتفالية إلى وصفاتك ولحظاتك.",
    "مخبوزات ومكونات حلويات": "مكوّن موثوق لتحضير المخبوزات والحلويات بقوام ناجح.",
    "زيتون ومخللات": "مذاق مالح ومتوازن يرافق المائدة ويكمل الأطباق.",
    "أجبان ومنتجات مبردة": "منتج مبرد مختار بعناية للحفاظ على الطعم والجودة.",
    "أصناف متنوعة": "اختيار عملي من رفوفنا لتكمل احتياجات مطبخك اليومية.",
  };
  return `${categoryDescriptions[item.category] || "منتج مختار بعناية من متجرنا."} رقم الصنف: ${item.code}.`;
}

async function main() {
  const sourcePath = process.argv[2] || path.join(process.cwd(), "data/products_from_scale.json");
  const source = JSON.parse(await fs.readFile(path.resolve(sourcePath), "utf8")) as SourceProduct[];
  if (!Array.isArray(source) || source.length === 0) throw new Error("Catalog file is empty");
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const existing = await db.select({ id: products.id }).from(products).limit(1);
  if (existing.length) throw new Error("Products already exist; importer stopped to avoid duplicate catalog entries.");

  const uniqueCategories = [...new Set(source.map((item) => item.category))].sort((a, b) => a.localeCompare(b, "ar"));
  await db.insert(categories).values(uniqueCategories.map((name, index) => ({ name, slug: `category-${index + 1}`, description: `منتجات ${name}`, imageUrl: categoryImages[name], sortOrder: index + 1, isVisible: 1 })));
  const categoryRows = await db.select().from(categories).orderBy(asc(categories.sortOrder));
  const categoryIds = new Map(categoryRows.map((category) => [category.name, category.id]));

  const rows = source.map((item, index) => {
    const kiloPrice = Number(item.price.toFixed(2));
    const base = Number((kiloPrice / 10).toFixed(2));
    const imageUrl = `/product-images/${item.id}.svg`;
    const options = [
      { key: "100g", label: "100غ", price: base },
      { key: "250g", label: "250غ", price: Number((kiloPrice / 4).toFixed(2)) },
      { key: "500g", label: "500غ", price: Number((kiloPrice / 2).toFixed(2)) },
      { key: "1kg", label: "1 كيلو", price: kiloPrice },
    ];
    return {
      categoryId: categoryIds.get(item.category),
      name: item.name,
      slug: slugFor(item),
      shortDescription: `${item.category} · أوزان من 100غ حتى 1 كيلو`,
      description: descriptionFor(item),
      price: base.toFixed(2),
      currency: "LYD",
      sku: item.code,
      barcode: item.code,
      brand: "الذهب الأسود",
      imageUrl,
      gallery: imageUrl,
      options: JSON.stringify(options),
      stock: 100,
      isFeatured: index < 12 ? 1 : 0,
      isNew: index < 12 ? 1 : 0,
      isBestSeller: index % 11 === 0 ? 1 : 0,
      status: "active" as const,
      seoTitle: `${item.name} | الذهب الأسود`,
      seoDescription: descriptionFor(item),
    };
  });
  for (let offset = 0; offset < rows.length; offset += 50) {
    await db.insert(products).values(rows.slice(offset, offset + 50));
  }
  console.log(JSON.stringify({ importedProducts: rows.length, categories: uniqueCategories.length, sizesPerProduct: 4, stockPolicy: "default_zero_until_updated" }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
