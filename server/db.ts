import { and, asc, desc, eq, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  auditLogs,
  categories,
  orderItems,
  orders,
  favorites,
  products,
  storeSettings,
  users,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod", "phone", "avatarUrl"] as const;
  for (const field of textFields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (!Object.keys(updateSet).length) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function listProducts(search?: string, categoryId?: number) {
  const db = await getDb();
  if (!db) return [];
  const filters = [eq(products.status, "active")];
  if (search) {
    filters.push(or(like(products.name, `%${search}%`), like(products.sku, `%${search}%`), like(products.brand, `%${search}%`))!);
  }
  if (categoryId) filters.push(eq(products.categoryId, categoryId));
  return db.select().from(products).where(and(...filters)).orderBy(desc(products.isFeatured), desc(products.createdAt));
}

export async function listCategories() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(eq(categories.isVisible, 1)).orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getStoreSettings() {
  const fallback = {
    id: 0,
    storeName: "الذهب الأسود",
    tagline: "نكهات أصيلة من قلب الطبيعة",
    logoUrl: null,
    heroImageUrl: null,
    whatsappNumber: null,
    phone: null,
    email: null,
    currency: "LYD",
    freeShippingThreshold: "250",
    localShippingFee: "15",
    enableWhatsapp: 1,
    enableOnlinePayment: 0,
    privacyPolicy: null,
    terms: null,
    updatedAt: new Date(),
  };
  const db = await getDb();
  if (!db) return fallback;
  const result = await db.select().from(storeSettings).limit(1);
  return result[0] ?? fallback;
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) return { revenue: "0", orders: 0, products: 0, customers: 0, lowStock: 0 };
  const [revenue, orderCount, productCount, customerCount, lowStock] = await Promise.all([
    db.select({ total: sql<string>`coalesce(sum(${orders.total}), 0)` }).from(orders).where(sql`${orders.status} not in ('cancelled', 'returned')`),
    db.select({ count: sql<number>`count(*)` }).from(orders),
    db.select({ count: sql<number>`count(*)` }).from(products),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.role, "user")),
    db.select({ count: sql<number>`count(*)` }).from(products).where(sql`${products.stock} <= 5`),
  ]);
  return { revenue: revenue[0]?.total ?? "0", orders: Number(orderCount[0]?.count ?? 0), products: Number(productCount[0]?.count ?? 0), customers: Number(customerCount[0]?.count ?? 0), lowStock: Number(lowStock[0]?.count ?? 0) };
}

export async function getOrdersForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
}

export async function getOrderDetailsForUser(userId: number, orderId: number) {
  const db = await getDb();
  if (!db) return null;
  const order = await db.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.userId, userId))).limit(1);
  if (!order[0]) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { order: order[0], items };
}

export async function getFavoritesForUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select({
    id: favorites.id,
    productId: products.id,
    name: products.name,
    slug: products.slug,
    imageUrl: products.imageUrl,
    price: products.price,
    oldPrice: products.oldPrice,
    currency: products.currency,
    stock: products.stock,
    status: products.status,
  }).from(favorites).innerJoin(products, eq(favorites.productId, products.id)).where(eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt));
}

export async function syncFavoritesForUser(userId: number, productIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  const uniqueIds = Array.from(new Set(productIds.filter((id) => Number.isInteger(id) && id > 0)));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  if (uniqueIds.length) {
    const existing = await db.select({ id: products.id }).from(products).where(sql`${products.id} in (${sql.join(uniqueIds.map((id) => sql`${id}`), sql`, `)})`);
    const allowed = new Set(existing.map((row) => row.id));
    const values = uniqueIds.filter((id) => allowed.has(id)).map((productId) => ({ userId, productId }));
    if (values.length) await db.insert(favorites).values(values);
  }
  return getFavoritesForUser(userId);
}

export async function createAuditLog(input: { userId?: number; action: string; entity: string; entityId?: number; metadata?: unknown }) {
  const db = await getDb();
  if (!db) return;
  await db.insert(auditLogs).values({ userId: input.userId, action: input.action, entity: input.entity, entityId: input.entityId, metadata: input.metadata ? JSON.stringify(input.metadata) : undefined });
}

