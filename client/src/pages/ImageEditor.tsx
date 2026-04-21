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

// ─── 資料常數 ────────────────────────────────────────────────────────────────

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

// 純去背模式的預設背景庫（不含 ai-generate 特殊項）
const PRESET_BACKGROUNDS = [
  { id: 'marble-white', label: '白大理石',   url: '/backgrounds/marble-white.jpg' },
  { id: 'marble-grey',  label: '黑金大理石', url: '/backgrounds/marble-black.jpg' },
  { id: 'wood-light',   label: '淺木桌',     url: '/backgrounds/wood-light.jpg' },
  { id: 'wood-dark',    label: '深木桌',     url: '/backgrounds/wood-dark.jpg' },
  { id: 'concrete',     label: '水泥',       url: '/backgrounds/concrete.jpg' },
  { id: 'linen',        label: '亞麻布',     url: '/backgrounds/linen.jpg' },
  { id: 'black-studio', label: '黑色棚',     url: '/backgrounds/black-studio.jpg' },
  { id: 'white-studio', label: '白色棚',     url: '/backgrounds/white-studio.jpg' },
  { id: 'pastel-pink',  label: '粉色系',     url: '/backgrounds/pastel-pink.jpg' },
] as const;

type PresetBgId = typeof PRESET_BACKGROUNDS[number]['id'];

// ─── 模式定義 ────────────────────────────────────────────────────────────────

type ProcessMode = "ai-studio" | "real-bg" | "lifestyle";

const MODE_CONFIG: Record<ProcessMode, {
  emoji: string;
  title: string;
  desc: string;
  badge?: string;
  btnLabel: string;
  loadingLabel: string;
  loadingDesc: string;
}> = {
  "ai-studio": {
    emoji: "🎨",
    title: "AI 棚拍模式",
    desc: "AI 生成創意背景，有設計感但帶 AI 風格",
    btnLabel: "開始 AI 棚拍合成",
    loadingLabel: "去背 + AI 生成背景中...",
    loadingDesc: "AI 正在去背並生成奢華背景，約需 20-40 秒...",
  },
  "real-bg": {
    emoji: "🖼️",
    title: "純去背模式",
    desc: "真實照片背景，最自然不像 AI，速度最快、費用最低",
    badge: "⚡ 最快最省",
    btnLabel: "開始去背合成",
    loadingLabel: "去背合成中...",
    loadingDesc: "AI 正在去背並合成您選擇的背景，約需 10-20 秒...",
  },
  "lifestyle": {
    emoji: "✨",
    title: "精品棚拍模式",
    desc: "AI 完整重新生成，戲劇感最強，適合精品包、飾品、造型商品",
    btnLabel: "開始 AI 精品棚拍",
    loadingLabel: "Imagen 3 精品棚拍生成中...",
    loadingDesc: "Imagen 3 正在重新生成精品棚拍效果，約需 20-40 秒...",
  },
};

