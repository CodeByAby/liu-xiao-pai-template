"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/button";
import { Background } from "@/components/background";
import NextImage from "next/image";
import type {
  ApiErrorResponse,
  UploadImageResponse,
  UserProfileResponse,
  VideoGenerationResponsePayload,
  VideoStatusResponsePayload,
} from "@/lib/client-api";
import { getApiErrorMessage, getErrorMessage } from "@/lib/error-utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  AlertCircle, 
  Loader2, 
  CreditCard,
  Video,
  Download,
  Upload,
  X,
  Play,
  Image as ImageIcon,
  FileVideo,
  Settings,
  Maximize,
  ChevronDown,
  Zap,
  Film,
  ChevronLeft,
  ChevronRight,
  Pause
} from "lucide-react";

interface GenerationResult {
  id: string;
  type: "video";
  prompt: string;
  imageUrl?: string;
  resultUrl?: string;
  status: "pending" | "processing" | "completed" | "failed";
  taskId?: string;
  createdAt: Date;
  duration?: number;
  resolution?: string;
  isPreset?: boolean;
}

// 预设视频数据 (从本地静态资源加载)
const presetVideos: GenerationResult[] = [
  {
    id: "preset-video-1",
    type: "video",
    prompt: "a snow leopard is walking carefully, snowy landscape scene at twilight.",
    resultUrl: "/starter/demo/videos/preset-snow-leopard.mp4",
    status: "completed",
    createdAt: new Date(),
    duration: 5,
    resolution: "720p",
    isPreset: true
  },
  {
    id: "preset-video-2",
    type: "video",
    prompt: "a dog speed climbs up a climbing wall at the olympics.",
    resultUrl: "/starter/demo/videos/preset-dog-olympics.mp4",
    status: "completed",
    createdAt: new Date(),
    duration: 5,
    resolution: "720p",
    isPreset: true
  },
  {
    id: "preset-video-3",
    type: "video",
    prompt: "A pirate ship in a raging sea.",
    resultUrl: "/starter/demo/videos/preset-pirate-ship.mp4",
    status: "completed",
    createdAt: new Date(),
    duration: 5,
    resolution: "720p",
    isPreset: true
  },
  {
    id: "preset-video-4",
    type: "video",
    prompt: "The sun rises slowly between tall buildings... Bicycle tires roll over a dew-covered street at dawn...",
    resultUrl: "/starter/demo/videos/preset-sun-bicycle.mp4",
    status: "completed",
    createdAt: new Date(),
    duration: 5,
    resolution: "720p",
    isPreset: true
  }
];

