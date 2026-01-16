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

describe("goals router", () => {
  it("should list user goals", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const goals = await caller.goals.list();
    expect(Array.isArray(goals)).toBe(true);
  });

  it("should create a new goal", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.goals.create({
      name: "Test Goal",
      targetAmount: "5000",
      type: "savings",
    });

    expect(result).toBeDefined();
  });

  it("should require name and targetAmount for goal creation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.goals.create({
        name: "",
        targetAmount: "5000",
        type: "savings",
      })
    ).rejects.toThrow();
  });
});
