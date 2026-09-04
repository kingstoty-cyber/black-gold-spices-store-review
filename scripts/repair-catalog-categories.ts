import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { categories, products } from "../drizzle/schema";
import { getDb } from "../server/db";

type SourceProduct = { code: string; category: string };

async function main() {
  const sourcePath = process.argv[2] || path.join(process.cwd(), "data/products_from_scale.json");
  const source = JSON.parse(await fs.readFile(path.resolve(sourcePath), "utf8")) as SourceProduct[];
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");

  const categoryNames = [...new Set(source.map((item) => item.category))];
  const existingCategories = await db.select().from(categories);
  const byName = new Map(existingCategories.map((item) => [item.name, item]));

  for (let index = 0; index < categoryNames.length; index += 1) {
    const name = categoryNames[index];
    if (!byName.has(name)) {
      await db.insert(categories).values({
        name,
        slug: `category-${Date.now()}-${index + 1}`,
        description: `منتجات ${name}`,
        sortOrder: index + 1,
        isVisible: 1,
      });
    }
  }

  const refreshedCategories = await db.select().from(categories);
  const categoryByName = new Map(refreshedCategories.map((item) => [item.name, item]));
  let repaired = 0;

  for (const item of source) {
    const category = categoryByName.get(item.category);
    if (!category) continue;
    const existingProduct = await db.select({ id: products.id, categoryId: products.categoryId }).from(products).where(eq(products.sku, item.code)).limit(1);
    if (existingProduct[0] && existingProduct[0].categoryId !== category.id) {
      await db.update(products).set({ categoryId: category.id }).where(eq(products.id, existingProduct[0].id));
      repaired += 1;
    }
  }

  console.log(JSON.stringify({ repairedProducts: repaired, categories: categoryNames.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
