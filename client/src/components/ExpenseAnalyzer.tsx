import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { Loader2, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from "lucide-react";

interface ExpenseAnalyzerProps {
  onAnalysisComplete?: (result: string) => void;
}

export default function ExpenseAnalyzer({ onAnalysisComplete }: ExpenseAnalyzerProps) {
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const categories = [
    { value: "餐饮", label: "餐饮" },
    { value: "交通", label: "交通" },
    { value: "娱乐", label: "娱乐" },
    { value: "服饰", label: "服饰" },
    { value: "电子产品", label: "电子产品" },
    { value: "日用品", label: "日用品" },
  ];

  const handleAnalyze = async () => {
    if (!category || !amount) {
      return;
    }

    setAnalyzing(true);
    
    // Simulate analysis (in real app, call tRPC endpoint)
    setTimeout(() => {
      const analysisText = `我想在${category}上花费${amount}元，这个消费合理吗？`;
      if (onAnalysisComplete) {
        onAnalysisComplete(analysisText);
      }
      setAnalyzing(false);
      setCategory("");
      setAmount("");
    }, 500);
  };

  return (
    <Card className="organic-card border-sage/20">
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-terracotta">快速分析</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="category">消费分类</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="category">
              <SelectValue placeholder="选择分类" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="amount">金额（元）</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                handleAnalyze();
              }
            }}
          />
        </div>

        <Button
          onClick={handleAnalyze}
          disabled={!category || !amount || analyzing}
          className="w-full bg-terracotta hover:bg-terracotta/90"
        >
          {analyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              分析中...
            </>
          ) : (
            "智能分析"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
