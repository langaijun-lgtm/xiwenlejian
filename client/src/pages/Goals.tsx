import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Target, Trash2, Edit, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Goals() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    targetAmount: "",
    type: "savings" as "savings" | "spending_limit",
    deadline: "",
    icon: "🎯",
  });

  const utils = trpc.useUtils();
  const { data: goals, isLoading } = trpc.goals.list.useQuery();

  const createMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      setIsCreateOpen(false);
      setFormData({
        name: "",
        description: "",
        targetAmount: "",
        type: "savings",
        deadline: "",
        icon: "🎯",
      });
      toast.success("目标创建成功");
    },
    onError: () => {
      toast.error("创建失败，请重试");
    },
  });

  const updateMutation = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("目标已更新");
    },
    onError: () => {
      toast.error("更新失败");
    },
  });

  const deleteMutation = trpc.goals.delete.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
      toast.success("目标已删除");
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const handleCreate = () => {
    if (!formData.name || !formData.targetAmount) {
      toast.error("请填写必填项");
      return;
    }

    createMutation.mutate({
      name: formData.name,
      description: formData.description,
      targetAmount: formData.targetAmount,
      type: formData.type,
      deadline: formData.deadline ? new Date(formData.deadline) : undefined,
      icon: formData.icon,
    });
  };

  const handleComplete = (goalId: number) => {
    updateMutation.mutate({
      id: goalId,
      status: "completed",
    });
  };

  const handleDelete = (goalId: number) => {
    if (confirm("确定要删除这个目标吗？")) {
      deleteMutation.mutate({ id: goalId });
    }
  };

  const activeGoals = goals?.filter((g) => g.status === "active") || [];
  const completedGoals = goals?.filter((g) => g.status === "completed") || [];

  const iconOptions = ["🎯", "💰", "📚", "🏠", "✈️", "🎓", "💪", "🌟"];

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold organic-heading text-foreground">我的目标</h1>
          <p className="text-muted-foreground mt-1">设定并追踪你的财务目标</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              新建目标
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>创建新目标</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">目标名称 *</Label>
                <Input
                  id="name"
                  placeholder="例如：存够旅行基金"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon">图标</Label>
                <div className="flex gap-2 flex-wrap">
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon })}
                      className={`text-2xl p-2 rounded-lg border transition-colors ${
                        formData.icon === icon
                          ? "border-primary bg-primary/10"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">目标类型</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: "savings" | "spending_limit") =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="savings">储蓄目标</SelectItem>
                    <SelectItem value="spending_limit">消费控制</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAmount">目标金额 *</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  placeholder="5000"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deadline">截止日期（可选）</Label>
                <Input
                  id="deadline"
                  type="date"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">描述（可选）</Label>
                <Textarea
                  id="description"
                  placeholder="添加一些备注..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="flex-1 rounded-full"
              >
                取消
              </Button>
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="flex-1 rounded-full"
              >
                创建
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <Card className="soft-shadow">
          <CardContent className="py-8 text-center text-muted-foreground">加载中...</CardContent>
        </Card>
      ) : (
        <>
          {/* Active Goals */}
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-foreground">进行中</h2>
            {activeGoals.length === 0 ? (
              <Card className="soft-shadow">
                <CardContent className="py-8 text-center space-y-3">
                  <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
                  <p className="text-muted-foreground">还没有活跃的目标</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {activeGoals.map((goal) => {
                  const current = parseFloat(goal.currentAmount);
                  const target = parseFloat(goal.targetAmount);
                  const progress = target > 0 ? (current / target) * 100 : 0;

                  return (
                    <Card key={goal.id} className="soft-shadow border-border/50">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{goal.icon}</span>
                            <span className="text-lg">{goal.name}</span>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleComplete(goal.id)}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive"
                              onClick={() => handleDelete(goal.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {goal.description && (
                          <p className="text-sm text-muted-foreground">{goal.description}</p>
                        )}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {goal.type === "savings" ? "已存" : "已用"}
                            </span>
                            <span className="font-medium">
                              ¥{current.toFixed(0)} / ¥{target.toFixed(0)}
                            </span>
                          </div>
                          <Progress value={progress} className="h-2" />
                          <p className="text-xs text-muted-foreground text-right">
                            {progress.toFixed(1)}%
                          </p>
                        </div>
                        {goal.deadline && (
                          <p className="text-xs label-text text-muted-foreground">
                            截止日期：{new Date(goal.deadline).toLocaleDateString("zh-CN")}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          {/* Completed Goals */}
          {completedGoals.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">已完成</h2>
              <div className="grid gap-4 md:grid-cols-2">
                {completedGoals.map((goal) => (
                  <Card key={goal.id} className="soft-shadow border-border/50 opacity-75">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{goal.icon}</span>
                          <span className="text-lg">{goal.name}</span>
                        </div>
                        <CheckCircle2 className="h-5 w-5 text-secondary" />
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        目标金额：¥{parseFloat(goal.targetAmount).toFixed(0)}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