const STEPS = ["上傳商品圖", "選擇背景", "生成下載"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImageEditor() {
  const [step, setStep] = useState(0);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMime, setOriginalMime] = useState("image/jpeg");
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [colorLock, setColorLock] = useState(false);
  const [mode, setMode] = useState<ProcessMode>("ai-studio");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 純去背模式的背景選擇 state
  const [bgSource, setBgSource] = useState<'preset' | 'upload' | 'custom-prompt'>('preset');
  const [selectedPresetBg, setSelectedPresetBg] = useState<PresetBgId | null>(null);
  const [customBgBase64, setCustomBgBase64] = useState<string | null>(null);
  const [presetBgLoading, setPresetBgLoading] = useState<string | null>(null);
  const bgUploadRef = useRef<HTMLInputElement>(null);

  // 自定義背景生成 state
  const [customPromptText, setCustomPromptText] = useState('');
  const [generatedCustomBgBase64, setGeneratedCustomBgBase64] = useState<string | null>(null);

  // ─── 上傳邏輯 ───────────────────────────────────────────────────────────────

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

  // ─── Canvas 合成 ─────────────────────────────────────────────────────────────

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

  // ─── tRPC mutation ───────────────────────────────────────────────────────────

  const applyBgMutation = trpc.imageProcessor.applyLuxuryBackground.useMutation({
    onSuccess: async (data) => {
      if (data.useCanvas && data.cutoutBase64 && data.backgroundBase64) {
        try {
          const composited = await compositeOnCanvas(data.cutoutBase64, data.backgroundBase64);
          setResultUrl(composited);
          setStep(2);
          toast.success("✨ 合成完成！商品文字完整保留");
        } catch (err) {
          toast.error("Canvas 合成失敗：" + String(err));
        }
      } else if (data.imageBase64) {
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

  // ─── 自定義背景生成 mutation ─────────────────────────────────────────────────

  const generateBgMutation = trpc.imageProcessor.generateBackground.useMutation({
    onSuccess: (data) => {
      setGeneratedCustomBgBase64(data.backgroundBase64);
      setCustomBgBase64(data.backgroundBase64);
      toast.success("✨ 自定義背景生成完成！");
    },
    onError: (err) => {
      toast.error("背景生成失敗：" + err.message);
    },
  });

  const handleGenerateCustomBg = () => {
    if (!customPromptText.trim()) {
      toast.error("請輸入背景描述");
      return;
    }
    generateBgMutation.mutate({ prompt: customPromptText.trim() });
  };

  // ─── 生成觸發 ────────────────────────────────────────────────────────────────

  const handleGenerate = () => {
    if (!originalImage) return;

    // real-bg 模式：需要背景照片
    if (mode === "real-bg") {
      if (!customBgBase64) {
        toast.error("請先選擇或上傳背景照片");
        return;
      }
      applyBgMutation.mutate({
        imageBase64: originalImage,
        mimeType: originalMime as "image/jpeg" | "image/png",
        backgroundStyle: (selectedBg ?? "marble-white") as Parameters<typeof applyBgMutation.mutate>[0]["backgroundStyle"],
        colorLock,
        mode: "real-bg",
        customBackgroundBase64: customBgBase64,
      });
      return;
    }

    // ai-studio / lifestyle 模式：需要選擇背景風格
    if (!selectedBg) {
      toast.error("請先選擇背景風格");
      return;
    }

    applyBgMutation.mutate({
      imageBase64: originalImage,
      mimeType: originalMime as "image/jpeg" | "image/png",
      backgroundStyle: selectedBg as Parameters<typeof applyBgMutation.mutate>[0]["backgroundStyle"],
      colorLock,
      mode,
      customBackgroundBase64: undefined,
    });
  };

  // ─── 下載 ────────────────────────────────────────────────────────────────────

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

  // ─── Reset ───────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setStep(0);
    setOriginalImage(null);
    setSelectedBg(null);
    setResultUrl(null);
    setMode("ai-studio");
    setBgSource('preset');
    setSelectedPresetBg(null);
    setCustomBgBase64(null);
    setPresetBgLoading(null);
    setCustomPromptText('');
    setGeneratedCustomBgBase64(null);
  };

  // ─── 切換模式時清除子選項 state ──────────────────────────────────────────────

  const handleModeChange = (newMode: ProcessMode) => {
    setMode(newMode);
    setSelectedBg(null);
    setBgSource('preset');
    setSelectedPresetBg(null);
    setCustomBgBase64(null);
    setPresetBgLoading(null);
    setCustomPromptText('');
    setGeneratedCustomBgBase64(null);
  };

  // ─── 預設背景選擇（real-bg 模式）────────────────────────────────────────────

  const handleSelectPresetBg = useCallback(async (bgId: PresetBgId) => {
    setBgSource('preset');
    setSelectedPresetBg(bgId);
    const preset = PRESET_BACKGROUNDS.find(b => b.id === bgId);
    if (!preset) return;
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

  // ─── 上傳自訂背景（real-bg 模式）────────────────────────────────────────────

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
      setSelectedPresetBg(null);
    };
    reader.readAsDataURL(file);
  }, []);

  // ─── 按鈕 disabled 判斷 ──────────────────────────────────────────────────────

  const isGenerating = applyBgMutation.isPending;

  const isGenerateDisabled = isGenerating || (
    mode === "real-bg"
      ? !customBgBase64
      : !selectedBg
  );

  const generateDisabledHint =
    mode === "real-bg" && !customBgBase64
      ? "請先選擇或上傳背景照片"
      : null;

  const modeConfig = MODE_CONFIG[mode];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in-up">
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

        {/* ── STEP 0: Upload ───────────────────────────────────────────────────── */}
        {step === 0 && (
          <div className="animate-fade-in-up">
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
                { icon: "✦", title: "三種模式", desc: "AI 棚拍 / 純去背 / 情境生活照自由切換" },
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

        {/* ── STEP 1: Select Mode + Background ────────────────────────────────── */}
        {step === 1 && originalImage && (
          <div className="animate-fade-in-up">

            {/* 三模式 Card 選擇 */}
            <div className="mb-8">
              <p className="text-xs tracking-[0.1em] text-[oklch(0.55_0.02_60)] mb-3">選擇處理模式</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(Object.keys(MODE_CONFIG) as ProcessMode[]).map((m) => {
                  const cfg = MODE_CONFIG[m];
                  const isSelected = mode === m;
                  return (
                    <button
                      key={m}
                      onClick={() => handleModeChange(m)}
                      className={`relative p-4 rounded-sm border text-left transition-all duration-200 ${
                        isSelected
                          ? "ring-2 ring-[oklch(0.72_0.08_75)] border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75/8%)]"
                          : "border-[oklch(0.25_0.01_65/40%)] hover:border-[oklch(0.72_0.08_75/40%)]"
                      }`}
                    >
                      {/* 右上角打勾 */}
                      {isSelected && (
                        <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                          <Check size={10} className="text-[oklch(0.1_0.005_60)]" />
                        </div>
                      )}

                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xl">{cfg.emoji}</span>
                        <span className={`text-sm font-medium tracking-[0.04em] ${isSelected ? "text-[oklch(0.72_0.08_75)]" : "text-[oklch(0.75_0.01_80)]"}`}>
                          {cfg.title}
                        </span>
                      </div>
                      <p className="text-[11px] text-[oklch(0.45_0.02_60)] leading-relaxed mb-2">
                        {cfg.desc}
                      </p>
                      {cfg.badge && (
                        <span className="inline-block text-[9px] tracking-[0.06em] px-1.5 py-0.5 rounded-sm border border-[oklch(0.72_0.08_75/40%)] text-[oklch(0.72_0.08_75/80%)] bg-[oklch(0.72_0.08_75/5%)]">
                          {cfg.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* 原始圖片預覽 */}
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

              {/* 右側：模式對應子選項 */}
              <div className="lg:col-span-3 space-y-5">

                {/* ai-studio / lifestyle：背景風格選擇器 */}
                {(mode === "ai-studio" || mode === "lifestyle") && (
                  <div>
                    <h3 className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)] mb-4">
                      選擇背景風格
                    </h3>
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
                  </div>
                )}

                {/* real-bg：背景照片選擇器 */}
                {mode === "real-bg" && (
                  <div>
                    <h3 className="text-xs tracking-[0.1em] text-[oklch(0.72_0.08_75)] mb-4">
                      選擇背景照片
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {/* 預設縮圖 */}
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
                            <img
                              src={preset.url}
                              alt={preset.label}
                              className="w-full h-full object-cover"
                            />
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

                      {/* 上傳自訂背景 */}
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
                          <Plus size={14} className="text-[oklch(0.45_0.02_60)]" />
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-[oklch(0.08_0.005_60/80%)] py-0.5 px-1">
                          <p className="text-[8px] text-[oklch(0.82_0.01_80)] text-center truncate tracking-tight">
                            上傳背景
                          </p>
                        </div>
                      </button>

                      {/* 自定義背景生成卡片 */}
                      <button
                        onClick={() => {
                          setBgSource('custom-prompt');
                          setSelectedPresetBg(null);
                          if (!generatedCustomBgBase64) {
                            setCustomBgBase64(null);
                          } else {
                            setCustomBgBase64(generatedCustomBgBase64);
                          }
                        }}
                        className={`relative aspect-square rounded-sm border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-1 overflow-hidden ${
                          bgSource === 'custom-prompt'
                            ? "border-[oklch(0.72_0.08_75)] ring-2 ring-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75/5%)]"
                            : "border-[oklch(0.3_0.01_65/50%)] hover:border-[oklch(0.72_0.08_75/50%)]"
                        }`}
                      >
                        {generatedCustomBgBase64 ? (
                          <>
                            <img
                              src={`data:image/jpeg;base64,${generatedCustomBgBase64}`}
                              alt="自定義背景"
                              className="absolute inset-0 w-full h-full object-cover rounded-sm"
                            />
                            <div className="absolute inset-0 bg-[oklch(0.08_0.005_60/40%)] rounded-sm" />
                            {bgSource === 'custom-prompt' && (
                              <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[oklch(0.72_0.08_75)] flex items-center justify-center">
                                <Check size={8} className="text-[oklch(0.1_0.005_60)]" />
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-base leading-none">✏️</span>
                        )}
                        <div className="absolute bottom-0 left-0 right-0 bg-[oklch(0.08_0.005_60/80%)] py-0.5 px-1">
                          <p className="text-[8px] text-[oklch(0.82_0.01_80)] text-center truncate tracking-tight">
                            自定義背景
                          </p>
                        </div>
                      </button>
                    </div>

                    {/* 自定義背景 Prompt 輸入區 */}
                    {bgSource === 'custom-prompt' && (
                      <div className="mt-3 p-3 rounded-sm border border-[oklch(0.72_0.08_75/30%)] bg-[oklch(0.12_0.005_60/50%)] space-y-2">
                        <p className="text-[10px] tracking-[0.06em] text-[oklch(0.72_0.08_75)]">
                          用文字描述你想要的背景
                        </p>
                        <textarea
                          value={customPromptText}
                          onChange={(e) => setCustomPromptText(e.target.value)}
                          placeholder="例如：奢華深藍絲絨背景，金色光線灑落"
                          rows={2}
                          className="w-full bg-[oklch(0.08_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-3 py-2 text-[12px] text-[oklch(0.82_0.01_80)] placeholder-[oklch(0.35_0.02_60)] resize-none focus:outline-none focus:border-[oklch(0.72_0.08_75/60%)] transition-colors"
                        />
                        <button
                          onClick={handleGenerateCustomBg}
                          disabled={generateBgMutation.isPending || !customPromptText.trim()}
                          className={`w-full py-2 rounded-sm flex items-center justify-center gap-2 text-[11px] tracking-[0.08em] transition-all duration-200 ${
                            !generateBgMutation.isPending && customPromptText.trim()
                              ? "bg-[oklch(0.72_0.08_75/20%)] border border-[oklch(0.72_0.08_75/50%)] text-[oklch(0.72_0.08_75)] hover:bg-[oklch(0.72_0.08_75/30%)]"
                              : "bg-[oklch(0.15_0.005_60)] border border-[oklch(0.2_0.01_65/30%)] text-[oklch(0.35_0.02_60)] cursor-not-allowed"
                          }`}
                        >
                          {generateBgMutation.isPending ? (
                            <>
                              <Loader2 size={12} className="animate-spin" />
                              Imagen 3 生成中...
                            </>
                          ) : (
                            <>
                              <Sparkles size={12} />
                              生成背景
                            </>
                          )}
                        </button>
                      </div>
                    )}

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
                    {/* 未選背景提示 */}
                    {!customBgBase64 && bgSource !== 'custom-prompt' && (
                      <p className="text-[oklch(0.5_0.02_60)] text-[11px] mt-2">
                        請先選擇或上傳背景照片
                      </p>
                    )}
                    {bgSource === 'custom-prompt' && !generatedCustomBgBase64 && !generateBgMutation.isPending && (
                      <p className="text-[oklch(0.5_0.02_60)] text-[11px] mt-2">
                        輸入描述後點擊「生成背景」
                      </p>
                    )}
                  </div>
                )}

                {/* Generate 區塊 */}
                <div>
                  {/* 原色鎖定（只在 ai-studio / lifestyle 顯示，real-bg 不需要） */}
                  {mode !== "real-bg" && (
                    <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                          </svg>
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
                  )}

                  {/* 按鈕 */}
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerateDisabled}
                    className={`w-full py-4 rounded-sm flex items-center justify-center gap-3 transition-all duration-300 tracking-[0.12em] text-sm ${
                      !isGenerateDisabled
                        ? "bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)] hover:bg-[oklch(0.78_0.08_75)]"
                        : "bg-[oklch(0.18_0.005_60)] text-[oklch(0.4_0.02_60)] cursor-not-allowed"
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        {modeConfig.loadingLabel}
                      </>
                    ) : (
                      <>
                        <Sparkles size={16} />
                        {modeConfig.btnLabel}
                        <ChevronRight size={16} />
                      </>
                    )}
                  </button>

                  {/* disabled 提示 */}
                  {!isGenerating && generateDisabledHint && (
                    <p className="text-center text-[oklch(0.5_0.02_60)] text-xs mt-2">
                      {generateDisabledHint}
                    </p>
                  )}

                  {/* 生成中說明 */}
                  {isGenerating && (
                    <p className="text-center text-[oklch(0.45_0.02_60)] text-xs mt-3">
                      {modeConfig.loadingDesc}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP 2: Result ───────────────────────────────────────────────────── */}
        {step === 2 && resultUrl && (
          <div className="animate-fade-in">
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
                    {MODE_CONFIG[mode].emoji} {MODE_CONFIG[mode].title}
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
