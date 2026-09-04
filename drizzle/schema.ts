import {
  decimal,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  tinyint,
  varchar,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 32 }),
  avatarUrl: text("avatarUrl"),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin", "manager", "orders_manager", "products_manager", "content_manager", "support"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  parentId: int("parentId"),
  name: varchar("name", { length: 160 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  imageUrl: text("imageUrl"),
  sortOrder: int("sortOrder").default(0).notNull(),
  isVisible: tinyint("isVisible").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 220 }).notNull(),
  slug: varchar("slug", { length: 240 }).notNull().unique(),
  shortDescription: text("shortDescription"),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  oldPrice: decimal("oldPrice", { precision: 10, scale: 2 }),
  currency: varchar("currency", { length: 8 }).default("LYD").notNull(),
  sku: varchar("sku", { length: 80 }).notNull().unique(),
  barcode: varchar("barcode", { length: 80 }),
  brand: varchar("brand", { length: 120 }),
  imageUrl: text("imageUrl").notNull(),
  gallery: text("gallery"),
  options: text("options"),
  stock: int("stock").default(0).notNull(),
  weight: decimal("weight", { precision: 8, scale: 2 }),
  isFeatured: tinyint("isFeatured").default(0).notNull(),
  isNew: tinyint("isNew").default(0).notNull(),
  isBestSeller: tinyint("isBestSeller").default(0).notNull(),
  status: mysqlEnum("status", ["active", "draft", "out_of_stock"]).default("active").notNull(),
  seoTitle: varchar("seoTitle", { length: 220 }),
  seoDescription: text("seoDescription"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  categoryIdx: index("products_category_idx").on(table.categoryId),
  statusIdx: index("products_status_idx").on(table.status),
}));

export const addresses = mysqlTable("addresses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  label: varchar("label", { length: 80 }).notNull(),
  recipient: varchar("recipient", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 32 }).notNull(),
  addressLine: text("addressLine").notNull(),
  city: varchar("city", { length: 100 }),
  isDefault: tinyint("isDefault").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const cartItems = mysqlTable("cart_items", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  quantity: int("quantity").default(1).notNull(),
  selectedOptions: text("selectedOptions"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index("cart_user_idx").on(table.userId),
}));

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 32 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }),
  address: text("address"),
  status: mysqlEnum("status", ["new", "reviewing", "confirmed", "preparing", "ready_to_ship", "shipped", "delivered", "completed", "cancelled", "returned"]).default("new").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 60 }).default("cod").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "failed", "refunded", "cancelled"]).default("pending").notNull(),
  shippingMethod: varchar("shippingMethod", { length: 80 }).default("local_delivery").notNull(),
  subtotal: decimal("subtotal", { precision: 10, scale: 2 }).notNull(),
  discount: decimal("discount", { precision: 10, scale: 2 }).default("0").notNull(),
  shipping: decimal("shipping", { precision: 10, scale: 2 }).default("0").notNull(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  couponCode: varchar("couponCode", { length: 40 }),
  notes: text("notes"),
  isWhatsapp: tinyint("isWhatsapp").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("orders_status_idx").on(table.status),
  createdIdx: index("orders_created_idx").on(table.createdAt),
}));

export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 220 }).notNull(),
  imageUrl: text("imageUrl"),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 10, scale: 2 }).notNull(),
  selectedOptions: text("selectedOptions"),
});

export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  productId: int("productId").notNull(),
  rating: int("rating").notNull(),
  comment: text("comment"),
  isVerified: tinyint("isVerified").default(0).notNull(),
  isVisible: tinyint("isVisible").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 40 }).notNull().unique(),
  type: mysqlEnum("type", ["percentage", "fixed"]).notNull(),
  value: decimal("value", { precision: 10, scale: 2 }).notNull(),
  minimumOrder: decimal("minimumOrder", { precision: 10, scale: 2 }).default("0").notNull(),
  usageLimit: int("usageLimit"),
  usedCount: int("usedCount").default(0).notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  isActive: tinyint("isActive").default(1).notNull(),
});

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 180 }).notNull(),
  body: text("body").notNull(),
  type: varchar("type", { length: 40 }).default("order").notNull(),
  isRead: tinyint("isRead").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const media = mysqlTable("media", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  filename: varchar("filename", { length: 220 }).notNull(),
  url: text("url").notNull(),
  fileKey: text("fileKey").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  sizeBytes: int("sizeBytes"),
  folder: varchar("folder", { length: 120 }).default("products").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  action: varchar("action", { length: 100 }).notNull(),
  entity: varchar("entity", { length: 80 }).notNull(),
  entityId: int("entityId"),
  metadata: text("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const storeSettings = mysqlTable("store_settings", {
  id: int("id").autoincrement().primaryKey(),
  storeName: varchar("storeName", { length: 160 }).default("الذهب الأسود").notNull(),
  tagline: varchar("tagline", { length: 240 }).default("طقوس يومية، بصياغة استثنائية").notNull(),
  logoUrl: text("logoUrl"),
  heroImageUrl: text("heroImageUrl"),
  whatsappNumber: varchar("whatsappNumber", { length: 40 }),
  phone: varchar("phone", { length: 40 }),
  email: varchar("email", { length: 320 }),
  currency: varchar("currency", { length: 8 }).default("LYD").notNull(),
  freeShippingThreshold: decimal("freeShippingThreshold", { precision: 10, scale: 2 }).default("250").notNull(),
  localShippingFee: decimal("localShippingFee", { precision: 10, scale: 2 }).default("15").notNull(),
  enableWhatsapp: tinyint("enableWhatsapp").default(1).notNull(),
  enableOnlinePayment: tinyint("enableOnlinePayment").default(0).notNull(),
  privacyPolicy: text("privacyPolicy"),
  terms: text("terms"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Order = typeof orders.$inferSelect;
export type OrderItem = typeof orderItems.$inferSelect;
export type StoreSettings = typeof storeSettings.$inferSelect;
