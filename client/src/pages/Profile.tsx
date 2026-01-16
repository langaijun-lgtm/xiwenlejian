import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Send, Loader2, Sparkles, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import VoiceInput from "@/components/VoiceInput";

export default function Profile() {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const utils = trpc.useUtils();
  const { data: profile } = trpc.profile.get.useQuery();
  const { data: messages, isLoading: messagesLoading } = trpc.chat.getMessages.useQuery({
    type: "profile_setup",
    limit: 100,
  });

  const sendMutation = trpc.chat.sendMessage.useMutation({
    onSuccess: () => {
      utils.chat.getMessages.invalidate();
      utils.profile.get.invalidate();
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
      type: "profile_setup",
    });
  };

  const handleVoiceTranscript = (text: string) => {
    setInput(text);
  };

  const handleClearChat = () => {
    if (confirm("确定要清空对话记录吗？")) {
      clearMutation.mutate({ type: "profile_setup" });
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sortedMessages = messages ? [...messages].reverse() : [];

  return (
    <div className="space-y-6 pb-20 md:pb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold organic-heading text-foreground">个人画像</h1>
          <p className="text-muted-foreground mt-1">完善你的财务信息，获得更精准的建议</p>
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

      {/* Profile Completion Status */}
      {profile && (
        <Card className="soft-shadow border-border/50 bg-gradient-to-br from-primary/5 to-background">
          <CardContent className="py-6">
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-primary" />
              <div className="flex-1">
                <p className="font-medium text-foreground">
                  {profile.isComplete ? "画像已完善" : "画像待完善"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {profile.isComplete
                    ? "你可以随时更新你的信息"
                    : "请通过下方对话完善你的财务信息"}
                </p>
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
              <div className="flex flex-col items-center justify-center h-full space-y-4 text-center">
                <Sparkles className="h-12 w-12 text-muted-foreground/50" />
                <div>
                  <p className="text-foreground font-medium">开始对话</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    AI 助手会引导你完善财务画像信息
                  </p>
                </div>
                <Button
                  onClick={() => {
                    sendMutation.mutate({
                      content: "你好，我想完善我的财务信息",
                      type: "profile_setup",
                    });
                  }}
                  disabled={sendMutation.isPending}
                  className="rounded-full"
                >
                  开始设置
                </Button>
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
                placeholder="输入或使用语音..."
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
