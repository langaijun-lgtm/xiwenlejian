import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Financial goals table - stores user's savings and spending goals
 */
export const goals = mysqlTable("goals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  targetAmount: decimal("targetAmount", { precision: 12, scale: 2 }).notNull(),
  currentAmount: decimal("currentAmount", { precision: 12, scale: 2 }).notNull().default("0"),
  type: mysqlEnum("type", ["savings", "spending_limit"]).notNull(),
  deadline: timestamp("deadline"),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  status: mysqlEnum("status", ["active", "completed", "archived"]).default("active").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Goal = typeof goals.$inferSelect;
export type InsertGoal = typeof goals.$inferInsert;

/**
 * Expense categories table - predefined and custom categories
 */
export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"),
  name: varchar("name", { length: 100 }).notNull(),
  icon: varchar("icon", { length: 50 }),
  color: varchar("color", { length: 50 }),
  isDefault: int("isDefault").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;

/**
 * Expense records table - daily spending tracking
 */
export const expenses = mysqlTable("expenses", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  description: text("description"),
  date: timestamp("date").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Expense = typeof expenses.$inferSelect;
export type InsertExpense = typeof expenses.$inferInsert;

/**
 * AI insights table - stores AI-generated financial advice
 */
export const insights = mysqlTable("insights", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["advice", "warning", "achievement"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  content: text("content").notNull(),
  isRead: int("isRead").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Insight = typeof insights.$inferSelect;
export type InsertInsight = typeof insights.$inferInsert;

/**
 * User profile table - stores detailed user financial background
 */
export const userProfiles = mysqlTable("userProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull().unique(),
  // Geographic info
  country: varchar("country", { length: 100 }),
  province: varchar("province", { length: 100 }),
  city: varchar("city", { length: 100 }),
  // Identity
  identity: mysqlEnum("identity", ["student", "employee", "entrepreneur", "other"]),
  // Goals and aspirations
  goals: text("goals"),
  // Income structure (JSON)
  incomeStructure: text("incomeStructure"),
  // Expense structure (JSON)
  expenseStructure: text("expenseStructure"),
  // Existing assets (JSON)
  existingAssets: text("existingAssets"),
  // Profile completion status
  isComplete: int("isComplete").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;

/**
 * Chat messages table - stores conversation history
 */
export const chatMessages = mysqlTable("chatMessages", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  role: mysqlEnum("role", ["user", "assistant", "system"]).notNull(),
  content: text("content").notNull(),
  type: mysqlEnum("type", ["profile_setup", "expense_consult", "general"]).default("general").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Expense rules table - defines automatic approval rules for fixed expenses
 */
export const expenseRules = mysqlTable("expense_rules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(), // Rule name, e.g., "Daily meals"
  category: varchar("category", { length: 50 }).notNull(), // Expense category
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly", "seasonal", "yearly"]).notNull(),
  maxAmount: int("max_amount").notNull(), // Maximum amount per occurrence
  description: text("description"), // Rule description
  isActive: int("is_active").default(1).notNull(), // 1 = active, 0 = inactive
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type ExpenseRule = typeof expenseRules.$inferSelect;
export type InsertExpenseRule = typeof expenseRules.$inferInsert;

/**
 * Payment reminders table - tracks bills and optimal payment timing
 */
export const paymentReminders = mysqlTable("payment_reminders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(), // Bill name, e.g., "Rent", "Utilities"
  category: varchar("category", { length: 50 }).notNull(),
  amount: int("amount").notNull(),
  dueDate: timestamp("due_date").notNull(), // Original due date
  optimalPaymentDate: timestamp("optimal_payment_date").notNull(), // Suggested payment date
  recurrence: mysqlEnum("recurrence", ["once", "monthly", "quarterly", "yearly"]).notNull(),
  notes: text("notes"), // e.g., "Pay on credit card billing date + 1"
  isPaid: int("is_paid").default(0).notNull(), // 0 = unpaid, 1 = paid
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type PaymentReminder = typeof paymentReminders.$inferSelect;
export type InsertPaymentReminder = typeof paymentReminders.$inferInsert;

/**
 * Assets table - tracks user's owned items and their replacement cycles
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  name: text("name").notNull(), // Asset name, e.g., "iPhone 13"
  category: varchar("category", { length: 50 }).notNull(), // e.g., "手机", "电脑", "家电"
  purchasePrice: int("purchase_price").notNull(), // Purchase price in cents
  purchaseDate: timestamp("purchase_date").notNull(),
  expectedLifespan: int("expected_lifespan").notNull(), // In months
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;
