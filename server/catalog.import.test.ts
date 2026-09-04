import { describe, expect, it } from "vitest";
import { sql } from "drizzle-orm";
import { categories, products } from "../drizzle/schema";
import { getDb } from "./db";

describe("imported spice catalog", () => {
  it("contains the source products, categories, and all four size keys", async () => {
    const db = await getDb();
    if (!db) return;
    const [productCount, categoryCount, variantCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(categories),
      db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.options} like '%100g%' and ${products.options} like '%250g%' and ${products.options} like '%500g%' and ${products.options} like '%1kg%'`),
    ]);
    expect(Number(productCount[0]?.count ?? 0)).toBe(217);
    expect(Number(categoryCount[0]?.count ?? 0)).toBe(9);
    expect(Number(variantCount[0]?.count ?? 0)).toBe(217);
  });
});
