import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Lightbulb, AlertTriangle, Trophy, Loader2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { startOfMonth, endOfMonth } from "date-fns";

export default function Insights() {
  const [question, setQuestion] = useState("");
  const [aiResponse, setAiResponse] = useState("");
  const [dateRange] = useState(() => ({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  }));

  const utils = trpc.useUtils();
  const { data: insights, isLoading: insightsLoading } = trpc.insights.list.useQuery();
  const { data: goals } = trpc.goals.list.useQuery();
  const { data: expenses } = trpc.expenses.list.useQuery(dateRange);
  const { data: stats } = trpc.stats.overview.useQuery(dateRange);
  const { data: categories } = trpc.categories.list.useQuery();

  const generateMutation = trpc.insights.generate.useMutation({
    onSuccess: (data) => {
      const content = typeof data.content === 'string' ? data.content : JSON.stringify(data.content);
      setAiResponse(content);
      setQuestion("");
    },
    onError: () => {
      toast.error("生成建议失败，请重试");
    },
  });

  const markAsReadMutation = trpc.insights.markAsRead.useMutation({
    onSuccess: () => {
      utils.insights.list.invalidate();
    },
  });

  const handleAskAI = () => {
    if (!question.trim()) {
      toast.error("请输入你的问题");
      return;
    }

    const context = buildContext();
    const fullPrompt = `用户问题：${question}\n\n${context}`;
    
    generateMutation.mutate({ context: fullPrompt });
  };

  const handleQuickAnalysis = () => {
    const context = buildContext();
    const prompt = `请分析我的财务状况，给出具体的建议和改进方向。\n\n${context}`;
    
    generateMutation.mutate({ context: prompt });
  };

  const buildContext = () => {
    const activeGoals = goals?.filter((g) => g.status === "active") || [];
    const totalExpense = stats?.total ? parseFloat(stats.total) : 0;
    const expenseCount = expenses?.length || 0;
    
    let context = `当前财务数据：\n`;
    context += `- 本月总支出：¥${totalExpense.toFixed(2)}，共${expenseCount}笔\n`;
    
    if (activeGoals.length > 0) {
      context += `\n活跃目标：\n`;
      activeGoals.forEach((goal) => {
        const progress = parseFloat(goal.currentAmount) / parseFloat(goal.targetAmount) * 100;
        context += `- ${goal.name}：目标¥${goal.targetAmount}，当前¥${goal.currentAmount}（${progress.toFixed(1)}%）\n`;
      });
    }
    
    if (stats?.byCategory && stats.byCategory.length > 0) {
      context += `\n消费分类：\n`;
      stats.byCategory.forEach((cat) => {
        const categoryName = categories?.find((c) => c.id === cat.categoryId)?.name || cat.categoryName;
        context += `- ${categoryName}：¥${parseFloat(cat.total).toFixed(2)}\n`;
      });
    }
    
    return context;
  };

  const unreadInsights = useMemo(() => {
    return insights?.filter((i) => i.isRead === 0) || [];
  }, [insights]);

  const readInsights = useMemo(() => {
    return insights?.filter((i) => i.isRead === 1) || [];
  }, [insights]);

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "advice":
        return <Lightbulb className="h-5 w-5 text-primary" />;
      case "warning":
        return <AlertTriangle className="h-5 w-5 text-destructive" />;
      case "achievement":
        return <Trophy className="h-5 w-5 text-secondary" />;
      default:
        return <Sparkles className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div>
        <h1 className="text-3xl font-bold organic-heading text-foreground">AI 助手</h1>
        <p className="text-muted-foreground mt-1">获取个性化的财务建议</p>
      </div>

      {/* AI Chat Interface */}
      <Card className="soft-shadow border-border/50 bg-gradient-to-br from-primary/5 to-background">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Sparkles className="h-5 w-5 text-primary" />
            向 AI 提问
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            placeholder="例如：我应该如何控制餐饮支出？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex gap-3">
            <Button
              onClick={handleAskAI}
              disabled={generateMutation.isPending}
              className="rounded-full"
            >
              {generateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  思考中...
                </>
              ) : (
                "提问"
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleQuickAnalysis}
              disabled={generateMutation.isPending}
              className="rounded-full"
            >
              快速分析
            </Button>
          </div>

          {aiResponse && (
            <Card className="bg-accent/50 border-accent">
              <CardContent className="pt-6">
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{aiResponse}</Streamdown>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Unread Insights */}
      {unreadInsights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">新建议</h2>
          <div className="space-y-3">
            {unreadInsights.map((insight) => (
              <Card
                key={insight.id}
                className="soft-shadow border-border/50 cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => markAsReadMutation.mutate({ id: insight.id })}
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getInsightIcon(insight.type)}
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.content}</p>
                  <p className="text-xs label-text text-muted-foreground mt-3">
                    {new Date(insight.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Read Insights */}
      {readInsights.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-foreground">历史建议</h2>
          <div className="space-y-3">
            {readInsights.map((insight) => (
              <Card key={insight.id} className="soft-shadow border-border/50 opacity-75">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    {getInsightIcon(insight.type)}
                    {insight.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{insight.content}</p>
                  <p className="text-xs label-text text-muted-foreground mt-3">
                    {new Date(insight.createdAt).toLocaleDateString("zh-CN")}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {insightsLoading && (
        <Card className="soft-shadow">
          <CardContent className="py-8 text-center text-muted-foreground">
            加载中...
          </CardContent>
        </Card>
      )}

      {!insightsLoading && insights && insights.length === 0 && !aiResponse && (
        <Card className="soft-shadow">
          <CardContent className="py-8 text-center space-y-3">
            <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/50" />
            <p className="text-muted-foreground">还没有 AI 建议，试试向 AI 提问吧</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
