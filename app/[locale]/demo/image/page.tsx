"use client";

import { useState, useEffect, useRef, useCallback, ChangeEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/auth-client";
import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/button";
import { Background } from "@/components/background";
import { createImageGenerationPayload } from "@/lib/image-generation";
import type {
  ApiErrorResponse,
  ImageGenerationResponsePayload,
  UploadImageResponse,
  UserProfileResponse,
} from "@/lib/client-api";
import { getApiErrorMessage, getErrorMessage } from "@/lib/error-utils";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  AlertCircle, 
  Loader2,
  Image as ImageIcon,
  Download,
  Settings2,
  Copy,
  Check,
  Upload,
  Maximize2,
  Clock,
  Hash,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause
} from "lucide-react";

interface GenerationResult {
  id: string;
  type: "image";
  prompt: string;
  resultUrl?: string;
  status: "completed" | "failed";
  createdAt: Date;
  size?: string;
  isPreset?: boolean;
  sourceImageUrl?: string;
}

// 预设图片数据 (从本地静态资源加载)
const presetImages: GenerationResult[] = [
  {
    id: "preset-img-1",
    type: "image",
    prompt: "A majestic lion with a flowing mane, bathed in golden sunset light, photorealistic style",
    resultUrl: "/starter/demo/images/preset-lion-sunset.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  },
  {
    id: "preset-img-2",
    type: "image",
    prompt: "Futuristic cityscape with neon lights reflecting on wet streets, cyberpunk aesthetic",
    resultUrl: "/starter/demo/images/preset-cyberpunk-city.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  },
  {
    id: "preset-img-3",
    type: "image",
    prompt: "A serene Japanese garden with cherry blossoms and a traditional bridge over a koi pond",
    resultUrl: "/starter/demo/images/preset-japanese-garden.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  },
  {
    id: "preset-img-4",
    type: "image",
    prompt: "Abstract colorful paint explosion, vibrant colors mixing in mid-air",
    resultUrl: "/starter/demo/images/preset-paint-explosion.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  },
  {
    id: "preset-img-5",
    type: "image",
    prompt: "A mystical forest path with glowing mushrooms and fireflies, fantasy art style",
    resultUrl: "/starter/demo/images/preset-mystical-forest.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  },
  {
    id: "preset-img-6",
    type: "image",
    prompt: "A steampunk airship floating above Victorian London, detailed mechanical elements",
    resultUrl: "/starter/demo/images/preset-steampunk-airship.jpg",
    status: "completed",
    createdAt: new Date(),
    size: "2K",
    isPreset: true
  }
];

export default function ImagePage() {
  const router = useRouter();
  const session = useSession();
  const t = useTranslations("demo");
  const locale = useLocale();
  
  const [imagePrompt, setImagePrompt] = useState("");
  const [imageSize, setImageSize] = useState<'adaptive' | '1K' | '2K' | '4K'>('adaptive');
  const [imageWatermark, setImageWatermark] = useState(true);
  const [generatedImages, setGeneratedImages] = useState<GenerationResult[]>([]);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<GenerationResult | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [referenceImageUrl, setReferenceImageUrl] = useState<string | null>(null);
  const [referenceImageName, setReferenceImageName] = useState<string | null>(null);
  
  // 轮播相关状态
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageCost = 20;

  useEffect(() => {
    // 初始化时加载预设图片
    setGeneratedImages(presetImages);
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
    if (isAutoPlaying && generatedImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentImageIndex((prev) => (prev + 1) % generatedImages.length);
      }, 3000); // 每3秒切换一次

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isAutoPlaying, generatedImages.length, currentImageIndex]);

  // 手动切换到上一张
  const goToPrevious = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? generatedImages.length - 1 : prev - 1
    );
    // 手动切换时暂停自动轮播
    setIsAutoPlaying(false);
  };

  // 手动切换到下一张
  const goToNext = () => {
    setCurrentImageIndex((prev) => 
      (prev + 1) % generatedImages.length
    );
    // 手动切换时暂停自动轮播
    setIsAutoPlaying(false);
  };

  // 切换自动播放状态
  const toggleAutoPlay = () => {
    setIsAutoPlaying(!isAutoPlaying);
  };

  const handleUploadButtonClick = () => {
    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    setError(null);
    fileInputRef.current?.click();
  };

  const handleReferenceImageUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError(t('image.errors.invalidFileType'));
      event.target.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(t('image.errors.fileTooLarge'));
      event.target.value = '';
      return;
    }

    setIsUploadingImage(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload/image', {
        method: 'POST',
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
      console.error('Error uploading reference image:', uploadError);
      setError(getErrorMessage(uploadError, t('image.errors.uploadFailed')));
    } finally {
      setIsUploadingImage(false);
      event.target.value = '';
    }
  };

  const removeReferenceImage = () => {
    setReferenceImageUrl(null);
    setReferenceImageName(null);
    setError(null);
  };

  const handleGenerateImage = async () => {
    if (!imagePrompt.trim() || isGeneratingImage || isUploadingImage) return;

    if (!referenceImageUrl) {
      setError(t('image.errors.missingReferenceImage'));
      return;
    }

    if (!session.data?.user) {
      router.push(`/${locale}/login`);
      return;
    }

    setIsGeneratingImage(true);
    setError(null);
    
    // 创建临时的loading占位图片
    const loadingImage: GenerationResult = {
      id: `loading-${Date.now()}`,
      type: "image",
      prompt: imagePrompt,
      status: "completed",
      createdAt: new Date(),
      size: imageSize,
      isPreset: false,
      sourceImageUrl: referenceImageUrl,
    };
    
    // 清空当前图片列表，只显示loading
    setGeneratedImages([loadingImage]);
    setCurrentImageIndex(0);
    setIsAutoPlaying(false);

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
        size: imageSize,
        isPreset: false,
        sourceImageUrl: data.sourceImageUrl || referenceImageUrl,
      };
      
      // 替换loading图片为真实生成的图片
      setGeneratedImages([newImage]);
      setRemainingCredits(data.remainingCredits);
      setImagePrompt("");
      
    } catch (error: unknown) {
      console.error("Error generating image:", error);
      const message = getErrorMessage(error, "Failed to generate image");
      setError(message);
      
      if (message.includes("credits")) {
        setError(t('insufficientCredits'));
      }
      // 出错时恢复预设图片
      setGeneratedImages(presetImages);
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerateImage();
    }
  };

  const copyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(prompt);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const getSizeDisplay = (size: string) => {
    switch(size) {
      case 'adaptive':
        return t('image.settings.adaptiveSize');
      case '1K': return '1024×1024';
      case '2K': return '2048×2048';
      case '4K': return '4096×4096';
      default: return size;
    }
  };

  const suggestionOptions = [
    { icon: "🎨", key: "portrait" as const },
    { icon: "🏛️", key: "architecture" as const },
    { icon: "🎬", key: "cinematic" as const },
    { icon: "💎", key: "product" as const },
    { icon: "🎭", key: "artistic" as const },
  ];

  const promptSuggestions = suggestionOptions.map((option) => ({
    icon: option.icon,
    text: t(`image.suggestions.${option.key}`),
  }));

  return (
    <div className="relative min-h-screen bg-secondary pt-16">
      <Background />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header with Credits */}
        <div className="pb-4 mb-2">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <ImageIcon className="w-8 h-8" />
              {t('image.title')}
            </h1>
            {remainingCredits !== null && (
              <div className="text-sm text-neutral-600 dark:text-neutral-400">
                {t('credits')}: <span className="font-semibold text-foreground">{remainingCredits}</span>
              </div>
            )}
          </div>
          <p className="text-neutral-600 dark:text-neutral-400">
            {t('image.description')}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Panel - Control Card */}
          <div className="lg:col-span-4">
            <div className="bg-background rounded-xl border border-neutral-200 dark:border-neutral-800" style={{ overflow: 'visible' }}>
              <div className="p-6 space-y-4">
                {/* Prompt Input */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    {t('image.promptLabel')}
                  </label>
                  <textarea
                    value={imagePrompt}
                    onChange={(e) => setImagePrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t('image.promptPlaceholder')}
                    disabled={isGeneratingImage || isUploadingImage}
                    className="w-full h-32 px-4 py-3 bg-secondary border border-neutral-200 dark:border-neutral-800 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-foreground focus:border-transparent transition-all placeholder-neutral-400 dark:placeholder-neutral-600"
                  />
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-neutral-500">
                      {t('image.enterHint')}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {t('image.charCount', { count: imagePrompt.length, max: 2500 })}
                    </span>
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleReferenceImageUpload}
                />

                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    {t('image.reference.label')}
                  </label>
                  <div className="relative group border border-dashed border-neutral-300 dark:border-neutral-700 rounded-xl bg-secondary flex items-center justify-center h-[180px] overflow-hidden">
                    {referenceImageUrl ? (
                      <div className="relative w-full h-full">
                        <Image
                          src={referenceImageUrl}
                          alt={referenceImageName || t('image.reference.previewAlt')}
                          fill
                          sizes="(max-width: 768px) 100vw, 320px"
                          className="object-contain"
                          unoptimized
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 text-white">
                          <p className="text-sm font-medium text-center px-4">
                            {referenceImageName || t('image.reference.previewAlt')}
                          </p>
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={handleUploadButtonClick}
                              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <Upload className="w-4 h-4" />
                              {t('image.reference.replace')}
                            </button>
                            <button
                              type="button"
                              onClick={removeReferenceImage}
                              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600/80 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                              <X className="w-4 h-4" />
                              {t('image.reference.remove')}
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUploadButtonClick}
                        disabled={isUploadingImage || isGeneratingImage}
                        className="w-full h-full flex flex-col items-center justify-center gap-3 px-6 py-8 text-center text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200 transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded-xl"
                      >
                        {isUploadingImage ? (
                          <Loader2 className="w-8 h-8 animate-spin" />
                        ) : (
                          <div className="p-3 bg-secondary rounded-full">
                            <Upload className="w-6 h-6" />
                          </div>
                        )}
                        <div>
                          <p className="text-sm font-medium">{t('image.reference.cta')}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            {t('image.reference.hint')}
                          </p>
                        </div>
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick Prompts */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                    {t('image.suggestionsTitle')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {promptSuggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => setImagePrompt(suggestion.text)}
                        disabled={isGeneratingImage}
                        className="px-3 py-1.5 bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700 rounded-lg text-sm transition-colors flex items-center gap-1.5"
                        title={suggestion.text}
                      >
                        <span>{suggestion.icon}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Settings */}
                <div className="overflow-visible">
                  <button
                    onClick={() => setShowSettings(!showSettings)}
                    className="w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-neutral-700 dark:text-neutral-300 hover:text-foreground transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <Settings2 className="w-4 h-4" />
                      {t('image.settings.title')}
                    </span>
                    <motion.div
                      animate={{ rotate: showSettings ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  </button>

                  <AnimatePresence>
                    {showSettings && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: 'visible' }}
                      >
                        <div className="pt-3 space-y-4">
                          {/* Resolution */}
                          <div>
                            <label className="block text-sm font-medium mb-2 text-neutral-700 dark:text-neutral-300">
                              {t('image.settings.resolution')}
                            </label>
                            <div className="grid grid-cols-3 gap-2">
                              {(['adaptive'] as const).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setImageSize(size)}
                                  className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                                    imageSize === size
                                      ? 'bg-foreground text-background border-foreground'
                                      : 'bg-background text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800'
                                  }`}
                                >
                                  <div className="font-semibold">{size}</div>
                                  <div className="text-xs opacity-70">{getSizeDisplay(size)}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Watermark */}
                          <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-neutral-700 dark:text-neutral-300">
                              {t('image.settings.watermark')}
                            </label>
                            <button
                              onClick={() => setImageWatermark(!imageWatermark)}
                              className={`relative w-11 h-6 rounded-full transition-colors ${
                                imageWatermark ? 'bg-foreground' : 'bg-secondary'
                              }`}
                            >
                              <motion.div
                                animate={{ x: imageWatermark ? 20 : 2 }}
                                transition={{ duration: 0.2 }}
                                className={`absolute top-1 w-4 h-4 rounded-full ${
                                  imageWatermark ? 'bg-background' : 'bg-muted'
                                }`}
                              />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 mt-0.5" />
                    <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                  </motion.div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerateImage}
                  disabled={!imagePrompt.trim() || !referenceImageUrl || isGeneratingImage || isUploadingImage || remainingCredits === 0}
                  className="w-full py-3 flex items-center justify-center gap-2"
                >
                  {isGeneratingImage ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>{t('image.generate.loading')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      <span>{t('image.generate.button')}</span>
                      <span className="ml-auto text-xs opacity-70">{t('image.generate.cost', { amount: imageCost })}</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Right Panel - Carousel Gallery */}
          <div className="lg:col-span-7">
            <div className="bg-background rounded-xl border border-neutral-200 dark:border-neutral-800">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-foreground">
                    {t('image.gallery.title')}
                  </h2>
                  {generatedImages.length > 1 && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={toggleAutoPlay}
                        className="p-2 rounded-lg bg-secondary hover:bg-neutral-200 dark:hover:bg-neutral-700 transition-colors"
                        title={isAutoPlaying ? t('image.gallery.autoplayPause') : t('image.gallery.autoplayStart')}
                      >
                        {isAutoPlaying ? (
                          <Pause className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                        ) : (
                          <Play className="w-4 h-4 text-neutral-700 dark:text-neutral-300" />
                        )}
                      </button>
                      <span className="text-sm text-neutral-500">
                        {currentImageIndex + 1} / {generatedImages.length}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* 轮播展示区 */}
                {generatedImages.length > 0 ? (
                  <div className="relative">
                    {/* 提示词信息 - 移到图片上方 */}
                    <div className="mb-4 p-4 bg-secondary rounded-lg">
                      <p 
                        className="text-sm text-neutral-700 dark:text-neutral-300 mb-2 cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        onClick={() => setImagePrompt(generatedImages[currentImageIndex]?.prompt || "")}
                        title={t('image.gallery.usePromptHint')}
                      >
                        {generatedImages[currentImageIndex]?.prompt}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-neutral-500">
                        {generatedImages[currentImageIndex]?.isPreset ? (
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                            {t('image.gallery.presetBadge')}
                          </span>
                        ) : (
                          <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded">
                            {t('image.gallery.userBadge')}
                          </span>
                        )}
                        {generatedImages[currentImageIndex]?.size && (
                          <span>{getSizeDisplay(generatedImages[currentImageIndex].size!)}</span>
                        )}
                      </div>
                    </div>

                    {/* 主图片展示 - 缩小尺寸 */}
                    <div className="relative aspect-square bg-secondary rounded-lg overflow-hidden max-w-md mx-auto">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={generatedImages[currentImageIndex]?.id}
                          initial={{ opacity: 0, x: 100 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ duration: 0.3 }}
                          className="absolute inset-0"
                        >
                          {isGeneratingImage && !generatedImages[currentImageIndex]?.resultUrl ? (
                            // Loading状态
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <div className="text-center">
                                <Loader2 className="w-12 h-12 animate-spin text-neutral-400 mx-auto mb-3" />
                                <p className="text-neutral-600 dark:text-neutral-400">{t('image.gallery.generating')}</p>
                                <p className="text-xs text-neutral-500 mt-2">{imagePrompt}</p>
                              </div>
                          </div>
                        ) : generatedImages[currentImageIndex]?.resultUrl ? (
                            <Image
                              src={generatedImages[currentImageIndex].resultUrl}
                              alt={generatedImages[currentImageIndex].prompt}
                              fill
                              sizes="(max-width: 1024px) 100vw, 480px"
                              className="object-cover cursor-pointer"
                              onClick={() => setSelectedImage(generatedImages[currentImageIndex])}
                              unoptimized
                            />
                          ) : (
                            // 空状态
                            <div className="w-full h-full flex items-center justify-center bg-secondary">
                              <div className="text-center">
                                <ImageIcon className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
                                <p className="text-neutral-500">{t('image.gallery.noImageAvailable')}</p>
                              </div>
                          </div>
                        )}
                        </motion.div>
                      </AnimatePresence>

                      {/* 左右切换按钮 */}
                      {generatedImages.length > 1 && (
                        <>
                          <button
                            onClick={goToPrevious}
                            className="absolute left-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
                          >
                            <ChevronLeft className="w-5 h-5 text-foreground" />
                          </button>
                          <button
                            onClick={goToNext}
                            className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-background/80 backdrop-blur-sm rounded-lg hover:bg-background transition-colors"
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
                      <ImageIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>{t('image.gallery.empty')}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {selectedImage && selectedImage.resultUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative w-full max-w-5xl max-h-[80vh] h-[80vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={selectedImage.resultUrl}
                alt={selectedImage.prompt}
                fill
                sizes="(max-width: 768px) 100vw, 960px"
                className="object-contain rounded-lg"
                unoptimized
              />
              
              {/* Modal Actions */}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <button
                  onClick={() => copyPrompt(selectedImage.prompt)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                >
                  {copiedPrompt === selectedImage.prompt ? (
                    <Check className="w-5 h-5 text-white" />
                  ) : (
                    <Copy className="w-5 h-5 text-white" />
                  )}
                </button>
                <a
                  href={selectedImage.resultUrl}
                  download={`image-${selectedImage.id}.png`}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <Download className="w-5 h-5 text-white" />
                </a>
                <a
                  href={selectedImage.resultUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <ExternalLink className="w-5 h-5 text-white" />
                </a>
                <button
                  onClick={() => setSelectedImage(null)}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg backdrop-blur-sm transition-colors"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </div>
              
              {/* Modal Info */}
              <div className="absolute bottom-4 left-4 right-4 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                <p className="text-white text-sm mb-2">{selectedImage.prompt}</p>
                <div className="flex items-center gap-4 text-xs text-white/70">
                  <span className="flex items-center gap-1">
                    <Hash className="w-3 h-3" />
                    {selectedImage.id}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(selectedImage.createdAt).toLocaleString()}
                  </span>
                  {selectedImage.size && (
                    <span className="flex items-center gap-1">
                      <Maximize2 className="w-3 h-3" />
                      {getSizeDisplay(selectedImage.size)}
                    </span>
                  )}
                  {selectedImage.sourceImageUrl && (
                    <a
                      href={selectedImage.sourceImageUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 hover:text-white transition-colors"
                    >
                      <ImageIcon className="w-3 h-3" />
                      {t('image.gallery.sourceImage')}
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
