import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, TrendingUp, Wallet, Sparkles, Plus } from "lucide-react";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import { startOfMonth, endOfMonth } from "date-fns";

export default function Home() {
  const [dateRange] = useState(() => ({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  }));

  const { data: goals, isLoading: goalsLoading } = trpc.goals.list.useQuery();
  const { data: stats, isLoading: statsLoading } = trpc.stats.overview.useQuery(dateRange);
  const { data: insights, isLoading: insightsLoading } = trpc.insights.list.useQuery();

  const activeGoals = useMemo(() => {
    return goals?.filter((g) => g.status === "active") || [];
  }, [goals]);

  const latestInsight = useMemo(() => {
    return insights?.[0];
  }, [insights]);

  const monthlyTotal = stats?.total ? parseFloat(stats.total) : 0;

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      {/* Welcome Section */}
      <div className="space-y-2">
        <h1 className="text-3xl md:text-4xl font-bold organic-heading text-foreground">
          早上好，小树苗 🌱
        </h1>
        <p className="text-muted-foreground">让我们一起追踪你的财务目标</p>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="soft-shadow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium label-text text-muted-foreground">
              本月支出
            </CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              ¥{statsLoading ? "..." : monthlyTotal.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              共 {stats?.count || 0} 笔消费
            </p>
          </CardContent>
        </Card>

        <Card className="soft-shadow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium label-text text-muted-foreground">
              活跃目标
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground">
              {goalsLoading ? "..." : activeGoals.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">正在追踪中</p>
          </CardContent>
        </Card>

        <Card className="soft-shadow border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium label-text text-muted-foreground">
              本月结余
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-secondary">
              ¥{statsLoading ? "..." : (3000 - monthlyTotal).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">月预算 ¥3000</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insight Card */}
      {latestInsight && (
        <Card className="soft-shadow border-border/50 bg-gradient-to-br from-accent/50 to-background">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-primary" />
              AI 小助手
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-foreground font-medium">{latestInsight.title}</p>
            <p className="text-sm text-muted-foreground">{latestInsight.content}</p>
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <Link href="/insights">
                查看更多建议
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Goals Progress */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold organic-heading text-foreground">目标进度</h2>
          <Button asChild size="sm" className="rounded-full">
            <Link href="/goals" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              新建目标
            </Link>
          </Button>
        </div>

        {goalsLoading ? (
          <Card className="soft-shadow">
            <CardContent className="py-8 text-center text-muted-foreground">
              加载中...
            </CardContent>
          </Card>
        ) : activeGoals.length === 0 ? (
          <Card className="soft-shadow">
            <CardContent className="py-8 text-center space-y-3">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">还没有设定目标</p>
              <Button asChild variant="outline" className="rounded-full">
                <Link href="/goals">
                  创建第一个目标
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {activeGoals.slice(0, 3).map((goal) => {
              const current = parseFloat(goal.currentAmount);
              const target = parseFloat(goal.targetAmount);
              const progress = target > 0 ? (current / target) * 100 : 0;

              return (
                <Card key={goal.id} className="soft-shadow border-border/50">
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2">
                            {goal.icon && <span className="text-lg">{goal.icon}</span>}
                            <h3 className="font-semibold text-foreground">{goal.name}</h3>
                          </div>
                          <p className="text-sm label-text text-muted-foreground">
                            {goal.type === "savings" ? "财务目标" : "消费目标"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground">
                            {current.toFixed(0)} / {target.toFixed(0)} 元
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground text-right">
                          进度 {progress.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
