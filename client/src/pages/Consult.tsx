import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, MessageCircle, AlertCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import VoiceInput from "@/components/VoiceInput";
import ExpenseAnalyzer from "@/components/ExpenseAnalyzer";
import { Link } from "wouter";

export default function Consult() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: messages, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery({
    type: "expense_consult",
    limit: 100,
  });

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate();
      setInput("");
    },
    onError: () => {
      toast.error("发送失败，请重试");
    },
  });

  const clearMutation = trpc.chat.clearMessages.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate();
      toast.success("对话已清空");
    },
  });

  const handleSend = () => {
    if (!input.trim()) {
      toast.error("请输入内容");
      return;
    }

    sendMutation.mutate({
      content: input,
      type: "expense_consult",
    });
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const handleClearChat = () => {
    if (confirm("确定要清空对话记录吗？")) {
      clearMutation.mutate({ type: "expense_consult" });
    }
  };

  const handleQuickQuestion = (question: string) => {
    sendMutation.mutate({
      content: question,
      type: "expense_consult",
    });
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedMessages = messages ? [...messages].reverse() : [];

  const quickQuestions = [
    "我想买一部新手机，预算5000元，合适吗？",
    "这个月外卖花了2000元，是不是太多了？",
    "我想报一个培训班，学费8000元，值得吗？",
    "周末想和朋友聚餐，预算500元，可以吗？",
  ];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      {/* Quick Analyzer */}
      <ExpenseAnalyzer 
        onAnalysisComplete={(text) => {
          setInput(text);
        }}
      />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold organic-heading text-foreground">消费咨询</h1>
          <p className="text-muted-foreground mt-1">消费前问问 AI，做出更明智的决策</p>
        </div>
        {messages && messages.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearChat}
            disabled={clearMutation.isPending}
            className="rounded-full"
          >
            清空对话
          </Button>
        )}
      </div>

      {/* Profile Warning */}
      {!profile?.isComplete && (
        <Card className="soft-shadow border-destructive/50 bg-destructive/5">
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
              <div className="flex-1">
                <p className="font-medium text-foreground">画像未完善</p>
                <p className="text-sm text-muted-foreground mt-1">
                  完善你的财务画像信息，AI 可以提供更精准的建议
                </p>
                <Button asChild variant="outline" size="sm" className="mt-3 rounded-full">
                  <Link href="/profile">
                    去完善
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chat Interface */}
      <Card className="soft-shadow border-border/50">
        <CardContent className="p-0">
          {/* Messages */}
          <div className="h-[500px] overflow-y-auto p-6 space-y-4">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : sortedMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full space-y-6">
                <MessageCircle className="h-12 w-12 text-muted-foreground/50" />
                <div className="text-center">
                  <p className="text-foreground font-medium">开始咨询</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    告诉 AI 你想买什么，获取专业建议
                  </p>
                </div>
                <div className="w-full max-w-md space-y-2">
                  <p className="text-xs label-text text-muted-foreground text-center">快速提问</p>
                  {quickQuestions.map((q, i) => (
                    <Button
                      key={i}
                      variant="outline"
                      size="sm"
                      onClick={() => handleQuickQuestion(q)}
                      disabled={sendMutation.isPending}
                      className="w-full justify-start text-left h-auto py-3 rounded-xl"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {sortedMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-accent text-accent-foreground"
                      }`}
                    >
                      {msg.role === "assistant" ? (
                        <div className="prose prose-sm max-w-none">
                          <Streamdown>{msg.content}</Streamdown>
                        </div>
                      ) : (
                        <p className="text-sm">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex justify-start">
                    <div className="bg-accent text-accent-foreground rounded-2xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-border p-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="例如：我想买一台笔记本电脑..."
                disabled={sendMutation.isPending}
                className="flex-1 px-4 py-2 rounded-full border border-border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <VoiceInput
                onTranscript={handleVoiceTranscript}
                disabled={sendMutation.isPending}
              />
              <Button
                onClick={handleSend}
                disabled={sendMutation.isPending || !input.trim()}
                size="icon"
                className="rounded-full"
              >
                {sendMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