export default function VideoPage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations("demo");
  const locale = useLocale();
  
  const [mode, setMode] = useState<'text' | 'image'>('text');
  const [videoPrompt, setVideoPrompt] = useState("");
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [videoResolution, setVideoResolution] = useState<'480p' | '720p' | '1080p'>('720p');
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoWatermark, setVideoWatermark] = useState(true);
  const [generatedVideos, setGeneratedVideos] = useState<GenerationResult[]>([]);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<GenerationResult | null>(null);
  const [showResolutionDropdown, setShowResolutionDropdown] = useState(false);
  const resolutionButtonRef = useRef<HTMLButtonElement>(null);

  // 轮播相关状态
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoCost = 50;

  useEffect(() => {
    // 初始化时加载预设视频
    setGeneratedVideos(presetVideos);

    // 预加载所有预设视频
    presetVideos.forEach((video) => {
      if (video.resultUrl) {
        const videoElement = document.createElement('video');
        videoElement.src = video.resultUrl;
        videoElement.preload = 'auto';
      }
    });
  }, []);

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

  // 自动轮播
  useEffect(() => {
    if (isAutoPlaying && generatedVideos.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentVideoIndex((prev) => (prev + 1) % generatedVideos.length);
      }, 5000); // 视频每5秒切换一次

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isAutoPlaying, generatedVideos.length, currentVideoIndex]);

  // 手动切换到上一个
  const goToPrevious = () => {
    setCurrentVideoIndex((prev) => 
      prev === 0 ? generatedVideos.length - 1 : prev - 1
    );
    setIsAutoPlaying(false);
  };

  // 手动切换到下一个
  const goToNext = () => {
    setCurrentVideoIndex((prev) => 
      (prev + 1) % generatedVideos.length
    );
    setIsAutoPlaying(false);
  };

  // 切换自动播放状态
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleGenerateVideo = async () => {
    if ((!videoPrompt.trim() && !uploadedImageUrl) || isGeneratingVideo) return;

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    setIsGeneratingVideo(true);
    setError(null);
    
    // 创建临时的loading占位视频
    const loadingVideo: GenerationResult = {
      id: `loading-${Date.now()}`,
      type: "video",
      prompt: videoPrompt || "Image to video",
      imageUrl: uploadedImageUrl ?? undefined,
      status: "processing",
      createdAt: new Date(),
      duration: videoDuration,
      resolution: videoResolution,
      isPreset: false
    };
    
    // 清空当前视频列表，只显示loading
    setGeneratedVideos([loadingVideo]);
    setCurrentVideoIndex(0);
    setIsAutoPlaying(false);

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
        imageUrl: uploadedImageUrl ?? undefined,
        status: "processing",
        taskId: data.taskId,
        createdAt: new Date(),
        duration: videoDuration,
        resolution: videoResolution,
        isPreset: false
      };
      
      // 替换loading视频为真实生成的视频（仍在处理中）
      setGeneratedVideos([newVideo]);
      setRemainingCredits(data.remainingCredits);
      setVideoPrompt("");
      setUploadedImageUrl(null);
      setUploadedImagePreview(null);
      
      // Start polling for video status
      pollVideoStatus(data.id, data.taskId);
      
    } catch (error: unknown) {
      console.error("Error generating video:", error);
      const message = getErrorMessage(error, "Failed to generate video");
      setError(message);
      
      if (message.includes("credits")) {
        setError(t('insufficientCredits'));
      }
      // 出错时恢复预设视频
      setGeneratedVideos(presetVideos);
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
        setGeneratedVideos(prev => prev.map(video => 
          video.id === historyId ? { ...video, status: "failed" } : video
        ));
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
        setError(null);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
        
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
        setUploadedImagePreview(null);
      }
    }
  };

  const removeUploadedImage = () => {
    setUploadedImageUrl(null);
    setUploadedImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const promptSuggestions = [
    t('video.text.prompt1'),
    t('video.text.prompt2'),
    t('video.text.prompt3'),
    t('video.text.prompt4'),
  ];

  return (
    <div className="relative min-h-screen bg-secondary pt-16">
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="pb-4 mb-4">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Video className="w-8 h-8" />
                {t('video.title')}
              </h1>
              <p className="text-neutral-600 dark:text-neutral-400 mt-2">
                {t('video.description')}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {remainingCredits !== null && (
                <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-lg border border-neutral-200 dark:border-neutral-700">
                  <CreditCard className="w-4 h-4 text-neutral-500" />
                  <span className="text-sm text-neutral-600 dark:text-neutral-400">
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
                  className="text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  {t('backToDashboard')}
                </Button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2"
          >
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Control Panel */}
          <div className="lg:col-span-4">
              <div className="bg-background rounded-xl border border-neutral-200 dark:border-neutral-800 p-6 overflow-visible">
              <h2 className="text-xl font-semibold text-foreground mb-6 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                {t('video.configuration')}
              </h2>

              {/* Mode Selector */}
              <div className="mb-6">
                <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 block">
                  {t('video.generationMode')}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode('text')}
                    className={`px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      mode === 'text'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'
                    }`}
                  >
                    <FileVideo className="w-4 h-4" />
                    {t('video.modes.text')}
                  </button>
                  <button
                    onClick={() => setMode('image')}
                    className={`px-4 py-3 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                      mode === 'image'
                        ? 'bg-foreground text-background border-foreground'
                        : 'bg-background text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-750'
                    }`}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {t('video.modes.image')}
                  </button>
                </div>
              </div>

              {/* Text Input or Image Upload */}
              {mode === 'text' ? (
                <div className="mb-6">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 block">
                    {t('video.text.descriptionLabel')}
                  </label>
                  <textarea
                    value={videoPrompt}
                    onChange={(e) => setVideoPrompt(e.target.value)}
                    placeholder={t('video.placeholder')}
                    className="w-full px-4 py-3 bg-secondary border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-foreground placeholder-neutral-500 resize-none"
                    rows={4}
                  />

                  {/* Quick Prompts */}
                  <div className="mt-3">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">{t('video.text.quickPromptsLabel')}</p>
                    <div className="flex flex-wrap gap-2">
                      {promptSuggestions.map((suggestion) => (
                        <button
                          key={suggestion}
                          onClick={() => setVideoPrompt(suggestion)}
                          className="px-3 py-1 text-xs bg-secondary text-neutral-700 dark:text-neutral-300 rounded-md hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-6">
                  <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3 block">
                    {t('video.imageUpload.label')}
                  </label>
                  {!uploadedImagePreview ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="w-full h-32 border-2 border-dashed border-neutral-300 dark:border-neutral-700 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-neutral-400 dark:hover:border-neutral-600 transition-colors"
                    >
                      <Upload className="w-8 h-8 text-neutral-400 mb-2" />
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">
                        {t('video.imageUpload.cta')}
                      </span>
                      <span className="text-xs text-neutral-500 dark:text-neutral-500 mt-1">
                        {t('video.imageUpload.limit')}
                      </span>
                    </div>
                  ) : (
                    <div className="relative w-full h-32">
                      <NextImage
                        src={uploadedImagePreview}
                        alt="Uploaded image preview"
                        fill
                        sizes="(max-width: 768px) 100vw, 320px"
                        className="object-cover rounded-lg"
                        unoptimized
                      />
                      <button
                        onClick={removeUploadedImage}
                        className="absolute top-2 right-2 p-1 bg-background rounded-md shadow-lg hover:bg-neutral-100 dark:hover:bg-neutral-700"
                      >
                        <X className="w-4 h-4 text-neutral-600 dark:text-neutral-400" />
                      </button>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  
                  {/* Motion Prompt for Image to Video */}
                  {uploadedImagePreview && (
                    <div className="mt-4">
                      <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2 block">
                        {t('video.imageUpload.motionLabel')}
                      </label>
                      <input
                        type="text"
                        value={videoPrompt}
                        onChange={(e) => setVideoPrompt(e.target.value)}
                        placeholder={t('video.imageUpload.motionPlaceholder')}
                        className="w-full px-4 py-2 bg-secondary border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-foreground placeholder-neutral-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Advanced Settings */}
              <div className="mb-6 overflow-visible">
                <button
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-3"
                >
                  <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                  {t('video.advanced.toggle')}
                </button>

                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-4"
                      style={{ overflow: 'visible' }}
                    >
                      {/* Resolution */}
                      <div>
                        <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 block">
                          {t('video.advanced.resolution')}
                        </label>
                        <button
                          ref={resolutionButtonRef}
                          type="button"
                          onClick={() => setShowResolutionDropdown(!showResolutionDropdown)}
                          className="w-full px-3 py-2 bg-secondary border border-neutral-200 dark:border-neutral-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-neutral-400 dark:focus:ring-neutral-600 text-foreground flex items-center justify-between"
                        >
                          <span>{t(`video.advanced.resolutionOptions.${videoResolution}`)}</span>
                          <ChevronDown className={`w-4 h-4 transition-transform ${showResolutionDropdown ? 'rotate-180' : ''}`} />
                        </button>

                        {showResolutionDropdown && resolutionButtonRef.current && (
                          <>
                            <div
                              className="fixed inset-0 z-[9999]"
                              onClick={() => setShowResolutionDropdown(false)}
                            />
                            <div
                              className="fixed bg-background border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg z-[10000] overflow-hidden"
                              style={{
                                top: `${resolutionButtonRef.current.getBoundingClientRect().bottom + 4}px`,
                                left: `${resolutionButtonRef.current.getBoundingClientRect().left}px`,
                                width: `${resolutionButtonRef.current.getBoundingClientRect().width}px`,
                              }}
                            >
                              {(['480p', '720p', '1080p'] as const).map((resolution) => (
                                <button
                                  key={resolution}
                                  type="button"
                                  onClick={() => {
                                    setVideoResolution(resolution);
                                    setShowResolutionDropdown(false);
                                  }}
                                  className={`w-full px-3 py-2 text-left hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors ${
                                    videoResolution === resolution
                                      ? 'bg-secondary text-foreground'
                                      : 'text-neutral-700 dark:text-neutral-300'
                                  }`}
                                >
                                  {t(`video.advanced.resolutionOptions.${resolution}`)}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      
                      {/* Duration */}
                      <div>
                        <label className="text-sm text-neutral-600 dark:text-neutral-400 mb-2 block">
                          {t('video.advanced.durationLabel', { seconds: videoDuration })}
                        </label>
                        <input
                          type="range"
                          min={3}
                          max={10}
                          value={videoDuration}
                          onChange={(e) => setVideoDuration(Number(e.target.value))}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-neutral-500 mt-1">
                          <span>{t('video.advanced.rangeStart')}</span>
                          <span>{t('video.advanced.rangeEnd')}</span>
                        </div>
                      </div>
                      
                      {/* Watermark */}
                      <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                        <input
                          type="checkbox"
                          checked={videoWatermark}
                          onChange={(e) => setVideoWatermark(e.target.checked)}
                          className="rounded border-neutral-300 dark:border-neutral-600"
                        />
                        {t('video.advanced.watermark')}
                      </label>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerateVideo}
                disabled={(!videoPrompt.trim() && !uploadedImageUrl) || isGeneratingVideo || remainingCredits === 0}
                className="w-full bg-foreground text-background hover:bg-neutral-800 dark:hover:bg-neutral-200"
              >
                {isGeneratingVideo ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    {t('video.generate.loading')}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    {t('video.generate.button', { amount: videoCost })}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Video Carousel Gallery */}
          <div className="lg:col-span-7">
            <div className="bg-background rounded-xl border border-neutral-200 dark:border-neutral-800 p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                  <Film className="w-5 h-5" />
                  {t('video.gallery.title')}
                </h2>
                {generatedVideos.length > 1 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={toggleAutoPlay}
                      className="p-2 rounded-lg bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                      title={isAutoPlaying ? t('video.gallery.autoplayPause') : t('video.gallery.autoplayStart')}
                    >
                      {isAutoPlaying ? (
                        <Pause className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      ) : (
                        <Play className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                      )}
                    </button>
                    <span className="text-sm text-neutral-500">
                      {currentVideoIndex + 1} / {generatedVideos.length}
                    </span>
                  </div>
                )}
              </div>

              {/* 轮播展示区 */}
              {generatedVideos.length > 0 ? (
                <div className="relative">
                  {/* 视频信息 - 移到视频上方 */}
                  <div className="mb-4 p-4 bg-secondary rounded-lg">
                    <p 
                      className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      onClick={() => {
                        setVideoPrompt(generatedVideos[currentVideoIndex]?.prompt || "");
                        setMode('text');
                      }}
                      title={t('video.gallery.usePromptHint')}
                    >
                      {generatedVideos[currentVideoIndex]?.prompt}
                    </p>
                    <div className="flex items-center gap-3 text-xs">
                      {generatedVideos[currentVideoIndex]?.isPreset ? (
                        <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                          {t('video.gallery.presetBadge')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                          {t('video.gallery.userBadge')}
                        </span>
                      )}
                      {generatedVideos[currentVideoIndex]?.resolution && (
                        <span className="text-neutral-500">{generatedVideos[currentVideoIndex].resolution}</span>
                      )}
                      {generatedVideos[currentVideoIndex]?.duration && (
                        <span className="text-neutral-500">{generatedVideos[currentVideoIndex].duration}s</span>
                      )}
                      {generatedVideos[currentVideoIndex]?.status === "completed" && generatedVideos[currentVideoIndex]?.resultUrl && (
                        <>
                          <button
                            onClick={() => setSelectedVideo(generatedVideos[currentVideoIndex])}
                            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                            title={t('video.gallery.fullscreen')}
                          >
                            <Maximize className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                          </button>
                          <a
                            href={generatedVideos[currentVideoIndex].resultUrl}
                            download={`video-${generatedVideos[currentVideoIndex].id}.mp4`}
                            className="p-1.5 hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded transition-colors"
                            title={t('video.gallery.download')}
                          >
                            <Download className="w-3.5 h-3.5 text-neutral-600 dark:text-neutral-400" />
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {/* 主视频展示 */}
                  <div className="relative aspect-video bg-black rounded-lg overflow-hidden max-w-2xl mx-auto">
                    {/* 预加载下一个和上一个视频 */}
                    {generatedVideos.map((video, index) => {
                      const shouldPreload =
                        index === currentVideoIndex ||
                        index === (currentVideoIndex + 1) % generatedVideos.length ||
                        index === (currentVideoIndex - 1 + generatedVideos.length) % generatedVideos.length;

                      if (!shouldPreload || !video.resultUrl || video.status !== "completed") return null;

                      return (
                        <video
                          key={`preload-${video.id}`}
                          src={video.resultUrl}
                          preload="auto"
                          muted
                          playsInline
                          className="hidden"
                        />
                      );
                    })}

                    <AnimatePresence mode="wait">
                      <motion.div
                        key={generatedVideos[currentVideoIndex]?.id}
                        initial={{ opacity: 0, x: 100 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -100 }}
                        transition={{ duration: 0.3 }}
                        className="absolute inset-0"
                      >
                        {generatedVideos[currentVideoIndex]?.status === "completed" && generatedVideos[currentVideoIndex]?.resultUrl ? (
                          <video
                            key={generatedVideos[currentVideoIndex].id}
                            src={generatedVideos[currentVideoIndex].resultUrl}
                            controls
                            autoPlay
                            loop
                            muted
                            playsInline
                            preload="auto"
                            className="w-full h-full object-contain"
                          />
                        ) : generatedVideos[currentVideoIndex]?.status === "processing" ? (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                            <div className="text-center">
                              <Loader2 className="w-12 h-12 animate-spin text-white mx-auto mb-3" />
                              <p className="text-white">{t('video.gallery.processing')}</p>
                            </div>
                          </div>
                        ) : generatedVideos[currentVideoIndex]?.status === "failed" ? (
                          <div className="w-full h-full flex items-center justify-center bg-neutral-900">
                            <div className="text-center text-red-400">
                              <X className="w-12 h-12 mx-auto mb-3" />
                              <p>{t('video.gallery.failed')}</p>
                            </div>
                          </div>
                        ) : null}
                      </motion.div>
                    </AnimatePresence>
                    
                    {/* 左右切换按钮 */}
                    {generatedVideos.length > 1 && (
                      <>
                        <button
                          onClick={goToPrevious}
                          className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors z-10"
                        >
                          <ChevronLeft className="w-5 h-5 text-foreground" />
                        </button>
                        <button
                          onClick={goToNext}
                          className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors z-10"
                        >
                          <ChevronRight className="w-5 h-5 text-foreground" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-96 text-neutral-400">
                  <div className="text-center">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>{t('video.gallery.empty')}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Video Modal */}
        <AnimatePresence>
          {selectedVideo && selectedVideo.resultUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
              onClick={() => setSelectedVideo(null)}
            >
              <motion.div
                initial={{ scale: 0.9 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0.9 }}
                className="relative max-w-5xl w-full"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setSelectedVideo(null)}
                  className="absolute -top-12 right-0 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-white" />
                </button>
                <video
                  src={selectedVideo.resultUrl}
                  controls
                  autoPlay
                  playsInline
                  className="w-full h-auto rounded-lg"
                />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