export async function createOrder(input: {
  userId?: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  address?: string;
  paymentMethod: string;
  shippingMethod: string;
  subtotal: string;
  discount: string;
  shipping: string;
  total: string;
  couponCode?: string;
  notes?: string;
  isWhatsapp?: boolean;
  items: Array<{ productId: number; productName: string; imageUrl?: string; quantity: number; unitPrice: string; selectedOptions?: string }>;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database is not configured");
  return db.transaction(async (tx) => {
    const authoritativeItems: Array<{ productId: number; productName: string; imageUrl: string; quantity: number; unitPrice: string; selectedOptions?: string }> = [];
    let subtotal = 0;

    for (const item of input.items) {
      if (!Number.isInteger(item.productId) || item.productId <= 0 || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        throw new Error("بيانات أحد الأصناف غير صالحة");
      }
      const row = await tx.select({
        id: products.id, name: products.name, imageUrl: products.imageUrl, price: products.price,
        options: products.options, stock: products.stock, status: products.status,
      }).from(products).where(eq(products.id, item.productId)).limit(1);
      const product = row[0];
      if (!product || product.status !== "active" || product.stock < item.quantity) {
        throw new Error("أحد المنتجات لم يعد متوفرًا بهذه الكمية");
      }

      let unitPrice = Number(product.price);
      let selectedOptions = item.selectedOptions || "100g";
      try {
        const options = JSON.parse(product.options || "[]") as Array<{ key?: string; label?: string; price?: number }>;
        const requested = options.find((option) => option.key === selectedOptions || option.label === selectedOptions);
        if (requested && Number.isFinite(Number(requested.price))) {
          unitPrice = Number(requested.price);
          selectedOptions = requested.key || selectedOptions;
        } else if (selectedOptions !== "100g") {
          throw new Error("وزن الصنف المحدد غير صالح");
        }
      } catch (error) {
        if (error instanceof Error && error.message.includes("وزن الصنف")) throw error;
      }

      unitPrice = Math.max(0, Math.round(unitPrice));
      subtotal += unitPrice * item.quantity;
      authoritativeItems.push({
        productId: product.id,
        productName: product.name,
        imageUrl: product.imageUrl,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        selectedOptions,
      });
    }

    const discount = 0;
    const settings = await tx.select({ freeShippingThreshold: storeSettings.freeShippingThreshold, localShippingFee: storeSettings.localShippingFee }).from(storeSettings).limit(1);
    const freeThreshold = Number(settings[0]?.freeShippingThreshold ?? 250);
    const localFee = Number(settings[0]?.localShippingFee ?? 15);
    const shipping = subtotal >= freeThreshold ? 0 : Math.max(0, Math.round(localFee));
    const total = subtotal - discount + shipping;

    const inserted = await tx.insert(orders).values({
      userId: input.userId,
      customerName: input.customerName.trim(),
      customerPhone: input.customerPhone.trim(),
      customerEmail: input.customerEmail?.trim() || undefined,
      address: input.address?.trim() || undefined,
      paymentMethod: input.paymentMethod === "whatsapp" ? "whatsapp" : "cod",
      shippingMethod: "local_delivery",
      subtotal: subtotal.toFixed(2),
      discount: discount.toFixed(2),
      shipping: shipping.toFixed(2),
      total: total.toFixed(2),
      couponCode: input.couponCode?.trim() || undefined,
      notes: input.notes?.trim() || undefined,
      isWhatsapp: input.isWhatsapp ? 1 : 0,
    }).$returningId();
    const orderId = inserted[0]?.id;
    if (!orderId) throw new Error("Could not create order");
    await tx.insert(orderItems).values(authoritativeItems.map((item) => ({ ...item, orderId })));
    for (const item of authoritativeItems) {
      const updated = await tx.update(products).set({ stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)` }).where(and(eq(products.id, item.productId), sql`${products.stock} >= ${item.quantity}`));
      if (!updated[0]?.affectedRows) throw new Error("تعذر تحديث المخزون، حاول مرة أخرى");
    }
    return orderId;
  });
}
