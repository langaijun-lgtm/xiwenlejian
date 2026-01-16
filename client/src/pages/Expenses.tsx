import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Receipt, Trash2, Calendar } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { startOfMonth, endOfMonth, format } from "date-fns";

export default function Expenses() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [dateRange] = useState(() => ({
    startDate: startOfMonth(new Date()),
    endDate: endOfMonth(new Date()),
  }));
  const [formData, setFormData] = useState({
    categoryId: "",
    amount: "",
    description: "",
    date: format(new Date(), "yyyy-MM-dd"),
  });

  const utils = trpc.useUtils();
  const { data: expenses, isLoading: expensesLoading } = trpc.expenses.list.useQuery(dateRange);
  const { data: categories, isLoading: categoriesLoading } = trpc.categories.list.useQuery();

  const createMutation = trpc.expenses.create.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.stats.overview.invalidate();
      setIsCreateOpen(false);
      setFormData({
        categoryId: "",
        amount: "",
        description: "",
        date: format(new Date(), "yyyy-MM-dd"),
      });
      toast.success("消费记录已添加");
    },
    onError: () => {
      toast.error("添加失败，请重试");
    },
  });

  const deleteMutation = trpc.expenses.delete.useMutation({
    onSuccess: () => {
      utils.expenses.list.invalidate();
      utils.stats.overview.invalidate();
      toast.success("记录已删除");
    },
    onError: () => {
      toast.error("删除失败");
    },
  });

  const handleCreate = () => {
    if (!formData.categoryId || !formData.amount || !formData.date) {
      toast.error("请填写必填项");
      return;
    }

    createMutation.mutate({
      categoryId: parseInt(formData.categoryId),
      amount: formData.amount,
      description: formData.description,
      date: new Date(formData.date),
    });
  };

  const handleDelete = (expenseId: number) => {
    if (confirm("确定要删除这条记录吗？")) {
      deleteMutation.mutate({ id: expenseId });
    }
  };

  const totalExpense = useMemo(() => {
    return expenses?.reduce((sum, exp) => sum + parseFloat(exp.amount), 0) || 0;
  }, [expenses]);

  const getCategoryName = (categoryId: number) => {
    return categories?.find((c) => c.id === categoryId)?.name || "未分类";
  };

  const getCategoryIcon = (categoryId: number) => {
    return categories?.find((c) => c.id === categoryId)?.icon || "📝";
  };

  return (
    <div className="space-y-8 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold organic-heading text-foreground">消费记录</h1>
          <p className="text-muted-foreground mt-1">追踪你的每一笔支出</p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-full">
              <Plus className="h-4 w-4 mr-2" />
              记一笔
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>添加消费记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="amount">金额 *</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">分类 *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value) => setFormData({ ...formData, categoryId: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="选择分类" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoriesLoading ? (
                      <SelectItem value="loading" disabled>
                        加载中...
                      </SelectItem>
                    ) : (
                      categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id.toString()}>
                          {cat.icon} {cat.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">日期 *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">备注（可选）</Label>
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
                添加
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Card */}
      <Card className="soft-shadow border-border/50 bg-gradient-to-br from-primary/10 to-background">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm label-text text-muted-foreground">本月总支出</p>
              <p className="text-3xl font-bold organic-heading text-foreground mt-1">
                ¥{totalExpense.toFixed(2)}
              </p>
            </div>
            <Receipt className="h-12 w-12 text-primary/50" />
          </div>
          <p className="text-sm text-muted-foreground mt-3">
            共 {expenses?.length || 0} 笔消费
          </p>
        </CardContent>
      </Card>

      {/* Expenses List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-foreground">最近记录</h2>
        {expensesLoading ? (
          <Card className="soft-shadow">
            <CardContent className="py-8 text-center text-muted-foreground">
              加载中...
            </CardContent>
          </Card>
        ) : expenses && expenses.length === 0 ? (
          <Card className="soft-shadow">
            <CardContent className="py-8 text-center space-y-3">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-muted-foreground">还没有消费记录</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {expenses?.map((expense) => (
              <Card key={expense.id} className="soft-shadow border-border/50">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1">
                      <div className="text-2xl">{getCategoryIcon(expense.categoryId)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">
                            {getCategoryName(expense.categoryId)}
                          </p>
                          <span className="text-xs label-text text-muted-foreground">
                            {format(new Date(expense.date), "MM/dd")}
                          </span>
                        </div>
                        {expense.description && (
                          <p className="text-sm text-muted-foreground truncate">
                            {expense.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-foreground">
                        ¥{parseFloat(expense.amount).toFixed(2)}
                      </p>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(expense.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
