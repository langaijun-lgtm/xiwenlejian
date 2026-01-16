import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts";
import { useState, useMemo } from "react";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format, subDays } from "date-fns";
import { TrendingUp, PieChart as PieChartIcon, Calendar } from "lucide-react";

export default function Stats() {
  const [period, setPeriod] = useState<"week" | "month">("month");

  const dateRange = useMemo(() => {
    const now = new Date();
    if (period === "week") {
      return {
        startDate: startOfWeek(now, { weekStartsOn: 1 }),
        endDate: endOfWeek(now, { weekStartsOn: 1 }),
      };
    }
    return {
      startDate: startOfMonth(now),
      endDate: endOfMonth(now),
    };
  }, [period]);

  const { data: stats, isLoading: statsLoading } = trpc.stats.overview.useQuery(dateRange);
  const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery(dateRange);
  const { data: categories } = trpc.categories.list.useQuery();

  const totalExpense = stats?.total ? parseFloat(stats.total) : 0;

  // Prepare category pie chart data
  const categoryData = useMemo(() => {
    if (!stats?.byCategory || !categories) return [];
    
    return stats.byCategory.map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return {
        name: item.categoryName || category?.name || "未分类",
        value: parseFloat(item.total),
        icon: category?.icon || "📝",
      };
    }).sort((a, b) => b.value - a.value);
  }, [stats, categories]);

  // Prepare daily trend data
  const dailyTrendData = useMemo(() => {
    if (!expenses) return [];
    
    const dailyMap = new Map<string, number>();
    expenses.forEach((exp) => {
      const dateKey = format(new Date(exp.date), "MM/dd");
      const current = dailyMap.get(dateKey) || 0;
      dailyMap.set(dateKey, current + parseFloat(exp.amount));
    });

    const days = period === "week" ? 7 : 30;
    const result = [];
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateKey = format(date, "MM/dd");
      result.push({
        date: dateKey,
        amount: dailyMap.get(dateKey) || 0,
      });
    }
    
    return result;
  }, [expenses, period]);

  const COLORS = [
    "oklch(0.65 0.12 25)",
    "oklch(0.62 0.06 130)",
    "oklch(0.75 0.08 45)",
    "oklch(0.6 0.12 35)",
    "oklch(0.55 0.1 140)",
  ];

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-bold organic-heading text-foreground">数据统计</h1>
        <p className="text-muted-foreground mt-1">可视化你的消费趋势</p>
      </div>

      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "week" | "month")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="week">本周</TabsTrigger>
          <TabsTrigger value="month">本月</TabsTrigger>
        </TabsList>

        <TabsContent value={period} className="space-y-6 mt-6">
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="soft-shadow border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium label-text text-muted-foreground">
                  总支出
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ¥{statsLoading ? "..." : totalExpense.toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {period === "week" ? "本周" : "本月"}累计
                </p>
              </CardContent>
            </Card>

            <Card className="soft-shadow border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium label-text text-muted-foreground">
                  消费笔数
                </CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  {statsLoading ? "..." : stats?.count || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  平均 ¥{stats?.count ? (totalExpense / stats.count).toFixed(2) : "0.00"}/笔
                </p>
              </CardContent>
            </Card>

            <Card className="soft-shadow border-border/50">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium label-text text-muted-foreground">
                  日均支出
                </CardTitle>
                <PieChartIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-foreground">
                  ¥{statsLoading ? "..." : (totalExpense / (period === "week" ? 7 : 30)).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {period === "week" ? "7天" : "30天"}平均
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Daily Trend Chart */}
          <Card className="soft-shadow border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">消费趋势</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  加载中...
                </div>
              ) : dailyTrendData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={dailyTrendData}>
                    <XAxis
                      dataKey="date"
                      stroke="oklch(0.5 0.02 25)"
                      fontSize={12}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.5 0.02 25)"
                      fontSize={12}
                      tickLine={false}
                      tickFormatter={(value) => `¥${value}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "oklch(0.98 0.02 35)",
                        border: "1px solid oklch(0.85 0.015 35)",
                        borderRadius: "12px",
                      }}
                      formatter={(value: number) => [`¥${value.toFixed(2)}`, "消费"]}
                    />
                    <Bar dataKey="amount" fill="oklch(0.65 0.12 25)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Category Distribution */}
          <Card className="soft-shadow border-border/50">
            <CardHeader>
              <CardTitle className="text-foreground">分类占比</CardTitle>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  加载中...
                </div>
              ) : categoryData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-muted-foreground">
                  暂无数据
                </div>
              ) : (
                <div className="grid md:grid-cols-2 gap-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "oklch(0.98 0.02 35)",
                          border: "1px solid oklch(0.85 0.015 35)",
                          borderRadius: "12px",
                        }}
                        formatter={(value: number) => `¥${value.toFixed(2)}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="space-y-3">
                    {categoryData.map((item, index) => (
                      <div key={item.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: COLORS[index % COLORS.length] }}
                          />
                          <span className="text-sm font-medium text-foreground">
                            {item.icon} {item.name}
                          </span>
                        </div>
                        <span className="text-sm font-semibold text-foreground">
                          ¥{item.value.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
