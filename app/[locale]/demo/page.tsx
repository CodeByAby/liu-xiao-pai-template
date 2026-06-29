"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import { Button } from "@/components/button";
import { Container } from "@/components/container";
import { Background } from "@/components/background";
import { MarkdownMessage } from "@/components/markdown-message";
import { createImageGenerationPayload } from "@/lib/image-generation";
import type {
  ApiErrorResponse,
  ChatStreamEvent,
  ImageGenerationResponsePayload,
  UploadImageResponse,
  UserProfileResponse,
  VideoGenerationResponsePayload,
  VideoStatusResponsePayload,
} from "@/lib/client-api";
import { getApiErrorMessage, getErrorMessage } from "@/lib/error-utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Send, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  User, 
  Bot, 
  CreditCard,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Download,
  Upload,
  Check
} from "lucide-react";
import "./markdown.css";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface GenerationResult {
  id: string;
  type: "image" | "video";
  prompt: string;
  resultUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  taskId?: string;
  createdAt: Date;
}

type TabType = "chat" | "image" | "video";

export default function DemoPage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations("demo");
  const locale = useLocale();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("chat");
  
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatSessionId, setChatSessionId] = useState<string | null>(null);
  
  // Image generation state
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('2K');
  const [imageWatermark, setImageWatermark] = useState(true);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  const [isUploadingReferenceImage, setIsUploadingReferenceImage] = useState(false);
  const [generatedImages, setGeneratedImages] = useState<GenerationResult[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // Video generation state
  const [videoPrompt, setVideoPrompt] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [videoResolution, setVideoResolution] = useState<'480p' | '720p' | '1080p'>('720p');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoWatermark, setVideoWatermark] = useState(true);
  const [generatedVideos, setGeneratedVideos] = useState<GenerationResult[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  
  // Common state
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
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

  // Chat functions
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

  // Image generation functions
  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage || isUploadingReferenceImage) return;

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    if (!referenceImageUrl) {
      setError(t("image.errors.missingReferenceImage"));
      return;
    }

    setIsGeneratingImage(true);
    setError(null);

    try {
      const payload = createImageGenerationPayload({
        prompt: imagePrompt.trim(),
        size: imageSize,
        watermark: imageWatermark,
        imageUrl: referenceImageUrl,
      });

      const response = await fetch("/api/image/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(getApiErrorMessage(errorData, "Failed to generate image"));
      }

      const data = (await response.json()) as ImageGenerationResponsePayload;
      
      const newImage: GenerationResult = {
        id: data.id,
        type: "image",
        prompt: imagePrompt,
        resultUrl: data.url,
        status: "completed",
        createdAt: new Date(),
      };
      
      setGeneratedImages(prev => [newImage, ...prev]);
      setRemainingCredits(data.remainingCredits);
      setImagePrompt("");
      
    } catch (error: unknown) {
      console.error("Error generating image:", error);
      const message = getErrorMessage(error, "Failed to generate image");
      setError(message);
      
      if (message.includes("credits")) {
        setError(t('insufficientCredits'));
      }
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleReferenceImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      e.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError(t("image.errors.invalidFileType"));
      e.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t("image.errors.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setIsUploadingReferenceImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload/image", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(getApiErrorMessage(errorData, "Upload failed"));
      }

      const data = (await response.json()) as UploadImageResponse;
      setReferenceImageUrl(data.url);
      setReferenceImageName(data.filename || file.name);
    } catch (uploadError: unknown) {
      console.error("Error uploading reference image:", uploadError);
      setError(getErrorMessage(uploadError, t("image.errors.uploadFailed")));
    } finally {
      setIsUploadingReferenceImage(false);
      e.target.value = "";
    }
  };

  const removeReferenceImage = () => {
    setReferenceImageUrl(null);
    setReferenceImageName(null);
    setError(null);
  };

  // Video generation functions
  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !uploadedImageUrl) || isGeneratingVideo) return;

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    setIsGeneratingVideo(true);
    setError(null);

    try {
      const response = await fetch("/api/video/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: videoPrompt.trim() || null,
          imageUrl: uploadedImageUrl,
          duration: videoDuration,
          resolution: videoResolution,
          watermark: videoWatermark,
        }),
      });

      if (!response.ok) {
        const errorData = (await response.json()) as ApiErrorResponse;
        throw new Error(getApiErrorMessage(errorData, "Failed to generate video"));
      }

      const data = (await response.json()) as VideoGenerationResponsePayload;
      
      const newVideo: GenerationResult = {
        id: data.id,
        type: "video",
        prompt: videoPrompt || "Image to video",
        status: "processing",
        taskId: data.taskId,
        createdAt: new Date(),
      };
      
      setGeneratedVideos(prev => [newVideo, ...prev]);
      setRemainingCredits(data.remainingCredits);
      setVideoPrompt("");
      setUploadedImageUrl(null);
      
      // Start polling for video status
      pollVideoStatus(data.id, data.taskId);
      
    } catch (error: unknown) {
      console.error("Error generating video:", error);
      const message = getErrorMessage(error, "Failed to generate video");
      setError(message);
      
      if (message.includes("credits")) {
        setError(t('insufficientCredits'));
      }
    } finally {
      setIsGeneratingVideo(false);
    }
  };

  const pollVideoStatus = async (historyId: string, taskId: string) => {
    const maxAttempts = 60; // Poll for up to 5 minutes
    let attempts = 0;

    const poll = async () => {
      try {
        const response = await fetch(
          `/api/video/status?historyId=${historyId}&taskId=${taskId}`
        );

        if (!response.ok) {
          throw new Error("Failed to check video status");
        }

        const data = (await response.json()) as VideoStatusResponsePayload;

        setGeneratedVideos(prev => prev.map(video => 
          video.id === historyId
            ? { ...video, status: data.status, resultUrl: data.videoUrl }
            : video
        ));

        if (data.status === "completed" || data.status === "failed") {
          return;
        }

        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(poll, 5000); // Poll every 5 seconds
        }
      } catch (error) {
        console.error("Error polling video status:", error);
      }
    };

    poll();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    if (file && file.type.startsWith("image/")) {
      try {
        // Show loading state
        setIsGeneratingVideo(true);
        
        // Upload file to server
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const error = (await response.json()) as ApiErrorResponse;
          throw new Error(getApiErrorMessage(error, "Upload failed"));
        }
        
        const data = (await response.json()) as UploadImageResponse;
        setUploadedImageUrl(data.url);
        console.log('Image uploaded:', data.url);
      } catch (error: unknown) {
        console.error('Upload error:', error);
        setError(getErrorMessage(error, 'Failed to upload image'));
      } finally {
        setIsGeneratingVideo(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (activeTab === "chat") {
        handleSendMessage();
      }
    }
  };

  const tabs = [
    { id: "chat" as TabType, label: t('tabs.chat'), icon: MessageSquare },
    { id: "image" as TabType, label: t('tabs.image'), icon: ImageIcon },
    { id: "video" as TabType, label: t('tabs.video'), icon: Video },
  ];

  return (
    <div className="relative min-h-screen flex flex-col">
      <Background />

      <div className="relative z-10 flex-1 overflow-hidden">
        <Container className="h-full relative pt-24 pb-6 md:pt-28">
          {/* Header with credits */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t('title')}
              </h1>
              <p className="text-muted-foreground mt-2">
                {t('subtitle')}
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

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Error Message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg flex items-center gap-2"
            >
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
            </motion.div>
          )}

          {/* Tab Content */}
          <div className="h-[calc(100vh-300px)] max-w-4xl mx-auto">
            <AnimatePresence mode="wait">
              {/* Chat Tab */}
              {activeTab === "chat" && (
                <motion.div
                  key="chat"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {t('chat.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('chat.description')}
                    </p>
                  </div>

                  {/* Messages Area */}
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

                  {/* Chat Input */}
                  <div className="border-t border-border pt-4">
                    <div className="flex gap-3">
                      <textarea
                        ref={inputRef}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
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
                </motion.div>
              )}

              {/* Image Tab */}
              {activeTab === "image" && (
                <motion.div
                  key="image"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {t('image.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('image.description')}
                    </p>
                  </div>

                  {/* Generated Images */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {generatedImages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <ImageIcon className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {t('image.description')}
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {generatedImages.map((image) => (
                          <motion.div
                            key={image.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-card rounded-lg overflow-hidden border border-border"
                          >
                            {image.resultUrl && (
                              <>
                                <div className="relative w-full h-64">
                                  <Image
                                    src={image.resultUrl}
                                    alt={image.prompt}
                                    fill
                                    sizes="(max-width: 768px) 100vw, 400px"
                                    className="object-cover"
                                    unoptimized
                                  />
                                </div>
                                <div className="p-4">
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {image.prompt}
                                  </p>
                                  <a
                                    href={image.resultUrl}
                                    download
                                    className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                                  >
                                    <Download className="w-4 h-4" />
                                    {t('image.downloadImage')}
                                  </a>
                                </div>
                              </>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Image Input */}
                  <div className="border-t border-border pt-4">
                    <div className="mb-4 rounded-xl border border-dashed border-border bg-background/40 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {t("image.reference.label")}
                          </p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {referenceImageName || t("image.reference.hint")}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {referenceImageUrl && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={removeReferenceImage}
                            >
                              {t("image.reference.remove")}
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => imageFileInputRef.current?.click()}
                            disabled={isUploadingReferenceImage}
                          >
                            {referenceImageUrl
                              ? t("image.reference.replace")
                              : t("image.reference.cta")}
                          </Button>
                        </div>
                      </div>
                      <input
                        ref={imageFileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleReferenceImageUpload}
                      />
                    </div>
                    {/* Options Row */}
                    <div className="flex gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Size:</label>
                        <select
                          value={imageSize}
                          onChange={(e) => setImageSize(e.target.value as '1K' | '2K' | '4K')}
                          className="px-3 py-1 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                        >
                          <option value="1K">1K (1024px)</option>
                          <option value="2K">2K (2048px)</option>
                          <option value="4K">4K (4096px)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={imageWatermark}
                            onChange={(e) => setImageWatermark(e.target.checked)}
                            className="mr-2"
                          />
                          Watermark
                        </label>
                      </div>
                    </div>
                    {/* Input Row */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={imagePrompt}
                        onChange={(e) => setImagePrompt(e.target.value)}
                        placeholder={t('image.placeholder')}
                        disabled={
                          isGeneratingImage ||
                          isUploadingReferenceImage ||
                          remainingCredits === 0
                        }
                        className="flex-1 px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                      />
                      <Button
                        onClick={handleGenerateImage}
                        disabled={
                          !imagePrompt.trim() ||
                          !referenceImageUrl ||
                          isGeneratingImage ||
                          isUploadingReferenceImage ||
                          remainingCredits === 0
                        }
                        className="px-6"
                      >
                        {isGeneratingImage || isUploadingReferenceImage ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Video Tab */}
              {activeTab === "video" && (
                <motion.div
                  key="video"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="h-full flex flex-col"
                >
                  <div className="mb-4">
                    <h2 className="text-xl font-semibold text-foreground">
                      {t('video.title')}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {t('video.description')}
                    </p>
                  </div>

                  {/* Generated Videos */}
                  <div className="flex-1 overflow-y-auto px-4 py-4">
                    {generatedVideos.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <Video className="w-12 h-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          {t('video.description')}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {generatedVideos.map((video) => (
                          <motion.div
                            key={video.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-card rounded-lg p-4 border border-border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-foreground">
                                  {video.prompt}
                                </p>
                                <div className="flex items-center gap-2 mt-2">
                                  {video.status === "processing" && (
                                    <>
                                      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                                      <span className="text-sm text-blue-500">
                                        {t('video.processing')}
                                      </span>
                                    </>
                                  )}
                                  {video.status === "completed" && (
                                    <>
                                      <Check className="w-4 h-4 text-green-500" />
                                      <span className="text-sm text-green-500">
                                        Completed
                                      </span>
                                    </>
                                  )}
                                  {video.status === "failed" && (
                                    <span className="text-sm text-red-500">
                                      Failed
                                    </span>
                                  )}
                                </div>
                              </div>
                              {video.status === "completed" && video.resultUrl && (
                                <a
                                  href={video.resultUrl}
                                  download
                                  className="inline-flex items-center gap-2 px-3 py-2 bg-muted rounded-lg text-sm hover:bg-muted/80 transition-colors"
                                >
                                  <Download className="w-4 h-4" />
                                  {t('video.downloadVideo')}
                                </a>
                              )}
                            </div>
                            {video.status === "completed" && video.resultUrl && (
                              <div className="mt-4 overflow-hidden rounded-lg bg-black">
                                <video
                                  src={video.resultUrl}
                                  controls
                                  playsInline
                                  preload="metadata"
                                  className="w-full h-full"
                                />
                              </div>
                            )}
                            {video.status === "processing" && (
                              <div className="mt-4 aspect-video rounded-lg bg-muted flex items-center justify-center">
                                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                              </div>
                            )}
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Video Input */}
                  <div className="border-t border-border pt-4">
                    {uploadedImageUrl && (
                      <div className="mb-3 p-2 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
                        <span className="text-sm text-green-700 dark:text-green-300">
                          Image uploaded
                        </span>
                        <button
                          onClick={() => setUploadedImageUrl(null)}
                          className="ml-auto text-sm text-red-600 dark:text-red-400 hover:underline"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                    {/* Options Row */}
                    <div className="flex gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Resolution:</label>
                        <select
                          value={videoResolution}
                          onChange={(e) => setVideoResolution(e.target.value as '480p' | '720p' | '1080p')}
                          className="px-3 py-1 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                        >
                          <option value="480p">480p</option>
                          <option value="720p">720p (HD)</option>
                          <option value="1080p">1080p (FHD)</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">Duration:</label>
                        <input
                          type="number"
                          min={3}
                          max={10}
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(Number(e.target.value))}
                          className="w-16 px-2 py-1 bg-background/50 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
                        />
                        <span className="text-sm text-muted-foreground">seconds</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={videoWatermark}
                            onChange={(e) => setVideoWatermark(e.target.checked)}
                            className="mr-2"
                          />
                          Watermark
                        </label>
                      </div>
                    </div>
                    {/* Input Row */}
                    <div className="flex gap-3">
                      <input
                        type="text"
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder={t('video.placeholder')}
                        disabled={isGeneratingVideo || remainingCredits === 0}
                        className="flex-1 px-4 py-3 bg-background/50 border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-ring text-foreground placeholder-muted-foreground"
                      />
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                      <Button
                        variant="simple"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isGeneratingVideo || remainingCredits === 0}
                      >
                        <Upload className="w-5 h-5" />
                      </Button>
                      <Button
                        onClick={handleGenerateVideo}
                        disabled={(!videoPrompt.trim() && !uploadedImageUrl) || isGeneratingVideo || remainingCredits === 0}
                        className="px-6"
                      >
                        {isGeneratingVideo ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Sparkles className="w-5 h-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </Container>
      </div>
    </div>
  );
}
