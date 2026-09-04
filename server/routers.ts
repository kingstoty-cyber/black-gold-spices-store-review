import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { createAuditLog, createOrder, getAdminStats, getFavoritesForUser, getOrderDetailsForUser, getOrdersForUser, getStoreSettings, listCategories, listProducts, syncFavoritesForUser } from "./db";
import { products, storeSettings } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { getDb } from "./db";

const productInput = z.object({
  name: z.string().trim().min(2).max(220),
  slug: z.string().trim().min(2).max(240),
  shortDescription: z.string().max(1000).optional(),
  description: z.string().max(10000).optional(),
  price: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "السعر غير صالح"),
  oldPrice: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "السعر القديم غير صالح").optional(),
  currency: z.string().trim().min(1).max(8).default("LYD"),
  sku: z.string().trim().min(2).max(80),
  barcode: z.string().trim().max(80).optional(),
  imageUrl: z.string().trim().min(1),
  gallery: z.string().max(5000).optional(),
  options: z.string().max(5000).optional(),
  stock: z.number().int().min(0),
  weight: z.string().regex(/^\d+(?:\.\d{1,2})?$/, "الوزن غير صالح").optional(),
  categoryId: z.number().int().positive().optional(),
  brand: z.string().trim().max(120).optional(),
  status: z.enum(["active", "draft", "out_of_stock"]).default("active"),
  seoTitle: z.string().max(220).optional(),
  seoDescription: z.string().max(5000).optional(),
  isFeatured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  isBestSeller: z.boolean().default(false),
});

const adminOnlyProcedure = adminProcedure;

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),
  catalog: router({
    products: publicProcedure.input(z.object({ search: z.string().optional(), categoryId: z.number().optional() }).optional()).query(({ input }) => listProducts(input?.search, input?.categoryId)),
    categories: publicProcedure.query(() => listCategories()),
    settings: publicProcedure.query(() => getStoreSettings()),
    adminProducts: adminOnlyProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      return db.select().from(products).orderBy(products.createdAt);
    }),
    create: adminOnlyProcedure.input(productInput).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const result = await db.insert(products).values({ ...input, isFeatured: input.isFeatured ? 1 : 0, isNew: input.isNew ? 1 : 0, isBestSeller: input.isBestSeller ? 1 : 0 }).$returningId();
      await createAuditLog({ userId: ctx.user.id, action: "create", entity: "product", entityId: result[0]?.id });
      return result[0];
    }),
    update: adminOnlyProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const { id, ...values } = input;
      const existing = await db.select({ id: products.id }).from(products).where(eq(products.id, id)).limit(1);
      if (!existing[0]) throw new TRPCError({ code: "NOT_FOUND", message: "المنتج غير موجود" });
      await db.update(products).set({ ...values, isFeatured: input.isFeatured ? 1 : 0, isNew: input.isNew ? 1 : 0, isBestSeller: input.isBestSeller ? 1 : 0 }).where(eq(products.id, id));
      await createAuditLog({ userId: ctx.user.id, action: "update", entity: "product", entityId: id, metadata: { fields: Object.keys(values) } });
      return { success: true, id };
    }),
  }),
  checkout: router({
    createOrder: publicProcedure.input(z.object({
      customerName: z.string().min(2), customerPhone: z.string().min(5), customerEmail: z.string().email().optional(), address: z.string().optional(), paymentMethod: z.string().default("cod"), shippingMethod: z.string().default("local_delivery"), subtotal: z.string(), discount: z.string().default("0"), shipping: z.string().default("0"), total: z.string(), couponCode: z.string().optional(), notes: z.string().optional(), isWhatsapp: z.boolean().default(false), items: z.array(z.object({ productId: z.number(), productName: z.string(), imageUrl: z.string().optional(), quantity: z.number().int().positive(), unitPrice: z.string(), selectedOptions: z.string().optional() })).min(1),
    })).mutation(async ({ input, ctx }) => {
      const result = await createOrder({ ...input, userId: ctx.user?.id });
      return { orderId: result };
    }),
  }),
  customer: router({
    orders: protectedProcedure.query(({ ctx }) => getOrdersForUser(ctx.user.id)),
    orderDetails: protectedProcedure.input(z.object({ orderId: z.number().int().positive() })).query(({ ctx, input }) => getOrderDetailsForUser(ctx.user.id, input.orderId)),
    favorites: protectedProcedure.query(({ ctx }) => getFavoritesForUser(ctx.user.id)),
    syncFavorites: protectedProcedure.input(z.object({ productIds: z.array(z.number().int().positive()).max(500) })).mutation(({ ctx, input }) => syncFavoritesForUser(ctx.user.id, input.productIds)),
  }),
  admin: router({
    stats: adminOnlyProcedure.query(() => getAdminStats()),
    recentOrders: adminOnlyProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const { orders } = await import("../drizzle/schema");
      return db.select().from(orders).orderBy(desc(orders.createdAt)).limit(8);
    }),
    saveSettings: adminOnlyProcedure.input(z.object({ storeName: z.string(), tagline: z.string(), whatsappNumber: z.string().optional(), currency: z.string(), localShippingFee: z.string(), freeShippingThreshold: z.string(), enableWhatsapp: z.boolean(), enableOnlinePayment: z.boolean() })).mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "قاعدة البيانات غير متاحة" });
      const existing = await db.select().from(storeSettings).limit(1);
      if (existing[0]) await db.update(storeSettings).set({ ...input, enableWhatsapp: input.enableWhatsapp ? 1 : 0, enableOnlinePayment: input.enableOnlinePayment ? 1 : 0 }).where(eq(storeSettings.id, existing[0].id));
      else await db.insert(storeSettings).values({ ...input, enableWhatsapp: input.enableWhatsapp ? 1 : 0, enableOnlinePayment: input.enableOnlinePayment ? 1 : 0 });
      await createAuditLog({ userId: ctx.user.id, action: "update", entity: "settings" });
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
