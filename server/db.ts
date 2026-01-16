import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, goals, categories, expenses, insights, InsertGoal, InsertCategory, InsertExpense, InsertInsight, userProfiles, InsertUserProfile, chatMessages, InsertChatMessage, expenseRules, InsertExpenseRule, paymentReminders, InsertPaymentReminder, assets, InsertAsset } from "../drizzle/schema";
import { ENV } from './_core/env';

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
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByWechatOpenid(wechatOpenid: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.wechatOpenid, wechatOpenid)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByAlipayUserId(alipayUserId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.alipayUserId, alipayUserId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Goals queries
export async function getUserGoals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
}

export async function createGoal(goal: InsertGoal) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(goals).values(goal);
  return result;
}

export async function updateGoal(id: number, userId: number, updates: Partial<InsertGoal>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(goals).set(updates).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

export async function deleteGoal(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));
}

// Categories queries
export async function getUserCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(categories).where(
    sql`${categories.userId} = ${userId} OR ${categories.isDefault} = 1`
  ).orderBy(desc(categories.isDefault), desc(categories.createdAt));
}

export async function createCategory(category: InsertCategory) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(categories).values(category);
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(categories).where(and(eq(categories.id, id), eq(categories.userId, userId)));
}

// Expenses queries
export async function getUserExpenses(userId: number, startDate?: Date, endDate?: Date) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [eq(expenses.userId, userId)];
  if (startDate) conditions.push(gte(expenses.date, startDate));
  if (endDate) conditions.push(lte(expenses.date, endDate));
  
  return db.select().from(expenses).where(and(...conditions)).orderBy(desc(expenses.date));
}

export async function createExpense(expense: InsertExpense) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(expenses).values(expense);
}

export async function updateExpense(id: number, userId: number, updates: Partial<InsertExpense>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(expenses).set(updates).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

export async function deleteExpense(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
}

// Insights queries
export async function getUserInsights(userId: number, limit: number = 10) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(insights).where(eq(insights.userId, userId)).orderBy(desc(insights.createdAt)).limit(limit);
}

export async function createInsight(insight: InsertInsight) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(insights).values(insight);
}

export async function markInsightAsRead(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(insights).set({ isRead: 1 }).where(and(eq(insights.id, id), eq(insights.userId, userId)));
}

// Statistics queries
export async function getExpenseStats(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return null;
  
  const result = await db.select({
    total: sql<string>`COALESCE(SUM(${expenses.amount}), 0)`,
    count: sql<number>`COUNT(*)`,
  }).from(expenses).where(
    and(
      eq(expenses.userId, userId),
      gte(expenses.date, startDate),
      lte(expenses.date, endDate)
    )
  );
  
  return result[0];
}

export async function getExpensesByCategory(userId: number, startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) return [];
  
  return db.select({
    categoryId: expenses.categoryId,
    categoryName: categories.name,
    total: sql<string>`SUM(${expenses.amount})`,
    count: sql<number>`COUNT(*)`,
  }).from(expenses)
    .leftJoin(categories, eq(expenses.categoryId, categories.id))
    .where(
      and(
        eq(expenses.userId, userId),
        gte(expenses.date, startDate),
        lte(expenses.date, endDate)
      )
    )
    .groupBy(expenses.categoryId, categories.name);
}

// User Profile queries
export async function getUserProfile(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  
  const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function upsertUserProfile(profile: InsertUserProfile) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const existing = await getUserProfile(profile.userId);
  
  if (existing) {
    return db.update(userProfiles)
      .set(profile)
      .where(eq(userProfiles.userId, profile.userId));
  } else {
    return db.insert(userProfiles).values(profile);
  }
}

// Chat Messages queries
export async function getChatMessages(userId: number, type?: string, limit: number = 50) {
  const db = await getDb();
  if (!db) return [];
  
  let conditions = [eq(chatMessages.userId, userId)];
  if (type) {
    conditions.push(eq(chatMessages.type, type as any));
  }
  
  return db.select().from(chatMessages)
    .where(and(...conditions))
    .orderBy(desc(chatMessages.createdAt))
    .limit(limit);
}

export async function createChatMessage(message: InsertChatMessage) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(chatMessages).values(message);
}

export async function clearChatMessages(userId: number, type?: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  if (type) {
    return db.delete(chatMessages).where(
      and(
        eq(chatMessages.userId, userId),
        eq(chatMessages.type, type as any)
      )
    );
  } else {
    return db.delete(chatMessages).where(eq(chatMessages.userId, userId));
  }
}

// Expense Rules
export async function getExpenseRules(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(expenseRules).where(eq(expenseRules.userId, userId));
}

export async function createExpenseRule(rule: InsertExpenseRule) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(expenseRules).values(rule);
  return result;
}

export async function updateExpenseRule(id: number, userId: number, data: Partial<InsertExpenseRule>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(expenseRules).set(data).where(and(eq(expenseRules.id, id), eq(expenseRules.userId, userId)));
}

export async function deleteExpenseRule(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(expenseRules).where(and(eq(expenseRules.id, id), eq(expenseRules.userId, userId)));
}

// Payment Reminders
export async function getPaymentReminders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(paymentReminders).where(eq(paymentReminders.userId, userId));
}

export async function getUpcomingPaymentReminders(userId: number, daysAhead: number = 7) {
  const db = await getDb();
  if (!db) return [];
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + daysAhead);
  return db.select().from(paymentReminders).where(
    and(
      eq(paymentReminders.userId, userId),
      eq(paymentReminders.isPaid, 0),
      gte(paymentReminders.optimalPaymentDate, now),
      lte(paymentReminders.optimalPaymentDate, future)
    )
  );
}

export async function createPaymentReminder(reminder: InsertPaymentReminder) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(paymentReminders).values(reminder);
  return result;
}

export async function updatePaymentReminder(id: number, userId: number, data: Partial<InsertPaymentReminder>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentReminders).set(data).where(and(eq(paymentReminders.id, id), eq(paymentReminders.userId, userId)));
}

export async function markPaymentAsPaid(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(paymentReminders).set({ isPaid: 1 }).where(and(eq(paymentReminders.id, id), eq(paymentReminders.userId, userId)));
}

export async function deletePaymentReminder(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(paymentReminders).where(and(eq(paymentReminders.id, id), eq(paymentReminders.userId, userId)));
}

// Assets Management
export async function getUserAssets(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(assets).where(eq(assets.userId, userId)).orderBy(desc(assets.purchaseDate));
}

export async function createAsset(asset: InsertAsset) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(assets).values(asset);
  return result;
}

export async function updateAsset(id: number, userId: number, data: Partial<InsertAsset>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(assets).set(data).where(and(eq(assets.id, id), eq(assets.userId, userId)));
}

export async function deleteAsset(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(assets).where(and(eq(assets.id, id), eq(assets.userId, userId)));
}
