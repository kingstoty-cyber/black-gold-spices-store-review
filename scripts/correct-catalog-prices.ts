import fs from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getDb } from "../server/db";
import { products } from "../drizzle/schema";

type SourceProduct = { code: string; price: number };

async function main() {
  const sourcePath = process.argv[2] || path.join(process.cwd(), "data/products_from_scale.json");
  const source = JSON.parse(await fs.readFile(path.resolve(sourcePath), "utf8")) as SourceProduct[];
  const db = await getDb();
  if (!db) throw new Error("DATABASE_URL is not configured");
  let updated = 0;
  for (const item of source) {
    const kiloPrice = Number(item.price.toFixed(2));
    const hundredGramPrice = Number((kiloPrice / 10).toFixed(2));
    const options = [
      { key: "100g", label: "100غ", price: hundredGramPrice },
      { key: "250g", label: "250غ", price: Number((kiloPrice / 4).toFixed(2)) },
      { key: "500g", label: "500غ", price: Number((kiloPrice / 2).toFixed(2)) },
      { key: "1kg", label: "1 كيلو", price: kiloPrice },
    ];
    const result = await db.update(products).set({ price: hundredGramPrice.toFixed(2), options: JSON.stringify(options) }).where(eq(products.sku, item.code));
    if (result[0]?.affectedRows) updated += Number(result[0].affectedRows);
  }
  console.log(JSON.stringify({ updatedProducts: updated, pricing: "source_is_1kg", sizes: ["100g", "250g", "500g", "1kg"] }, null, 2));
}

main().catch((error) => { console.error(error); process.exit(1); });
