/*
 * è¨­è¨å²å­¸ï¼Maison Noire â æ³å¼ç²¾åæ²é¾ç¾å­¸
 * å½±ççæå¨ï¼åæ­¥é© Tab ä»é¢ï¼é¿åé é¢éé·
 * æ­¥é©ï¼ä¸å³ç§ç â é¢¨æ ¼è¨­å® â å­å¹æµ®æ°´å° â é è¦½ä¸è¼
 */
import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload, X, ImagePlus, Play, Download, ChevronRight, ChevronLeft,
  Info, Film, Palette, Type, Eye, Check, Loader2
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const LOGO_URL = "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/eagle_logo_bfca0274.jpeg";

// Step definitions
const steps = [
  { id: 1, label: "ä¸å³ç§ç", icon: ImagePlus },
  { id: 2, label: "é¢¨æ ¼è¨­å®", icon: Palette },
  { id: 3, label: "å­å¹æµ®æ°´å°", icon: Type },
  { id: 4, label: "é è¦½ä¸è¼", icon: Eye },
];

// Options
const styleTemplates = [
  { id: "black-gold", label: "é»éå¥¢è¯", colors: ["#0A0A0A", "#C4A265"] },
  { id: "white-minimal", label: "ç´ç½æ¥µç°¡", colors: ["#FFFFFF", "#333333"] },
  { id: "dark-grey", label: "æ·±ç°é«ç´", colors: ["#2A2A2A", "#B0B0B0"] },
];

const videoSizes = [
  { id: "9:16", label: "9:16", desc: "éå / Reels" },
  { id: "1:1", label: "1:1", desc: "è²¼æ" },
  { id: "4:5", label: "4:5", desc: "åæ" },
];

const filters = [
  { id: "original", label: "åå" },
  { id: "warm-gold", label: "æéèª¿" },
  { id: "cool-tone", label: "å·èª¿é«ç´" },
  { id: "soft-light", label: "æå" },
  { id: "high-contrast", label: "é«å°æ¯" },
  { id: "vintage", label: "å¾©å¤åºç" },
];

const durations = [
  { id: 5, label: "5 ç§" },
  { id: 10, label: "10 ç§" },
  { id: 15, label: "15 ç§" },
];

const speeds = [
  { id: "slow", label: "æ¢é", desc: "3 ç§/å¼µ" },
  { id: "medium", label: "ä¸­é", desc: "2 ç§/å¼µ" },
  { id: "fast", label: "å¿«é", desc: "1 ç§/å¼µ" },
];

const filterStyles: Record<string, string> = {
  original: "",
  "warm-gold": "sepia(0.3) saturate(1.3) brightness(1.05) hue-rotate(-10deg)",
  "cool-tone": "saturate(0.8) brightness(1.05) hue-rotate(10deg) contrast(1.1)",
  "soft-light": "brightness(1.1) contrast(0.95) saturate(0.9)",
  "high-contrast": "contrast(1.4) saturate(1.1) brightness(0.95)",
  vintage: "sepia(0.4) saturate(0.7) brightness(0.9) contrast(1.1)",
};

