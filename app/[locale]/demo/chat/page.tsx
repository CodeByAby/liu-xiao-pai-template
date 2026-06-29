"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/button";
import { Background } from "@/components/background";
import { MarkdownMessage } from "@/components/markdown-message";
import type {
  ApiErrorResponse,
  ChatStreamEvent,
  UserProfileResponse,
} from "@/lib/client-api";
import { getApiErrorMessage, getErrorMessage } from "@/lib/error-utils";
import { motion } from "framer-motion";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  User, 
  Bot, 
  CreditCard,
  MessageSquare
} from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export default function ChatPage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations("demo");
  const locale = useLocale();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchUserCredits = useCallback(async () => {
    if (!session.data?.user) {
      setRemainingCredits(null);
      return;
    }

    try {
      const response = await fetch("/api/user/profile");
      if (response.ok) {
        const data = (await response.json()) as UserProfileResponse;
        setRemainingCredits(data.user.credits);
      } else if (response.status === 401 || response.status === 403) {
        setRemainingCredits(null);
      }
    } catch (error) {
      console.error("Error fetching user credits:", error);
    }
  }, [session.data]);

  useEffect(() => {
    fetchUserCredits();
  }, [fetchUserCredits]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    const userMessage: Message = {
      id: `msg_${Date.now()}`,
      role: "user",
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setIsLoading(true);
    setError(null);

    const assistantMessageId = `msg_${Date.now() + 1}`;
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);

    try {
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          sessionId: chatSessionId,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(getApiErrorMessage(errorData, "Failed to send message"));
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let streamedContent = "";
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as ChatStreamEvent;
              
              if (data.type === "metadata") {
                setChatSessionId(data.sessionId);
                setRemainingCredits(data.remainingCredits);
              } else if (data.type === "content") {
                streamedContent += data.content;
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, content: streamedContent }
                    : msg
                ));
              } else if (data.type === "done") {
                setMessages(prev => prev.map(msg => 
                  msg.id === assistantMessageId 
                    ? { ...msg, isStreaming: false }
                    : msg
                ));
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // Ignore parsing errors for incomplete chunks
            }
          }
        }
      }
    } catch (error: unknown) {
      console.error("Error sending message:", error);
      const message = getErrorMessage(error, "Failed to send message");
      setError(message);
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
      
      if (message.includes("credits")) {
        setError(t('insufficientCredits'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col">
      <Background />

      <div className="relative z-10 flex-1 flex flex-col pt-24 md:pt-28 pb-6 px-4 md:px-8 lg:px-12">
        <div className="flex-1 flex flex-col max-w-full">
          <div className="flex justify-between items-center mb-6 max-w-6xl mx-auto w-full">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <MessageSquare className="w-8 h-8" />
                {t('chat.title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('chat.description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {remainingCredits !== null && (
                <div className="flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-sm rounded-lg border border-border shadow-sm">
                  <CreditCard className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {t('credits')}:
                  </span>
                  <span className="text-sm font-semibold text-foreground">
                    {remainingCredits}
                  </span>
                </div>
              )}
              {session.data?.user && (
                <Button
                  variant="simple"
                  size="sm"
                  onClick={() => router.push(`/${locale}/dashboard`)}
                >
                  {t('backToDashboard')}
                </Button>
              )}
            </div>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2 max-w-6xl mx-auto w-full"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </motion.div>
          )}

          <div className="flex-1 max-w-6xl mx-auto w-full flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Sparkles className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-2xl font-semibold text-foreground mb-2">
                    {t('startChat')}
                  </h3>
                  <p className="text-muted-foreground max-w-md">
                    {t('startChatDescription')}
                  </p>
                </div>
              ) : (
                messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <div
                      className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.role === "user"
                          ? "bg-muted"
                          : "bg-primary"
                      }`}
                    >
                      {message.role === "user" ? (
                        <User className="w-5 h-5 text-muted-foreground" />
                      ) : (
                        <Bot className="w-5 h-5 text-primary-foreground" />
                      )}
                    </div>
                    <div
                      className={`flex-1 px-4 py-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-muted text-foreground"
                          : "bg-card text-foreground border border-border"
                      }`}
                    >
                      {message.role === "user" ? (
                        <div className="whitespace-pre-wrap break-words">
                          {message.content}
                        </div>
                      ) : (
                        <MarkdownMessage 
                          content={message.content} 
                          isStreaming={message.isStreaming}
                        />
                      )}
                    </div>
                  </motion.div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="border-t border-border pt-4">
              <div className="flex gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={t('chat.placeholder')}
                  disabled={isLoading || remainingCredits === 0}
                  rows={1}
                  className="flex-1 px-4 py-3 bg-background/50 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                  style={{
                    minHeight: "48px",
                    maxHeight: "120px",
                  }}
                  onInput={(e) => {
                    const target = e.target as HTMLTextAreaElement;
                    target.style.height = "48px";
                    target.style.height = `${target.scrollHeight}px`;
                  }}
                />
                <Button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isLoading || remainingCredits === 0}
                  className="px-6"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </Button>
              </div>
              <div className="mt-2 px-2 text-xs text-muted-foreground">
                {t('sendHint')}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
