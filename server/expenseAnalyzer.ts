import * as db from "./db";

/**
 * Analyze expense impact on goals and provide structured feedback
 */

interface ExpenseAnalysis {
  isReasonable: boolean;
  priceIndex: {
    expected: number;
    actual: number;
    difference: number;
    percentage: number;
  };
  goalImpact: {
    affectedGoals: Array<{
      goalName: string;
      delayPercentage: number;
      delayDays: number;
    }>;
  };
  recommendation: string;
  encouragement: string;
}

// Default price index for common categories (in yuan)
const PRICE_INDEX: Record<string, { min: number; max: number; avg: number }> = {
  "餐饮": { min: 15, max: 50, avg: 30 },
  "交通": { min: 5, max: 30, avg: 15 },
  "娱乐": { min: 30, max: 200, avg: 100 },
  "服饰": { min: 100, max: 500, avg: 250 },
  "电子产品": { min: 500, max: 5000, avg: 2000 },
  "日用品": { min: 10, max: 100, avg: 50 },
};

/**
 * Analyze a potential expense
 */
export async function analyzeExpense(
  userId: number,
  category: string,
  amount: number
): Promise<ExpenseAnalysis> {
  const amountYuan = amount / 100;

  // Get price index
  const priceRef = PRICE_INDEX[category] || { min: 0, max: 1000, avg: 100 };
  const priceDiff = amountYuan - priceRef.avg;
  const pricePercentage = ((amountYuan - priceRef.avg) / priceRef.avg) * 100;

  const isReasonable = amountYuan >= priceRef.min && amountYuan <= priceRef.max;

  // Calculate goal impact
  const goals = await db.getUserGoals(userId);
  const activeGoals = goals.filter(g => g.status === "active");
  
  const affectedGoals = [];
  for (const goal of activeGoals) {
    const remaining = parseInt(goal.targetAmount) - parseInt(goal.currentAmount);
    if (remaining > 0 && goal.deadline) {
      const now = new Date();
      const deadline = new Date(goal.deadline);
      const daysRemaining = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
      
      // Calculate delay
      const dailySavingsNeeded = remaining / daysRemaining;
      const delayDays = Math.ceil(amount / dailySavingsNeeded);
      const delayPercentage = (delayDays / daysRemaining) * 100;

      if (delayPercentage > 0.5) { // Only include if impact is > 0.5%
        affectedGoals.push({
          goalName: goal.name,
          delayPercentage: Math.round(delayPercentage * 10) / 10,
          delayDays: Math.max(1, delayDays),
        });
      }
    }
  }

  // Generate recommendation
  let recommendation = "";
  let encouragement = "";

  if (isReasonable && priceDiff <= priceRef.avg * 0.1) {
    recommendation = `本次${category}消费在合理范围内，价格指数正常`;
    encouragement = "✨ 理性消费，给自己加油！";
  } else if (isReasonable && priceDiff > 0) {
    recommendation = `本次${category}消费价格指数偏高${Math.abs(priceDiff).toFixed(0)}元（+${pricePercentage.toFixed(1)}%）`;
    if (affectedGoals.length > 0) {
      const mainGoal = affectedGoals[0];
      recommendation += `，会对"${mainGoal.goalName}"达成延迟${mainGoal.delayPercentage}%，预计晚${mainGoal.delayDays}天达成`;
    }
    encouragement = "💡 请参考决定，量力而行";
  } else if (!isReasonable && amountYuan > priceRef.max) {
    recommendation = `本次${category}消费价格明显偏高${Math.abs(priceDiff).toFixed(0)}元（+${pricePercentage.toFixed(1)}%），超出合理范围`;
    if (affectedGoals.length > 0) {
      const mainGoal = affectedGoals[0];
      recommendation += `，会对"${mainGoal.goalName}"达成延迟${mainGoal.delayPercentage}%，预计晚${mainGoal.delayDays}天达成`;
    }
    encouragement = "⚠️ 建议三思而后行";
  } else {
    recommendation = `本次${category}消费价格较低，性价比不错`;
    encouragement = "👍 明智的选择！";
  }

  return {
    isReasonable,
    priceIndex: {
      expected: priceRef.avg,
      actual: amountYuan,
      difference: priceDiff,
      percentage: pricePercentage,
    },
    goalImpact: {
      affectedGoals,
    },
    recommendation,
    encouragement,
  };
}

/**
 * Check if user should replace an asset based on lifecycle
 */
export async function checkAssetReplacement(
  userId: number,
  assetCategory: string
): Promise<{ shouldReplace: boolean; reason: string; existingAsset?: any }> {
  const userAssets = await db.getUserAssets(userId);
  const existingAsset = userAssets.find(a => a.category === assetCategory);

  if (!existingAsset) {
    return {
      shouldReplace: true,
      reason: "您还没有记录此类资产",
    };
  }

  const purchaseDate = new Date(existingAsset.purchaseDate);
  const now = new Date();
  const monthsOwned = (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);

  const shouldReplace = monthsOwned >= existingAsset.expectedLifespan;

  if (shouldReplace) {
    return {
      shouldReplace: true,
      reason: `您的${existingAsset.name}已使用${Math.floor(monthsOwned)}个月，达到建议更换周期（${existingAsset.expectedLifespan}个月）`,
      existingAsset,
    };
  } else {
    const remainingMonths = existingAsset.expectedLifespan - Math.floor(monthsOwned);
    return {
      shouldReplace: false,
      reason: `您的${existingAsset.name}已使用${Math.floor(monthsOwned)}个月，建议还可使用${remainingMonths}个月后再更换`,
      existingAsset,
    };
  }
}

/**
 * Get default lifespan for common asset categories (in months)
 */
export function getDefaultLifespan(category: string): number {
  const lifespans: Record<string, number> = {
    "手机": 36, // 3 years
    "电脑": 54, // 4.5 years
    "平板": 48, // 4 years
    "耳机": 24, // 2 years
    "手表": 60, // 5 years
    "相机": 60, // 5 years
    "电视": 84, // 7 years
    "冰箱": 120, // 10 years
    "洗衣机": 96, // 8 years
    "空调": 96, // 8 years
  };

  return lifespans[category] || 36; // Default 3 years
}