export default function VideoMaker() {
  const [currentStep, setCurrentStep] = useState(1);
  const [images, setImages] = useState<{ file: File; url: string }[]>([]);
  const [style, setStyle] = useState("black-gold");
  const [size, setSize] = useState("9:16");
  const [filter, setFilter] = useState("original");
  const [duration, setDuration] = useState(10);
  const [speed, setSpeed] = useState("medium");
  const [line1, setLine1] = useState("");
  const [line2, setLine2] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [colorLock, setColorLock] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewReady, setPreviewReady] = useState(false);
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const previewIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleFileUpload = useCallback((files: FileList | null) => {
    if (!files) return;
    const newImages = Array.from(files)
      .filter((f) => f.type.startsWith("image/"))
      .map((file) => ({ file, url: URL.createObjectURL(file) }));
    setImages((prev) => [...prev, ...newImages]);
  }, []);

  const removeImage = (index: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[index].url);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canProceed = () => {
    if (currentStep === 1) return images.length > 0;
    return true;
  };

  // Preview slideshow
  useEffect(() => {
    if (currentStep === 4 && images.length > 0) {
      const speedMs = speed === "slow" ? 3000 : speed === "medium" ? 2000 : 1000;
      previewIntervalRef.current = setInterval(() => {
        setCurrentPreviewIndex((prev) => (prev + 1) % images.length);
      }, speedMs);
      return () => {
        if (previewIntervalRef.current) clearInterval(previewIntervalRef.current);
      };
    }
  }, [currentStep, images.length, speed]);

  const handleGenerate = async () => {
    setGenerating(true);
    setProgress(0);
    // Simulate generation progress
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);

    setTimeout(() => {
      clearInterval(interval);
      setProgress(100);
      setTimeout(() => {
        setGenerating(false);
        setPreviewReady(true);
        toast.success("å½±ççæå®æï¼");
      }, 500);
    }, 3000);
  };

  const handleDownload = () => {
    // Generate a canvas-based video frame as demo
    const canvas = document.createElement("canvas");
    const sizeMap: Record<string, [number, number]> = {
      "9:16": [1080, 1920],
      "1:1": [1080, 1080],
      "4:5": [1080, 1350],
    };
    const [w, h] = sizeMap[size] || [1080, 1920];
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const styleColors = styleTemplates.find((s) => s.id === style);
    ctx.fillStyle = styleColors?.colors[0] || "#0A0A0A";
    ctx.fillRect(0, 0, w, h);

    // Draw first image if available
    if (images.length > 0) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const scale = Math.max(w / img.width, h / img.height);
        const sw = img.width * scale;
        const sh = img.height * scale;
        ctx.drawImage(img, (w - sw) / 2, (h - sh) / 2, sw, sh);

        // Apply filter overlay
        if (!colorLock && filter === "warm-gold") {
          ctx.fillStyle = "rgba(196, 162, 101, 0.15)";
          ctx.fillRect(0, 0, w, h);
        }

        // Draw subtitle
        if (line1 || line2) {
          ctx.fillStyle = "rgba(0,0,0,0.5)";
          ctx.fillRect(0, h - 200, w, 200);
          ctx.fillStyle = styleColors?.colors[1] || "#C4A265";
          ctx.font = `bold ${Math.round(w * 0.04)}px 'Noto Serif TC', serif`;
          ctx.textAlign = "center";
          if (line1) ctx.fillText(line1, w / 2, h - 130);
          if (line2) {
            ctx.font = `${Math.round(w * 0.03)}px 'Noto Sans TC', sans-serif`;
            ctx.fillText(line2, w / 2, h - 80);
          }
        }

        // Watermark
        if (watermark) {
          ctx.globalAlpha = 0.3;
          ctx.fillStyle = "#FFFFFF";
          ctx.font = `${Math.round(w * 0.025)}px 'Noto Sans TC', sans-serif`;
          ctx.textAlign = "right";
          ctx.fillText("ä¼æåå¤ç²¾åä»£è³¼", w - 30, 50);
          ctx.globalAlpha = 1;
        }

        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `eagle_video_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("å·²ä¸è¼é è¦½å¹ï¼");
          }
        }, "image/png");
      };
      img.src = images[0].url;
    }
  };

  const getPreviewAspect = () => {
    switch (size) {
      case "9:16": return "aspect-[9/16]";
      case "1:1": return "aspect-square";
      case "4:5": return "aspect-[4/5]";
      default: return "aspect-[9/16]";
    }
  };

  const getStyleBg = () => {
    const s = styleTemplates.find((t) => t.id === style);
    return s?.colors[0] || "#0A0A0A";
  };

  const getStyleAccent = () => {
    const s = styleTemplates.find((t) => t.id === style);
    return s?.colors[1] || "#C4A265";
  };

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Film size={20} className="text-[oklch(0.72_0.08_75)]" />
            <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.12em] text-[oklch(0.92_0.01_80)]">
              å½±ççæå¨
            </h1>
          </div>
          <div className="gold-divider max-w-[80px] mx-auto mb-4" />
          <p className="text-[oklch(0.55_0.02_60)] text-sm tracking-[0.05em]">
            ä¸å³ååç§çï¼çæç²¾åè³ªæçç¤¾ç¾¤å½±ç
          </p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-10 sm:mb-14">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={() => {
                  if (step.id <= currentStep || (step.id === currentStep + 1 && canProceed())) {
                    setCurrentStep(step.id);
                  }
                }}
                className={`flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2.5 rounded-sm transition-all duration-300 text-xs sm:text-sm tracking-[0.05em] ${
                  currentStep === step.id
                    ? "bg-[oklch(0.72_0.08_75/12%)] border border-[oklch(0.72_0.08_75/40%)] text-[oklch(0.72_0.08_75)]"
                    : step.id < currentStep
                    ? "text-[oklch(0.72_0.08_75/70%)] border border-transparent"
                    : "text-[oklch(0.4_0.02_60)] border border-transparent"
                }`}
              >
                {step.id < currentStep ? (
                  <Check size={14} className="text-[oklch(0.72_0.08_75)]" />
                ) : (
                  <step.icon size={14} />
                )}
                <span className="hidden sm:inline">{step.label}</span>
                <span className="sm:hidden">{step.id}</span>
              </button>
              {i < steps.length - 1 && (
                <div className={`w-6 sm:w-10 h-[1px] ${
                  step.id < currentStep ? "bg-[oklch(0.72_0.08_75/40%)]" : "bg-[oklch(0.25_0.01_65/30%)]"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="animate-fade-in">
            {/* Step 1: Upload */}
            {currentStep === 1 && (
              <div className="max-w-3xl mx-auto">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => { e.preventDefault(); e.stopPropagation(); handleFileUpload(e.dataTransfer.files); }}
                  className="luxury-card rounded-sm p-12 sm:p-16 text-center cursor-pointer group"
                >
                  <Upload size={32} className="mx-auto mb-4 text-[oklch(0.72_0.08_75/60%)] group-hover:text-[oklch(0.72_0.08_75)] transition-colors" />
                  <p className="text-[oklch(0.7_0.01_80)] text-sm mb-2 tracking-[0.05em]">
                    é»ææææ³ä¸å³ååç§ç
                  </p>
                  <p className="text-[oklch(0.4_0.02_60)] text-xs tracking-[0.03em]">
                    æ¯æ´ JPGãPNG æ ¼å¼ï¼å¯ä¸å³å¤å¼µ
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </div>

                {images.length > 0 && (
                  <div className="mt-8">
                    <p className="text-[oklch(0.6_0.02_60)] text-xs mb-4 tracking-[0.1em]">
                      å·²ä¸å³ {images.length} å¼µç§ç
                    </p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                      {images.map((img, i) => (
                        <div key={i} className="relative group aspect-square rounded-sm overflow-hidden border border-[oklch(0.72_0.08_75/15%)]">
                          <img src={img.url} alt="" className="w-full h-full object-cover" />
                          <button
                            onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                            className="absolute top-1 right-1 p-1 bg-[oklch(0.1_0.005_60/80%)] rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X size={12} className="text-[oklch(0.72_0.08_75)]" />
                          </button>
                          <div className="absolute bottom-1 left-1 text-[10px] text-[oklch(0.72_0.08_75/80%)] bg-[oklch(0.1_0.005_60/80%)] px-1.5 py-0.5 rounded-sm">
                            {i + 1}
                          </div>
                        </div>
                      ))}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="aspect-square rounded-sm border border-dashed border-[oklch(0.72_0.08_75/20%)] flex items-center justify-center hover:border-[oklch(0.72_0.08_75/40%)] transition-colors"
                      >
                        <ImagePlus size={20} className="text-[oklch(0.4_0.02_60)]" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 2: Style Settings */}
            {currentStep === 2 && (
              <div className="max-w-3xl mx-auto space-y-10">
                {/* Style Template */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)]">é¢¨æ ¼æ¨¡æ¿</h3>
                    <Tooltip>
                      <TooltipTrigger><Info size={13} className="text-[oklch(0.4_0.02_60)]" /></TooltipTrigger>
                      <TooltipContent className="bg-[oklch(0.18_0.005_60)] border-[oklch(0.72_0.08_75/20%)] text-[oklch(0.82_0.01_80)]">
                        <p className="text-xs">é¸æå½±ççæ´é«è²èª¿é¢¨æ ¼</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {styleTemplates.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => setStyle(t.id)}
                        className={`p-4 rounded-sm border transition-all duration-300 text-center ${
                          style === t.id
                            ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                            : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                        }`}
                      >
                        <div className="flex gap-1 justify-center mb-2">
                          {t.colors.map((c, i) => (
                            <div key={i} className="w-5 h-5 rounded-full border border-[oklch(0.3_0.01_60)]" style={{ background: c }} />
                          ))}
                        </div>
                        <span className="text-xs tracking-[0.08em] text-[oklch(0.7_0.01_80)]">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Video Size */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)]">è¦é »å°ºå¯¸</h3>
                    <Tooltip>
                      <TooltipTrigger><Info size={13} className="text-[oklch(0.4_0.02_60)]" /></TooltipTrigger>
                      <TooltipContent className="bg-[oklch(0.18_0.005_60)] border-[oklch(0.72_0.08_75/20%)] text-[oklch(0.82_0.01_80)]">
                        <p className="text-xs">é¸æé©åç¼ä½å¹³å°çå°ºå¯¸</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {videoSizes.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => setSize(s.id)}
                        className={`p-4 rounded-sm border transition-all duration-300 text-center ${
                          size === s.id
                            ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                            : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                        }`}
                      >
                        <span className="block text-sm font-medium text-[oklch(0.82_0.01_80)] mb-1">{s.label}</span>
                        <span className="text-[10px] text-[oklch(0.5_0.02_60)]">{s.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Filter */}
                <div>
                  <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">æ¿¾é¡ææ</h3>
                  <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                    {filters.map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`p-3 rounded-sm border transition-all duration-300 text-center ${
                          filter === f.id
                            ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                            : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                        }`}
                      >
                        {images.length > 0 && (
                          <div className="w-full aspect-square rounded-sm overflow-hidden mb-2">
                            <img
                              src={images[0].url}
                              alt=""
                              className="w-full h-full object-cover"
                              style={{ filter: filterStyles[f.id] }}
                            />
                          </div>
                        )}
                        <span className="text-[10px] tracking-[0.05em] text-[oklch(0.7_0.01_80)]">{f.label}</span>
                      </button>
                    ))}
                  </div>
                </div>


                {/* 原色鎖定 */}
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)]">原色鎖定</h3>
                    <Tooltip>
                      <TooltipTrigger><Info size={13} className="text-[oklch(0.4_0.02_60)]" /></TooltipTrigger>
                      <TooltipContent className="bg-[oklch(0.18_0.005_60)] border-[oklch(0.72_0.08_75/20%)] text-[oklch(0.82_0.01_80)]">
                        <p className="text-xs">開啟後保留商品原始色彩，僅套用背景與邊框風格，適合對色號敏感的精品（如 Hermès）</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <button
                    onClick={() => setColorLock(!colorLock)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm border transition-all duration-300 w-full ${
                      colorLock
                        ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/30%)]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                      colorLock ? "border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75)]" : "border-[oklch(0.4_0.02_60)]"
                    }`}>
                      {colorLock && <Check size={10} className="text-[oklch(0.1_0.005_60)]" />}
                    </div>
                    <div className="text-left">
                      <span className="text-xs text-[oklch(0.7_0.01_80)] tracking-[0.05em] block">
                        保留商品原色（不套用濾鏡）
                      </span>
                      <span className="text-[10px] text-[oklch(0.45_0.02_60)]">
                        推薦用於 Hermès、Chanel 等色號敏感商品
                      </span>
                    </div>
                  </button>
                  {colorLock && filter !== "original" && (
                    <p className="text-[10px] text-[oklch(0.72_0.08_75/70%)] mt-2 tracking-[0.03em]">
                      ✦ 已鎖定原色 — 濾鏡效果將不會套用到商品照片上
                    </p>
                  )}
                </div>

                {/* Duration & Speed */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">è¦é »é·åº¦</h3>
                    <div className="flex gap-3">
                      {durations.map((d) => (
                        <button
                          key={d.id}
                          onClick={() => setDuration(d.id)}
                          className={`flex-1 py-3 rounded-sm border transition-all duration-300 text-center text-xs tracking-[0.05em] ${
                            duration === d.id
                              ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)] text-[oklch(0.72_0.08_75)]"
                              : "border-[oklch(0.25_0.01_65/30%)] text-[oklch(0.6_0.02_60)] hover:border-[oklch(0.72_0.08_75/30%)]"
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">åæéåº¦</h3>
                    <div className="flex gap-3">
                      {speeds.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setSpeed(s.id)}
                          className={`flex-1 py-3 rounded-sm border transition-all duration-300 text-center ${
                            speed === s.id
                              ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                              : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                          }`}
                        >
                          <span className="block text-xs text-[oklch(0.7_0.01_80)]">{s.label}</span>
                          <span className="text-[10px] text-[oklch(0.45_0.02_60)]">{s.desc}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Subtitle & Watermark */}
            {currentStep === 3 && (
              <div className="max-w-3xl mx-auto space-y-8">
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)]">å­å¹è¨­ç½®</h3>
                    <Tooltip>
                      <TooltipTrigger><Info size={13} className="text-[oklch(0.4_0.02_60)]" /></TooltipTrigger>
                      <TooltipContent className="bg-[oklch(0.18_0.005_60)] border-[oklch(0.72_0.08_75/20%)] text-[oklch(0.82_0.01_80)]">
                        <p className="text-xs">èªè¨å©è¡å­å¹ï¼å°é¡¯ç¤ºå¨å½±çåºé¨</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-[oklch(0.5_0.02_60)] mb-2 tracking-[0.08em]">ç¬¬ä¸è¡ï¼ä¸»æ¨é¡ï¼</label>
                      <input
                        type="text"
                        value={line1}
                        onChange={(e) => setLine1(e.target.value)}
                        placeholder="ä¾ï¼å¨æ° Chanel Classic Flap"
                        className="w-full bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-4 py-3 text-sm text-[oklch(0.92_0.01_80)] placeholder:text-[oklch(0.35_0.02_60)] focus:border-[oklch(0.72_0.08_75/50%)] focus:outline-none transition-colors tracking-[0.03em]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-[oklch(0.5_0.02_60)] mb-2 tracking-[0.08em]">ç¬¬äºè¡ï¼å¯æ¨é¡ï¼</label>
                      <input
                        type="text"
                        value={line2}
                        onChange={(e) => setLine2(e.target.value)}
                        placeholder="ä¾ï¼ééæ¬¾ Â· éå¨å¥éä»¶"
                        className="w-full bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-4 py-3 text-sm text-[oklch(0.92_0.01_80)] placeholder:text-[oklch(0.35_0.02_60)] focus:border-[oklch(0.72_0.08_75/50%)] focus:outline-none transition-colors tracking-[0.03em]"
                      />
                    </div>
                  </div>
                </div>

                {/* Watermark Toggle */}
                <div>
                  <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">æµ®æ°´å°</h3>
                  <button
                    onClick={() => setWatermark(!watermark)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-sm border transition-all duration-300 ${
                      watermark
                        ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/30%)]"
                    }`}
                  >
                    <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-all ${
                      watermark ? "border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75)]" : "border-[oklch(0.4_0.02_60)]"
                    }`}>
                      {watermark && <Check size={10} className="text-[oklch(0.1_0.005_60)]" />}
                    </div>
                    <span className="text-xs text-[oklch(0.7_0.01_80)] tracking-[0.05em]">
                      èªåæ·»å ãä¼æåå¤ç²¾åä»£è³¼ãæµ®æ°´å°
                    </span>
                  </button>
                </div>

                {/* Subtitle Preview */}
                <div>
                  <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">å­å¹é è¦½</h3>
                  <div
                    className="rounded-sm overflow-hidden relative"
                    style={{ background: getStyleBg() }}
                  >
                    <div className={`${getPreviewAspect()} max-h-[300px] w-auto mx-auto relative`}>
                      {images.length > 0 && (
                        <img
                          src={images[0].url}
                          alt=""
                          className="w-full h-full object-cover"
                          style={{ filter: colorLock ? "" : filterStyles[filter] }}
                        />
                      )}
                      {(line1 || line2) && (
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6">
                          {line1 && (
                            <p className="font-serif text-sm sm:text-base tracking-[0.1em] mb-1" style={{ color: getStyleAccent() }}>
                              {line1}
                            </p>
                          )}
                          {line2 && (
                            <p className="text-xs sm:text-sm tracking-[0.05em] text-white/80">
                              {line2}
                            </p>
                          )}
                        </div>
                      )}
                      {watermark && (
                        <div className="absolute top-3 right-3 text-white/30 text-[10px] tracking-[0.05em]">
                          ä¼æåå¤ç²¾åä»£è³¼
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Preview & Download */}
            {currentStep === 4 && (
              <div className="max-w-4xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                  {/* Color Lock Comparison */}
                  {colorLock && filter !== "original" && (
                    <div className="lg:col-span-5 mb-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-sm bg-[oklch(0.72_0.08_75/10%)] border border-[oklch(0.72_0.08_75/30%)]">
                          <Check size={12} className="text-[oklch(0.72_0.08_75)]" />
                          <span className="text-xs text-[oklch(0.72_0.08_75)] tracking-[0.08em]">原色鎖定已啟用</span>
                        </div>
                        <span className="text-[10px] text-[oklch(0.45_0.02_60)]">商品照片保持原始色彩，背景與字幕仍套用所選風格</span>
                      </div>
                    </div>
                  )}

                  {/* Preview Area */}
                  <div className="lg:col-span-3">
                    <div
                      className="rounded-sm overflow-hidden relative mx-auto"
                      style={{ background: getStyleBg(), maxWidth: size === "9:16" ? "320px" : size === "1:1" ? "400px" : "360px" }}
                    >
                      <div className={`${getPreviewAspect()} relative overflow-hidden`}>
                        {images.length > 0 && (
                          <img
                            src={images[currentPreviewIndex]?.url}
                            alt=""
                            className="absolute inset-0 w-full h-full object-cover animate-fade-in"
                            style={{ filter: colorLock ? "" : filterStyles[filter] }}
                          />
                        )}

                        {(line1 || line2) && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4 sm:p-6 z-10">
                            {line1 && (
                              <p className="font-serif text-sm sm:text-base tracking-[0.1em] mb-1" style={{ color: getStyleAccent() }}>
                                {line1}
                              </p>
                            )}
                            {line2 && (
                              <p className="text-xs sm:text-sm tracking-[0.05em] text-white/80">
                                {line2}
                              </p>
                            )}
                          </div>
                        )}

                        {watermark && (
                          <div className="absolute top-3 right-3 text-white/30 text-[10px] tracking-[0.05em] z-10">
                            ä¼æåå¤ç²¾åä»£è³¼
                          </div>
                        )}

                        {/* Photo counter */}
                        <div className="absolute top-3 left-3 text-white/50 text-[10px] bg-black/40 px-2 py-1 rounded-sm z-10">
                          {currentPreviewIndex + 1} / {images.length}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Settings Summary & Actions */}
                  <div className="lg:col-span-2 space-y-6">
                    <div className="luxury-card rounded-sm p-6">
                      <h3 className="text-sm tracking-[0.1em] text-[oklch(0.72_0.08_75)] mb-4 font-serif">è¨­å®æè¦</h3>
                      <div className="space-y-3 text-xs">
                        <div className="flex justify-between">
                          <span className="text-[oklch(0.5_0.02_60)]">ç§çæ¸é</span>
                          <span className="text-[oklch(0.82_0.01_80)]">{images.length} å¼µ</span>
                        </div>
                        <div className="gold-divider" />
                        <div className="flex justify-between">
                          <span className="text-[oklch(0.5_0.02_60)]">é¢¨æ ¼æ¨¡æ¿</span>
                          <span className="text-[oklch(0.82_0.01_80)]">{styleTemplates.find(s => s.id === style)?.label}</span>
                        </div>
                        <div className="gold-divider" />
                        <div className="flex justify-between">
                          <span className="text-[oklch(0.5_0.02_60)]">è¦é »å°ºå¯¸</span>
                          <span className="text-[oklch(0.82_0.01_80)]">{size} ({videoSizes.find(s => s.id === size)?.desc})</span>
                        </div>
                        <div className="gold-divider" />
                        <div className="flex justify-between">
                          <span className="text-[oklch(0.5_0.02_60)]">æ¿¾é¡</span>
                          <span className="text-[oklch(0.82_0.01_80)]">{filters.find(f => f.id === filter)?.label}</span>
                        </div>
                        <div className="gold-divider" />
                        <div className="flex justify-between">
                          <span className="text-[oklch(0.5_0.02_60)]">é·åº¦ / éåº¦</span>
                          <span className="text-[oklch(0.82_0.01_80)]">{duration}ç§ / {speeds.find(s => s.id === speed)?.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Generate Button */}
                    {!previewReady && !generating && (
                      <button
                        onClick={handleGenerate}
                        className="w-full btn-luxury-filled py-4 rounded-sm text-sm tracking-[0.1em] flex items-center justify-center gap-2"
                      >
                        <Play size={16} />
                        çæå½±ç
                      </button>
                    )}

                    {/* Progress */}
                    {generating && (
                      <div className="luxury-card rounded-sm p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <Loader2 size={16} className="animate-spin text-[oklch(0.72_0.08_75)]" />
                          <span className="text-xs text-[oklch(0.72_0.08_75)] tracking-[0.1em]">çæä¸­...</span>
                        </div>
                        <div className="w-full h-1 bg-[oklch(0.2_0.005_60)] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-[oklch(0.62_0.07_70)] to-[oklch(0.72_0.08_75)]"
                            style={{ width: `${Math.min(progress, 100)}%`, transition: "width 0.3s ease" }}
                          />
                        </div>
                        <p className="text-[10px] text-[oklch(0.45_0.02_60)] mt-2 tracking-[0.05em]">
                          {progress < 30 ? "æ­£å¨èçç§ç..." : progress < 60 ? "å¥ç¨æ¿¾é¡èé¢¨æ ¼..." : progress < 90 ? "çæè½å ´ææ..." : "å³å°å®æ..."}
                        </p>
                      </div>
                    )}

                    {/* Download */}
                    {previewReady && (
                      <div className="space-y-3">
                        <button
                          onClick={handleDownload}
                          className="w-full btn-luxury-filled py-4 rounded-sm text-sm tracking-[0.1em] flex items-center justify-center gap-2"
                        >
                          <Download size={16} />
                          ä¸è¼å½±çé è¦½å¹
                        </button>
                        <button
                          onClick={() => { setPreviewReady(false); setGenerating(false); setProgress(0); }}
                          className="w-full btn-luxury py-3 rounded-sm text-xs tracking-[0.1em]"
                        >
                          éæ°çæ
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between items-center mt-12 max-w-3xl mx-auto">
          <button
            onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
            disabled={currentStep === 1}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs tracking-[0.1em] transition-all duration-300 ${
              currentStep === 1
                ? "text-[oklch(0.3_0.02_60)] cursor-not-allowed"
                : "btn-luxury"
            }`}
          >
            <ChevronLeft size={14} />
            ä¸ä¸æ­¥
          </button>
          {currentStep < 4 && (
            <button
              onClick={() => {
                if (canProceed()) setCurrentStep((prev) => Math.min(4, prev + 1));
                else toast.error("è«åä¸å³è³å°ä¸å¼µç§ç");
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-sm text-xs tracking-[0.1em] btn-luxury-filled"
            >
              ä¸ä¸æ­¥
              <ChevronRight size={14} />
            </button>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
