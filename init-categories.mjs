import { drizzle } from "drizzle-orm/mysql2";
import { categories } from "./drizzle/schema.ts";

const db = drizzle(process.env.DATABASE_URL);

const defaultCategories = [
  { name: "餐饮", icon: "🍜", isDefault: 1 },
  { name: "交通", icon: "🚗", isDefault: 1 },
  { name: "购物", icon: "🛍️", isDefault: 1 },
  { name: "娱乐", icon: "🎮", isDefault: 1 },
  { name: "住房", icon: "🏠", isDefault: 1 },
  { name: "医疗", icon: "💊", isDefault: 1 },
  { name: "教育", icon: "📚", isDefault: 1 },
  { name: "其他", icon: "📝", isDefault: 1 },
];

async function initCategories() {
  try {
    for (const cat of defaultCategories) {
      await db.insert(categories).values(cat).onDuplicateKeyUpdate({ set: cat });
    }
    console.log("✓ Default categories initialized");
  } catch (error) {
    console.error("Failed to initialize categories:", error);
  }
  process.exit(0);
}

initCategories();
