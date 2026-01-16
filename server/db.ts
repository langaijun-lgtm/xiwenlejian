import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, goals, categories, expenses, insights, InsertGoal, InsertCategory, InsertExpense, InsertInsight } from "../drizzle/schema";
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
