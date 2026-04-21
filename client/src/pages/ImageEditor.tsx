/*
 * 設計哲學：Maison Noire — 法式精品沙龍美學
 * 圖片處理器：AI 去背 + 精品奢華背景合成
 * 三步驟流程：上傳 → 選背景 → 生成下載
 */
import { useState, useCallback, useRef } from "react";
import {
  ImageIcon, Upload, Download, Sparkles, Check,
  RefreshCw, ChevronRight, Loader2, X, Plus
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const BACKGROUNDS = [
  {
    id: "marble-white",
    label: "白色大理石",
    desc: "卡拉拉白大理石，金色紋路",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_marble_white-BGHnRRybXmmueuhwwJFwKX.webp",
  },
  {
    id: "marble-black",
    label: "黑金大理石",
    desc: "黑色大理石，金色脈絡",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_marble_black-57bvWomPhVJvwBuwkr9TC3.webp",
  },
  {
    id: "velvet-black",
    label: "黑色絲絨",
    desc: "深邃黑絲絨，珠寶首選",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_velvet_black-dvDkzftxH9z43BU6eqbnBm.webp",
  },
  {
    id: "velvet-deep-blue",
    label: "深藍絲絨",
    desc: "皇家深藍，高貴典雅",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_velvet_navy-QkZQ7RrD2iKjdhBA5T5j9x.webp",
  },
  {
    id: "gold-bokeh",
    label: "金色光暈",
    desc: "香檳金散景，夢幻奢華",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_gold_bokeh-5Mn5FqVfLUr7aELmkPMebc.webp",
  },
  {
    id: "champagne-silk",
    label: "香檳絲綢",
    desc: "流動絲綢，柔美精緻",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_champagne_silk-HaaaFqSfq6BZrpXM3fgSzN.webp",
  },
  {
    id: "dark-wood",
    label: "深色胡桃木",
    desc: "深色木紋，沉穩奢華",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_dark_wood-Cgimkp2EgQpmotzmrMjSuQ.webp",
  },
  {
    id: "mirror-reflection",
    label: "鏡面反射",
    desc: "光滑鏡面，倒影效果",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_mirror-frCkNSbVJfKh2aWqCL46We.webp",
  },
  {
    id: "rose-petal",
    label: "玫瑰花瓣",
    desc: "浪漫玫瑰，奢華氛圍",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_rose_petal-TWBBFJ5bq7BC28iDJSbceT.webp",
  },
  {
    id: "crystal-light",
    label: "水晶光折射",
    desc: "稜鏡彩光，珠寶質感",
    preview: "https://d2xsxph8kpxj0f.cloudfront.net/310419663032574653/TQrqsbkh3SJSTJxbPSvnyQ/bg_crystal-YhpZPB5Zh54dMvVHrvVi9B.webp",
  },
];

// 預設背景庫（商品棚拍模式用）
const PRESET_BACKGROUNDS = [
  { id: 'marble-white', label: '白大理石', url: 'https://images.unsplash.com/photo-1615876234886-fd9a39fda97f?w=1024&q=80&fit=crop' },
  { id: 'marble-grey', label: '灰大理石', url: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1024&q=80&fit=crop' },
  { id: 'wood-light', label: '淺木桌', url: 'https://images.unsplash.com/photo-1528323273322-d81458248d40?w=1024&q=80&fit=crop' },
  { id: 'wood-dark', label: '深木桌', url: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=1024&q=80&fit=crop' },
  { id: 'concrete', label: '水泥', url: 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=1024&q=80&fit=crop' },
  { id: 'linen', label: '亞麻布', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1024&q=80&fit=crop' },
  { id: 'black-studio', label: '黑色棚', url: 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1024&q=80&fit=crop' },
  { id: 'white-studio', label: '白色棚', url: 'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=1024&q=80&fit=crop' },
  { id: 'pastel-pink', label: '粉色系', url: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?w=1024&q=80&fit=crop' },
  { id: 'ai-generate', label: 'AI生成', url: null },
] as const;

type PresetBgId = typeof PRESET_BACKGROUNDS[number]['id'];

const STEPS = ["上傳商品圖", "選擇背景", "生成下載"];

export default function ImageEditor() {
  const [step, setStep] = useState(0);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMime, setOriginalMime] = useState("image/jpeg");
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [colorLock, setColorLock] = useState(false);
  const [mode, setMode] = useState<"product" | "lifestyle">("product");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 背景選擇器 state（商品棚拍模式）
  // bgSource: 'preset' = 選了預設庫其中一張；'upload' = 上傳了自訂背景
  const [bgSource, setBgSource] = useState<'preset' | 'upload'>('preset');
  const [selectedPresetBg, setSelectedPresetBg] = useState<PresetBgId>('ai-generate');
  const [customBgBase64, setCustomBgBase64] = useState<string | null>(null);
  const [presetBgLoading, setPresetBgLoading] = useState<string | null>(null); // 正在載入的預設背景 id
  const bgUploadRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("請上傳圖片檔案");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("圖片大小請勿超過 8MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      setOriginalImage(base64);
      setOriginalMime(file.type);
      setStep(1);
      setResultUrl(null);
      setSelectedBg(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  // Canvas 合成：把透明去背商品疊在 AI 背景上
  const compositeOnCanvas = async (cutoutBase64: string, backgroundBase64: string): Promise<string> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext("2d")!;

      const bgImg = new Image();
      const cutoutImg = new Image();

      bgImg.onload = () => {
        ctx.drawImage(bgImg, 0, 0, 1024, 1024);

        cutoutImg.onload = () => {
          // 商品保持原比例、留 10% 邊距、置中
          const padding = 0.1;
          const maxSize = 1024 * (1 - padding * 2);
          const scale = Math.min(maxSize / cutoutImg.width, maxSize / cutoutImg.height);
          const w = cutoutImg.width * scale;
          const h = cutoutImg.height * scale;
          const x = (1024 - w) / 2;
          const y = (1024 - h) / 2;
          ctx.drawImage(cutoutImg, x, y, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        cutoutImg.onerror = () => reject(new Error("商品圖載入失敗"));
        cutoutImg.src = `data:image/png;base64,${cutoutBase64}`;
      };
      bgImg.onerror = () => reject(new Error("背景圖載入失敗"));
      bgImg.src = `data:image/jpeg;base64,${backgroundBase64}`;
    });
  };

  const applyBgMutation = trpc.imageProcessor.applyLuxuryBackground.useMutation({
    onSuccess: async (data) => {
      if (data.useCanvas && data.cutoutBase64 && data.backgroundBase64) {
        // 商品棚拍模式：Canvas 合成（文字 100% 保留）
        try {
          const composited = await compositeOnCanvas(data.cutoutBase64, data.backgroundBase64);
          setResultUrl(composited);
          setStep(2);
          toast.success("✨ 合成完成！商品文字完整保留");
        } catch (err) {
          toast.error("Canvas 合成失敗：" + String(err));
        }
      } else if (data.imageBase64) {
        // 情境生活照模式：直接顯示 AI 生成結果
        setResultUrl(`data:image/jpeg;base64,${data.imageBase64}`);
        setStep(2);
        if (data.usedFallback) {
          toast.success("圖片已生成！（使用備用 AI 方案）");
        } else {
          toast.success("✨ Imagen 3 AI 圖片已生成！");
        }
      } else {
        setResultUrl(null);
        setStep(2);
      }
    },
    onError: (err) => {
      toast.error("生成失敗：" + err.message);
    },
  });

  const handleGenerate = () => {
    if (!originalImage || !selectedBg) {
      toast.error("請先選擇背景風格");
      return;
    }
    applyBgMutation.mutate({
      imageBase64: originalImage,
      mimeType: originalMime as "image/jpeg" | "image/png",
      backgroundStyle: selectedBg as Parameters<typeof applyBgMutation.mutate>[0]["backgroundStyle"],
      colorLock,
      mode,
      // 有自訂背景（預設庫非AI生成 或 上傳）才傳；選 AI生成 時傳 undefined
      customBackgroundBase64: (bgSource === 'preset' && selectedPresetBg === 'ai-generate') ? undefined : (customBgBase64 ?? undefined),
    });
  };

  const handleDownload = async () => {
    if (!resultUrl) return;
    try {
      const a = document.createElement("a");
      a.href = resultUrl;
      a.download = `eagle-luxury-${Date.now()}.jpg`;
      a.click();
      toast.success("圖片已下載！");
    } catch {
      toast.error("下載失敗，請重試");
    }
  };

  const handleReset = () => {
    setStep(0);
    setOriginalImage(null);
    setSelectedBg(null);
    setResultUrl(null);
    setMode("product");
    setBgSource('preset');
    setSelectedPresetBg('ai-generate');
    setCustomBgBase64(null);
    setPresetBgLoading(null);
  };

  // 選擇預設背景 → fetch URL → 轉 base64
  const handleSelectPresetBg = useCallback(async (bgId: PresetBgId) => {
    setBgSource('preset');
    setSelectedPresetBg(bgId);
    const preset = PRESET_BACKGROUNDS.find(b => b.id === bgId);
    if (!preset || preset.url === null) {
      // AI 生成模式，清除自訂背景
      setCustomBgBase64(null);
      return;
    }
    setPresetBgLoading(bgId);
    try {
      const res = await fetch(preset.url);
      const blob = await res.blob();
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(',')[1];
        setCustomBgBase64(base64);
        setPresetBgLoading(null);
      };
      reader.readAsDataURL(blob);
    } catch {
      toast.error("背景圖載入失敗，請重試");
      setPresetBgLoading(null);
    }
  }, []);

  // 上傳自訂背景
  const handleBgUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error("請上傳圖片檔案");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const base64 = dataUrl.split(',')[1];
      setCustomBgBase64(base64);
      setBgSource('upload');
    };
    reader.readAsDataURL(file);
  }, []);

  const isGenerating = applyBgMutation.isPending;

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className="text-center mb-10 sm:mb-14 animate-fade-in-up"
        >
          <div className="flex items-center justify-center gap-3 mb-4">
            <ImageIcon size={20} className="text-[oklch(0.72_0.08_75)]" />
            <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.12em] text-[oklch(0.92_0.01_80)]">
              圖片處理器
            </h1>
          </div>
          <div className="gold-divider max-w-[80px] mx-auto mb-4" />
          <p className="text-[oklch(0.55_0.02_60)] text-sm tracking-[0.05em]">
            AI 智慧去背，換上精品奢華背景，讓商品圖片瞬間升級
          </p>
        </div>

        {/* Step Indicator */}
        <div
          className="flex items-center justify-center gap-0 mb-10 animate-fade-in"
          style={{ animationDelay: "0.2s" }}
        >
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-500 ${
                    i < step
                      ? "bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)]"
                      : i === step
                      ? "border border-[oklch(0.72_0.08_75)] text-[oklch(0.72_0.08_75)]"
                      : "border border-[oklch(0.25_0.01_65/30%)] text-[oklch(0.4_0.02_60)]"
                  }`}
                >
                  {i < step ? <Check size={14} /> : i + 1}
                </div>
                <span
                  className={`text-[10px] mt-1.5 tracking-[0.05em] whitespace-nowrap ${
                    i === step ? "text-[oklch(0.72_0.08_75)]" : "text-[oklch(0.4_0.02_60)]"
                  }`}
                >
                  {s}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 sm:w-24 h-[1px] mb-4 mx-2 transition-all duration-500 ${
                    i < step ? "bg-[oklch(0.72_0.08_75/60%)]" : "bg-[oklch(0.25_0.01_65/30%)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Main Content */}
        {/* STEP 0: Upload */}
          {step === 0 && (
            <div
              className="animate-fade-in-up"
            >
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`luxury-card rounded-sm cursor-pointer transition-all duration-300 ${
                  isDragging
                    ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/5%)]"
                    : "hover:border-[oklch(0.72_0.08_75/30%)]"
                }`}
                style={{ minHeight: "320px", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                <div className="text-center py-16 px-8">
                  <div className="w-16 h-16 rounded-full border border-[oklch(0.72_0.08_75/30%)] flex items-center justify-center mx-auto mb-6">
                    <Upload size={24} className="text-[oklch(0.72_0.08_75/60%)]" />
                  </div>
                  <h3 className="font-serif text-lg text-[oklch(0.82_0.01_80)] mb-3 tracking-[0.08em]">
                    上傳商品圖片
                  </h3>
                  <p className="text-[oklch(0.45_0.02_60)] text-sm mb-2">
                    拖曳或點擊上傳
                  </p>
                  <p className="text-[oklch(0.35_0.02_60)] text-xs">
                    支援 JPG、PNG，最大 8MB
                  </p>
                </div>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file);
                }}
              />

              {/* Tips */}
              <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { icon: "✦", title: "AI 智慧去背", desc: "自動識別商品輪廓，精準去除背景" },
                  { icon: "✦", title: "十款奢華背景", desc: "大理石、絲絨、光暈等精品質感背景" },
                  { icon: "✦", title: "一鍵下載", desc: "高解析度輸出，直接用於社群發佈" },
                ].map((tip) => (
                  <div key={tip.title} className="luxury-card rounded-sm p-5">
                    <span className="text-[oklch(0.72_0.08_75)] text-xs mb-2 block">{tip.icon}</span>
                    <h4 className="text-[oklch(0.82_0.01_80)] text-sm mb-1 tracking-[0.05em]">{tip.title}</h4>
                    <p className="text-[oklch(0.45_0.02_60)] text-xs leading-relaxed">{tip.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* STEP 1: Select Background */}
          {step === 1 && originalImage && (
            <div
              className="animate-fade-in-up"
            >
              {/* 模式選擇 */}
              <div className="mb-6">
                <p className="text-xs tracking-[0.1em] text-[oklch(0.55_0.02_60)] mb-3">選擇處理模式</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setMode("product")}
                    className={`p-4 rounded-sm border text-left transition-all duration-200 ${
                      mode === "product"
                        ? "border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/40%)] hover:border-[oklch(0.72_0.08_75/40%)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">📦</span>
                      <span className={`text-sm font-medium tracking-[0.05em] ${mode === "product" ? "text-[oklch(0.72_0.08_75)]" : "text-[oklch(0.75_0.01_80)]"}`}>
                        商品棚拍模式
                      </span>
                      {mode === "product" && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                          <Check size={9} className="text-[oklch(0.1_0.005_60)]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[oklch(0.45_0.02_60)] leading-relaxed">
                      保留商品原貌，包裝文字、中文標示完整保留
                    </p>
                  </button>

                  <button
                    onClick={() => setMode("lifestyle")}
                    className={`p-4 rounded-sm border text-left transition-all duration-200 ${
                      mode === "lifestyle"
                        ? "border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/40%)] hover:border-[oklch(0.72_0.08_75/40%)]"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-base">🛍️</span>
                      <span className={`text-sm font-medium tracking-[0.05em] ${mode === "lifestyle" ? "text-[oklch(0.72_0.08_75)]" : "text-[oklch(0.75_0.01_80)]"}`}>
                        情境生活照模式
                      </span>
                      {mode === "lifestyle" && (
                        <span className="ml-auto w-4 h-4 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                          <Check size={9} className="text-[oklch(0.1_0.005_60)]" />
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-[oklch(0.45_0.02_60)] leading-relaxed">
                      人物帶包包、情境照，AI 重新生成更自然
                    </p>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Original Preview */}
                <div className="lg:col-span-2">
                  <div className="luxury-card rounded-sm p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)]">原始圖片</h3>
                      <button
                        onClick={handleReset}
                        className="text-[oklch(0.45_0.02_60)] hover:text-[oklch(0.72_0.08_75)] transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                    <div className="rounded-sm overflow-hidden bg-[oklch(0.12_0.005_60)] aspect-square flex items-center justify-center">
                      <img
                        src={`data:${originalMime};base64,${originalImage}`}
                        alt="原始圖片"
                        className="max-w-full max-h-full object-contain"
                      />
                    </div>
                  </div>
                </div>

                {/* Background Selection */}
                <div className="lg:col-span-3">
                  <h3 className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)] mb-4">選擇奢華背景</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3 gap-3">
                    {BACKGROUNDS.map((bg) => (
                      <button
                        key={bg.id}
                        onClick={() => setSelectedBg(bg.id)}
                        className={`relative rounded-sm overflow-hidden border-2 transition-all duration-300 group ${
                          selectedBg === bg.id
                            ? "border-[oklch(0.72_0.08_75)]"
                            : "border-transparent hover:border-[oklch(0.72_0.08_75/40%)]"
                        }`}
                      >
                        <div className="aspect-square">
                          <img
                            src={bg.preview}
                            alt={bg.label}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-t from-[oklch(0.08_0.005_60/90%)] via-transparent to-transparent" />
                        <div className="absolute bottom-0 left-0 right-0 p-2">
                          <p className="text-[oklch(0.92_0.01_80)] text-[10px] font-medium tracking-[0.05em]">
                            {bg.label}
                          </p>
                        </div>
                        {selectedBg === bg.id && (
                          <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                            <Check size={10} className="text-[oklch(0.1_0.005_60)]" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>

                  {/* 背景選擇器（只在 product 模式顯示）*/}
                  {mode === "product" && (
                    <div className="mt-5">
                      <p className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)] mb-3">背景選擇</p>
                      <div className="grid grid-cols-5 gap-2">
                        {PRESET_BACKGROUNDS.map((preset) => {
                          const isSelected = bgSource === 'preset' && selectedPresetBg === preset.id;
                          const isLoading = presetBgLoading === preset.id;
                          return (
                            <button
                              key={preset.id}
                              onClick={() => handleSelectPresetBg(preset.id)}
                              disabled={isLoading}
                              className={`relative aspect-square rounded-sm overflow-hidden border-2 transition-all duration-200 ${
                                isSelected
                                  ? "ring-2 ring-[oklch(0.72_0.08_75)] border-[oklch(0.72_0.08_75)]"
                                  : "border-transparent hover:border-[oklch(0.72_0.08_75/40%)]"
                              }`}
                            >
                              {preset.url ? (
                                <img
                                  src={preset.url}
                                  alt={preset.label}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-[oklch(0.22_0.02_270)] to-[oklch(0.15_0.01_270)] flex items-center justify-center">
                                  <Sparkles size={14} className="text-[oklch(0.72_0.08_75)]" />
                                </div>
                              )}
                              {/* 載入 spinner */}
                              {isLoading && (
                                <div className="absolute inset-0 bg-[oklch(0.1_0.005_60/70%)] flex items-center justify-center">
                                  <Loader2 size={12} className="animate-spin text-[oklch(0.72_0.08_75)]" />
                                </div>
                              )}
                              {/* 選中打勾 */}
                              {isSelected && !isLoading && (
                                <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                                  <Check size={8} className="text-[oklch(0.1_0.005_60)]" />
                                </div>
                              )}
                              {/* 標籤 */}
                              <div className="absolute bottom-0 left-0 right-0 bg-[oklch(0.08_0.005_60/80%)] py-0.5 px-1">
                                <p className="text-[8px] text-[oklch(0.82_0.01_80)] text-center truncate tracking-tight">
                                  {preset.label}
                                </p>
                              </div>
                            </button>
                          );
                        })}

                        {/* 上傳自訂背景按鈕 */}
                        <button
                          onClick={() => bgUploadRef.current?.click()}
                          className={`relative aspect-square rounded-sm border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-1 overflow-hidden ${
                            bgSource === 'upload' && customBgBase64
                              ? "border-[oklch(0.72_0.08_75)] ring-2 ring-[oklch(0.72_0.08_75)]"
                              : "border-[oklch(0.3_0.01_65/50%)] hover:border-[oklch(0.72_0.08_75/50%)]"
                          }`}
                        >
                          {bgSource === 'upload' && customBgBase64 ? (
                            <>
                              <img
                                src={`data:image/jpeg;base64,${customBgBase64}`}
                                alt="自訂背景"
                                className="absolute inset-0 w-full h-full object-cover rounded-sm"
                              />
                              <div className="absolute inset-0 bg-[oklch(0.08_0.005_60/50%)] rounded-sm" />
                              <Check size={14} className="relative text-[oklch(0.72_0.08_75)] z-10" />
                            </>
                          ) : (
                            <>
                              <Plus size={14} className="text-[oklch(0.45_0.02_60)]" />
                            </>
                          )}
                          <div className="absolute bottom-0 left-0 right-0 bg-[oklch(0.08_0.005_60/80%)] py-0.5 px-1">
                            <p className="text-[8px] text-[oklch(0.82_0.01_80)] text-center truncate tracking-tight">
                              上傳背景
                            </p>
                          </div>
                        </button>
                      </div>
                      <input
                        ref={bgUploadRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleBgUpload(file);
                          e.target.value = '';
                        }}
                      />
                    </div>
                  )}

                  {/* Generate Button */}
                  <div className="mt-6">
                    {/* 原色鎖定 Color Lock */}
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/90">原色鎖定</p>
                          <p className="text-xs text-white/50">保留產品原始色彩，僅更換背景</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setColorLock(!colorLock)}
                        className={`relative w-11 h-6 rounded-full transition-colors ${colorLock ? 'bg-amber-500' : 'bg-white/20'}`}
                      >
                        <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${colorLock ? 'translate-x-5' : ''}`} />
                      </button>
                    </div>
                    <button
                      onClick={handleGenerate}
                      disabled={!selectedBg || isGenerating}
                      className={`w-full py-4 rounded-sm flex items-center justify-center gap-3 transition-all duration-300 tracking-[0.12em] text-sm ${
                        selectedBg && !isGenerating
                          ? "bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)] hover:bg-[oklch(0.78_0.08_75)]"
                          : "bg-[oklch(0.18_0.005_60)] text-[oklch(0.4_0.02_60)] cursor-not-allowed"
                      }`}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          {mode === "product" ? "BGSWAP AI 合成中..." : "Imagen 3 AI 生成中..."}
                        </>
                      ) : (
                        <>
                          <Sparkles size={16} />
                          {mode === "product" ? "開始背景合成（保留文字）" : "開始 AI 重新生成"}
                          <ChevronRight size={16} />
                        </>
                      )}
                    </button>
                    {isGenerating && (
                      <p className="text-center text-[oklch(0.45_0.02_60)] text-xs mt-3">
                        {mode === "product"
                          ? "AI 正在去背並合成奢華背景，文字標示完整保留，約需 20-40 秒..."
                          : "Imagen 3 正在分析情境並重新生成，約需 20-40 秒..."}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Result */}
          {step === 2 && resultUrl && (
            <div
              className="animate-fade-in"
            >
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Before */}
                <div className="luxury-card rounded-sm p-4">
                  <h3 className="text-xs tracking-[0.1em] text-[oklch(0.55_0.02_60)] mb-3">原始圖片</h3>
                  <div className="rounded-sm overflow-hidden bg-[oklch(0.12_0.005_60)] aspect-square flex items-center justify-center">
                    <img
                      src={`data:${originalMime};base64,${originalImage}`}
                      alt="原始"
                      className="max-w-full max-h-full object-contain"
                    />
                  </div>
                </div>

                {/* After */}
                <div className="luxury-card rounded-sm p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)]">
                      合成結果
                    </h3>
                    <span className="text-[9px] tracking-[0.1em] text-[oklch(0.72_0.08_75/60%)] border border-[oklch(0.72_0.08_75/20%)] px-2 py-0.5 rounded-sm">
                      {BACKGROUNDS.find(b => b.id === selectedBg)?.label}
                    </span>
                  </div>
                  <div className="rounded-sm overflow-hidden aspect-square">
                    <img
                      src={resultUrl}
                      alt="合成結果"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 mt-6">
                <button
                  onClick={handleDownload}
                  className="flex-1 py-4 bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)] rounded-sm flex items-center justify-center gap-2 hover:bg-[oklch(0.78_0.08_75)] transition-colors tracking-[0.1em] text-sm"
                >
                  <Download size={16} />
                  下載圖片
                </button>
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 luxury-card rounded-sm flex items-center justify-center gap-2 hover:border-[oklch(0.72_0.08_75/40%)] transition-colors tracking-[0.1em] text-sm text-[oklch(0.72_0.08_75)]"
                >
                  <RefreshCw size={16} />
                  換個背景
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-4 luxury-card rounded-sm flex items-center justify-center gap-2 hover:border-[oklch(0.72_0.08_75/40%)] transition-colors tracking-[0.1em] text-sm text-[oklch(0.55_0.02_60)]"
                >
                  <Upload size={16} />
                  重新上傳
                </button>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
