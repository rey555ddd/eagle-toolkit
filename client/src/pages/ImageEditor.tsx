/*
 * 設計哲學：Maison Noire — 法式精品沙龍美學
 * 圖片精修器：GPT Image 2 驅動，單一模式
 * 三步驟流程：上傳 → 選場景 → 生成下載
 *
 * 核心：直接把商品原圖餵給 GPT Image 2 + Prompt，保留商品本體
 *      與所有文字 / LOGO，只換背景場景。一步到位。
 */
import { useState, useCallback, useRef } from "react";
import {
  ImageIcon, Upload, Download, Sparkles, Check,
  RefreshCw, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

// ─── 場景預設 ────────────────────────────────────────────────────────────────

const PRESETS = [
  {
    id: "marble-white", label: "白色大理石", desc: "卡拉拉白大理石，金色紋路",
    thumb: "linear-gradient(150deg,#f7f4ed 0%,#e8e2d0 18%,#f2ece0 30%,#d6cdb8 42%,#f0eadc 58%,#e4dcc8 72%,#f8f4ea 100%)",
  },
  {
    id: "marble-black", label: "黑金大理石", desc: "黑色大理石，金色脈絡",
    thumb: "linear-gradient(140deg,#0e0e0e 0%,#1c1a14 20%,#c8a03a 28%,#0e0e0e 38%,#1e1c14 55%,#a87e20 65%,#0d0d0d 100%)",
  },
  {
    id: "velvet-black", label: "黑色絲絨", desc: "深邃黑絲絨，珠寶首選",
    thumb: "radial-gradient(ellipse at 40% 35%,#2a2420 0%,#161210 45%,#0a0808 100%)",
  },
  {
    id: "velvet-deep-blue", label: "深藍絲絨", desc: "皇家深藍，高貴典雅",
    thumb: "radial-gradient(ellipse at 40% 35%,#1a2050 0%,#0d1230 50%,#050810 100%)",
  },
  {
    id: "gold-bokeh", label: "金色光暈", desc: "香檳金散景，夢幻奢華",
    thumb: "radial-gradient(ellipse at 35% 40%,#f5d060 0%,#c49020 35%,#7a5800 65%,#3a2800 100%)",
  },
  {
    id: "champagne-silk", label: "香檳絲綢", desc: "流動絲綢，柔美精緻",
    thumb: "linear-gradient(160deg,#f5e8c4 0%,#edd8a0 25%,#f8f0da 50%,#e8d49a 70%,#f2e4ba 100%)",
  },
  {
    id: "dark-wood", label: "深色胡桃木", desc: "深色木紋，沉穩奢華",
    thumb: "repeating-linear-gradient(168deg,#2a160c 0px,#3c2018 6px,#4a2a1c 10px,#3a1e10 16px,#2e1810 22px)",
  },
  {
    id: "mirror-reflection", label: "鏡面反射", desc: "光滑鏡面，倒影效果",
    thumb: "linear-gradient(135deg,#c8c8c8 0%,#f0f0f0 20%,#a0a0a0 38%,#e4e4e4 55%,#b8b8b8 72%,#f4f4f4 100%)",
  },
  {
    id: "rose-petal", label: "玫瑰花瓣", desc: "浪漫玫瑰，奢華氛圍",
    thumb: "radial-gradient(ellipse at 50% 45%,#f0a0b4 0%,#d06080 35%,#903050 65%,#501828 100%)",
  },
  {
    id: "crystal-light", label: "水晶光折射", desc: "稜鏡彩光，珠寶質感",
    thumb: "linear-gradient(120deg,#e06060 0%,#e89040 18%,#d4cc40 36%,#60c860 54%,#5080e0 72%,#9050d0 100%)",
  },
] as const;

type PresetId = typeof PRESETS[number]["id"];

const STEPS = ["上傳商品圖", "選擇場景", "生成下載"];

// ─── Component ───────────────────────────────────────────────────────────────

export default function ImageEditor() {
  const [step, setStep] = useState(0);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [originalMime, setOriginalMime] = useState("image/jpeg");
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx2d = canvas.getContext('2d');
      if (!ctx2d) return;
      ctx2d.drawImage(img, 0, 0);
      // 統一轉 PNG（GPT Image 2 mask 模式要求 PNG）
      const dataUrl = canvas.toDataURL('image/png');
      const base64 = dataUrl.split(',')[1];
      setOriginalImage(base64);
      setOriginalMime('image/png');
      setStep(1);
      setResultUrl(null);
      setSelectedPreset(null);
      setCustomPrompt('');
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      toast.error('圖片讀取失敗，請換一張試試');
    };
    img.src = objectUrl;
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

  // ─── tRPC mutation ───────────────────────────────────────────────────────────

  const refineMutation = trpc.imageProcessor.refine.useMutation({
    onSuccess: (data) => {
      setResultUrl(`data:image/png;base64,${data.imageBase64}`);
      setStep(2);
      toast.success("✨ GPT Image 2 精修完成！文字 100% 保留");
    },
    onError: (err) => {
      toast.error("生成失敗：" + err.message);
    },
  });

  const handleGenerate = () => {
    if (!originalImage) return;
    if (!selectedPreset && !customPrompt.trim()) {
      toast.error("請選一個場景預設或輸入自訂描述");
      return;
    }
    refineMutation.mutate({
      imageBase64: originalImage,
      mimeType: originalMime as "image/jpeg" | "image/png",
      preset: selectedPreset ?? undefined,
      customPrompt: customPrompt.trim() || undefined,
    });
  };

  const handleDownload = () => {
    if (!resultUrl) return;
    const a = document.createElement("a");
    a.href = resultUrl;
    a.download = `eagle-luxury-${Date.now()}.png`;
    a.click();
    toast.success("圖片已下載！");
  };

  const handleReset = () => {
    setStep(0);
    setOriginalImage(null);
    setSelectedPreset(null);
    setCustomPrompt("");
    setResultUrl(null);
  };

  const isGenerating = refineMutation.isPending;
  const canGenerate = !!selectedPreset || customPrompt.trim().length > 0;

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <ImageIcon size={20} className="text-[oklch(0.72_0.08_75)]" />
            <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.12em] text-[oklch(0.92_0.01_80)]">
              圖片精修器
            </h1>
          </div>
          <div className="gold-divider max-w-[80px] mx-auto mb-4" />
          <p className="text-[oklch(0.55_0.02_60)] text-sm tracking-[0.05em]">
            GPT Image 2 精修引擎，保留商品與所有文字，替換奢華場景
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
                <p className="text-[oklch(0.45_0.02_60)] text-sm mb-2">拖曳或點擊上傳</p>
                <p className="text-[oklch(0.35_0.02_60)] text-xs">支援 JPG、PNG，最大 8MB</p>
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
                { icon: "✦", title: "GPT Image 2 + Mask", desc: "Mask 鎖定產品，GPT 只改背景，精品包不走樣" },
                { icon: "✦", title: "智能鎖定產品", desc: "自動去背生成 Mask，產品形狀 100% 不變形" },
                { icon: "✦", title: "一鍵下載", desc: "高解析度 PNG，直接用於社群發佈" },
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

        {/* ── STEP 1: Select Preset / Custom Prompt ───────────────────────────── */}
        {step === 1 && originalImage && (
          <div className="animate-fade-in-up">
            {/* Preview of uploaded image */}
            <div className="luxury-card rounded-sm p-6 mb-6 flex flex-col sm:flex-row gap-6 items-center">
              <div className="w-40 h-40 rounded-sm overflow-hidden border border-[oklch(0.25_0.01_65/30%)] flex-shrink-0">
                <img
                  src={`data:${originalMime};base64,${originalImage}`}
                  alt="原圖"
                  className="w-full h-full object-contain bg-[oklch(0.12_0.005_60)]"
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <p className="text-[oklch(0.72_0.08_75)] text-xs tracking-[0.1em] mb-2">已上傳商品圖</p>
                <p className="text-[oklch(0.82_0.01_80)] text-sm mb-4">選擇下方場景預設，或自己輸入描述</p>
                <button
                  onClick={handleReset}
                  className="text-[oklch(0.55_0.02_60)] text-xs hover:text-[oklch(0.72_0.08_75)] transition-colors"
                >
                  ← 重新上傳
                </button>
              </div>
            </div>

            {/* Preset Grid */}
            <p className="text-xs tracking-[0.1em] text-[oklch(0.55_0.02_60)] mb-3">場景預設</p>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
              {PRESETS.map((p) => {
                const isSelected = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPreset(p.id);
                      setCustomPrompt("");
                    }}
                    className={`luxury-card rounded-sm overflow-hidden text-left transition-all duration-300 ${
                      isSelected
                        ? "border-[oklch(0.72_0.08_75)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "hover:border-[oklch(0.72_0.08_75/30%)]"
                    }`}
                  >
                    {/* 縮圖預覽 */}
                    <div
                      className="w-full h-14 relative"
                      style={{ background: p.thumb }}
                    >
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                          <Check size={18} className="text-[oklch(0.72_0.08_75)] drop-shadow-lg" />
                        </div>
                      )}
                    </div>
                    {/* 文字 */}
                    <div className="p-3">
                      <h4 className="text-[oklch(0.82_0.01_80)] text-[12px] tracking-[0.05em] mb-0.5">
                        {p.label}
                      </h4>
                      <p className="text-[oklch(0.45_0.02_60)] text-[10px] leading-snug">
                        {p.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom Prompt */}
            <p className="text-xs tracking-[0.1em] text-[oklch(0.55_0.02_60)] mb-3">
              或自訂場景描述（英文效果最佳）
            </p>
            <textarea
              value={customPrompt}
              onChange={(e) => {
                setCustomPrompt(e.target.value);
                if (e.target.value.trim()) setSelectedPreset(null);
              }}
              placeholder="例：Place the product on an antique Persian rug with warm candlelight..."
              className="w-full luxury-card rounded-sm p-4 text-sm text-[oklch(0.82_0.01_80)] bg-transparent outline-none resize-none min-h-[80px] mb-6"
              maxLength={2000}
            />

            {/* Generate button */}
            <button
              onClick={handleGenerate}
              disabled={!canGenerate || isGenerating}
              className={`w-full py-4 rounded-sm tracking-[0.1em] text-sm transition-all duration-300 flex items-center justify-center gap-3 ${
                !canGenerate || isGenerating
                  ? "bg-[oklch(0.2_0.01_60)] text-[oklch(0.4_0.02_60)] cursor-not-allowed"
                  : "bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)] hover:bg-[oklch(0.78_0.09_75)]"
              }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  GPT Image 2 精修中，約需 20–40 秒...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  開始精修
                </>
              )}
            </button>
          </div>
        )}

        {/* ── STEP 2: Result ──────────────────────────────────────────────────── */}
        {step === 2 && resultUrl && (
          <div className="animate-fade-in-up">
            <div className="luxury-card rounded-sm p-6 mb-6">
              <img
                src={resultUrl}
                alt="精修結果"
                className="w-full h-auto rounded-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 rounded-sm bg-[oklch(0.72_0.08_75)] text-[oklch(0.1_0.005_60)] tracking-[0.1em] text-sm hover:bg-[oklch(0.78_0.09_75)] transition-colors flex items-center justify-center gap-2"
              >
                <Download size={16} />
                下載圖片
              </button>
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-sm border border-[oklch(0.25_0.01_65/50%)] text-[oklch(0.82_0.01_80)] tracking-[0.1em] text-sm hover:border-[oklch(0.72_0.08_75/50%)] transition-colors flex items-center justify-center gap-2"
              >
                <RefreshCw size={16} />
                換場景重做
              </button>
              <button
                onClick={handleReset}
                className="flex-1 py-3 rounded-sm border border-[oklch(0.25_0.01_65/50%)] text-[oklch(0.82_0.01_80)] tracking-[0.1em] text-sm hover:border-[oklch(0.72_0.08_75/50%)] transition-colors flex items-center justify-center gap-2"
              >
                <Upload size={16} />
                換商品
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
