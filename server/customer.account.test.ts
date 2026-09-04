import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("customer account procedures", () => {
  const caller = () => appRouter.createCaller({
    user: {
      id: 1,
      openId: "customer-test",
      name: "Customer",
      email: "customer@example.com",
      loginMethod: "test",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  it("rejects invalid order detail identifiers", async () => {
    await expect(caller().customer.orderDetails({ orderId: 0 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects oversized favorites payloads", async () => {
    await expect(caller().customer.syncFavorites({ productIds: Array.from({ length: 501 }, (_, index) => index + 1) })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
