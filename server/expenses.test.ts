import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return ctx;
}

describe("expenses router", () => {
  it("should list user expenses", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const expenses = await caller.expenses.list({});
    expect(Array.isArray(expenses)).toBe(true);
  });

  it("should create a new expense", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenses.create({
      categoryId: 1,
      amount: "50.00",
      date: new Date(),
      description: "Test expense",
    });

    expect(result).toBeDefined();
  });

  it("should filter expenses by date range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2024-12-31");

    const expenses = await caller.expenses.list({
      startDate,
      endDate,
    });

    expect(Array.isArray(expenses)).toBe(true);
  });
});

describe("categories router", () => {
  it("should list categories", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const categories = await caller.categories.list();
    expect(Array.isArray(categories)).toBe(true);
    expect(categories.length).toBeGreaterThan(0);
  });
});
