import * as db from "./db";

/**
 * Rule engine to evaluate if an expense should be auto-approved
 */

interface ExpenseEvaluationResult {
  approved: boolean;
  reason: string;
  matchedRule?: {
    id: number;
    name: string;
    maxAmount: number;
  };
}

/**
 * Check if an expense matches any active rules for auto-approval
 */
export async function evaluateExpense(
  userId: number,
  category: string,
  amount: number,
  date: Date = new Date()
): Promise<ExpenseEvaluationResult> {
  const rules = await db.getExpenseRules(userId);
  const activeRules = rules.filter(r => r.isActive === 1 && r.category === category);

  if (activeRules.length === 0) {
    return {
      approved: false,
      reason: "没有匹配的消费规则",
    };
  }

  // Check each rule
  for (const rule of activeRules) {
    // Check amount
    if (amount > rule.maxAmount) {
      continue; // Amount exceeds limit, try next rule
    }

    // Check frequency constraints
    const frequencyCheck = await checkFrequencyConstraint(userId, category, rule.frequency, date);
    if (!frequencyCheck.allowed) {
      return {
        approved: false,
        reason: `${frequencyCheck.reason}（规则：${rule.name}）`,
      };
    }

    // Rule matched and all checks passed
    return {
      approved: true,
      reason: `符合"${rule.name}"规则，金额在合理范围内（≤¥${rule.maxAmount}）`,
      matchedRule: {
        id: rule.id,
        name: rule.name,
        maxAmount: rule.maxAmount,
      },
    };
  }

  return {
    approved: false,
    reason: "金额超出所有匹配规则的限额",
  };
}

/**
 * Check if frequency constraint is satisfied
 */
async function checkFrequencyConstraint(
  userId: number,
  category: string,
  frequency: string,
  currentDate: Date
): Promise<{ allowed: boolean; reason: string }> {
  const expenses = await db.getUserExpenses(userId);
  
  // Get category ID from category name
  const categories = await db.getUserCategories(userId);
  const categoryObj = categories.find((c: any) => c.name === category);
  if (!categoryObj) {
    return { allowed: true, reason: "" };
  }
  
  const categoryExpenses = expenses.filter(e => e.categoryId === categoryObj.id);

  const now = currentDate.getTime();
  const oneDay = 24 * 60 * 60 * 1000;

  switch (frequency) {
    case "daily": {
      // Check if already spent today
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);
      const todayExpenses = categoryExpenses.filter(e => {
        const expenseDate = new Date(e.date);
        expenseDate.setHours(0, 0, 0, 0);
        return expenseDate.getTime() === today.getTime();
      });
      
      // For meals, allow up to 3 times per day
      if (category === "餐饮" && todayExpenses.length >= 3) {
        return { allowed: false, reason: "今日该类别消费已达上限（3次）" };
      }
      
      return { allowed: true, reason: "" };
    }

    case "weekly": {
      const weekAgo = now - 7 * oneDay;
      const recentExpenses = categoryExpenses.filter(e => new Date(e.date).getTime() > weekAgo);
      if (recentExpenses.length >= 1) {
        return { allowed: false, reason: "本周该类别已有消费记录" };
      }
      return { allowed: true, reason: "" };
    }

    case "monthly": {
      const monthAgo = now - 30 * oneDay;
      const recentExpenses = categoryExpenses.filter(e => new Date(e.date).getTime() > monthAgo);
      if (recentExpenses.length >= 1) {
        return { allowed: false, reason: "本月该类别已有消费记录" };
      }
      return { allowed: true, reason: "" };
    }

    case "seasonal": {
      // 3 months
      const seasonAgo = now - 90 * oneDay;
      const recentExpenses = categoryExpenses.filter(e => new Date(e.date).getTime() > seasonAgo);
      if (recentExpenses.length >= 1) {
        return { allowed: false, reason: "本季度该类别已有消费记录" };
      }
      return { allowed: true, reason: "" };
    }

    case "yearly": {
      const yearAgo = now - 365 * oneDay;
      const recentExpenses = categoryExpenses.filter(e => new Date(e.date).getTime() > yearAgo);
      if (recentExpenses.length >= 1) {
        return { allowed: false, reason: "本年度该类别已有消费记录" };
      }
      return { allowed: true, reason: "" };
    }

    default:
      return { allowed: true, reason: "" };
  }
}

/**
 * Initialize default expense rules for a new user
 */
export async function initializeDefaultRules(userId: number) {
  const defaultRules = [
    {
      userId,
      name: "一日三餐",
      category: "餐饮",
      frequency: "daily" as const,
      maxAmount: 50,
      description: "每餐不超过50元",
      isActive: 1,
    },
    {
      userId,
      name: "日常饮用水",
      category: "餐饮",
      frequency: "daily" as const,
      maxAmount: 10,
      description: "每两天一瓶包装水",
      isActive: 1,
    },
    {
      userId,
      name: "夏季衣物",
      category: "服饰",
      frequency: "seasonal" as const,
      maxAmount: 500,
      description: "夏天一套衣服",
      isActive: 1,
    },
    {
      userId,
      name: "冬季衣物",
      category: "服饰",
      frequency: "seasonal" as const,
      maxAmount: 800,
      description: "冬天半套衣服",
      isActive: 1,
    },
    {
      userId,
      name: "春秋衣物",
      category: "服饰",
      frequency: "seasonal" as const,
      maxAmount: 500,
      description: "春秋一套衣服",
      isActive: 1,
    },
    {
      userId,
      name: "鞋类",
      category: "服饰",
      frequency: "yearly" as const,
      maxAmount: 300,
      description: "一年一到两双鞋",
      isActive: 1,
    },
  ];

  for (const rule of defaultRules) {
    await db.createExpenseRule(rule);
  }
}
