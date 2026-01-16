import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
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
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Smart Expense Management", () => {
  it("should initialize default expense rules", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenseRules.initializeDefaults();
    expect(result).toEqual({ success: true });

    const rules = await caller.expenseRules.list();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.some(r => r.name === "一日三餐")).toBe(true);
  });

  it("should create a custom expense rule", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.expenseRules.create({
      name: "周末电影",
      category: "娱乐",
      frequency: "weekly",
      maxAmount: 100,
      description: "每周看一次电影",
    });

    expect(result).toBeDefined();
  });

  it("should create a payment reminder", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);

    const optimalDate = new Date();
    optimalDate.setDate(optimalDate.getDate() + 8);

    const result = await caller.paymentReminders.create({
      name: "房租",
      category: "住房",
      amount: 200000, // 2000 yuan in cents
      dueDate,
      optimalPaymentDate: optimalDate,
      recurrence: "monthly",
      notes: "信用卡账单日后一天支付",
    });

    expect(result).toBeDefined();
  });

  it("should list payment reminders", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const reminders = await caller.paymentReminders.list();
    expect(Array.isArray(reminders)).toBe(true);
  });

  it("should create an asset", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 2); // 2 years ago

    const result = await caller.assets.create({
      name: "iPhone 13",
      category: "手机",
      purchasePrice: 599900, // 5999 yuan in cents
      purchaseDate,
      notes: "主力手机",
    });

    expect(result).toBeDefined();
  });

  it("should check asset replacement recommendation", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // First create an asset
    const purchaseDate = new Date();
    purchaseDate.setFullYear(purchaseDate.getFullYear() - 4); // 4 years ago

    await caller.assets.create({
      name: "MacBook Pro",
      category: "电脑",
      purchasePrice: 1299900,
      purchaseDate,
    });

    // Check replacement
    const result = await caller.assets.checkReplacement({
      category: "电脑",
    });

    expect(result).toBeDefined();
    expect(result.shouldReplace).toBeDefined();
    expect(result.reason).toBeDefined();
  });
});
