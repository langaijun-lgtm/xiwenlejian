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

describe("profile router", () => {
  it("should get user profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const profile = await caller.profile.get();
    // Profile may be undefined for new users
    expect(profile === undefined || typeof profile === 'object').toBe(true);
  });

  it("should upsert user profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.profile.upsert({
      country: "中国",
      province: "广东省",
      city: "深圳市",
      identity: "employee",
      goals: "存款10万元",
      incomeStructure: "月薪8000元",
      expenseStructure: "房租2000元，餐饮1500元",
      isComplete: 1,
    });

    expect(result).toBeDefined();
  });
});

describe("chat router", () => {
  it("should get chat messages", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const messages = await caller.chat.getMessages({
      type: "general",
    });

    expect(Array.isArray(messages)).toBe(true);
  });

  it("should send and receive chat message", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.chat.sendMessage({
      content: "测试消息",
      type: "general",
    });

    expect(result).toBeDefined();
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe('string');
  });
});
