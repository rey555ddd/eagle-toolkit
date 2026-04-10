/*
 * 設計哲學：Maison Noire — 法式精品沙龍美學
 * 文案生成器：左右分欄（桌面），上下排列（手機）
 * 左側：輸入設定區 / 右側：文案輸出區
 */
import { useState, useCallback } from "react";
import {
  PenTool, Copy, RefreshCw, Hash, Sparkles, Check, Info, Loader2, ChevronDown
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const copyStyles = [
  { id: "seeding", label: "種草帶貨", desc: "引發購買欲望的種草文案" },
  { id: "live", label: "直播導購", desc: "適合直播時使用的口播文案" },
  { id: "minimal", label: "精品極簡", desc: "簡潔優雅的精品風格文案" },
  { id: "ai", label: "AI 優化", desc: "智慧分析並優化文案表達" },
];

const copyLengths = [
  { id: "short", label: "短文案", desc: "50-100 字" },
  { id: "long", label: "長文案", desc: "200-400 字" },
];

const productTypes = [
  "精品包", "名錶", "珠寶首飾", "精品配件", "精品鞋款", "精品服飾",
];

const productTags = [
  "經典款", "限量款", "新款/當季", "高CP值", "百搭實用",
  "稀有色/特殊色", "全新未使用", "9成新以上", "附全套配件",
  "專櫃價差大", "停產絕版", "明星同款",
];

// ─── Hashtag generator (still local for speed) ───────────────────────────────
// Template-based copy generation — REPLACED BY AI, kept for reference only
function generateCopy(
  style: string,
  length: string,
  brand: string,
  type: string,
  tags: string[],
  custom: string
): string {
  const tagStr = tags.join("、");
  const brandName = brand || "精品";
  const productName = type || "精品";

  const templates: Record<string, Record<string, string>> = {
    seed: {
      short: `✨ 這款${brandName}${productName}真的太美了！${tagStr ? `${tagStr}，` : ""}一看到就知道是命定款 💕\n\n不誇張，實品比照片更驚艷，質感摸過就回不去了。${custom ? `\n${custom}` : ""}\n\n想入手的私訊我，數量有限 🔥`,
      long: `✨ 今天要跟大家分享一款讓我心動不已的${brandName}${productName}！\n\n說真的，在精品圈打滾這麼多年，能讓我眼睛一亮的單品真的不多，但這款完全打中我的心 💕\n\n${tagStr ? `【商品亮點】${tagStr}\n\n` : ""}先說說外觀，整體設計非常${tags.includes("經典款") ? "經典耐看，是那種越看越愛的類型" : "時尚前衛，走在潮流最前端"}。質感方面更不用說，${type === "精品包" ? "皮革觸感細膩，五金件光澤度完美" : type === "名錶" ? "錶面做工精緻，機芯運轉順暢" : "做工精細，每個細節都看得出品牌的用心"}。\n\n${custom ? `${custom}\n\n` : ""}這款真的是可遇不可求，喜歡的朋友趕快私訊我，手腳要快！先搶先贏 🔥\n\n#伊果國外精品代購 #${brandName} #精品代購`,
    },
    live: {
      short: `🔴 家人們看過來！這款${brandName}${productName}${tagStr ? `，${tagStr}` : ""}，今天直播間特別帶給大家！\n\n品質我掛保證，想要的扣 1 讓我知道 🙋‍♀️${custom ? `\n${custom}` : ""}`,
      long: `🔴 家人們家人們！今天這款${brandName}${productName}一定要停下來看！\n\n我跟你們說，這款在專櫃${tags.includes("專櫃價差大") ? "價差真的很大，今天的價格你們聽到會尖叫" : "很搶手的，我好不容易才搶到貨"}！\n\n${tagStr ? `✅ ${tagStr}\n\n` : ""}${type === "精品包" ? "你們看這個皮革的光澤，這個車線的工藝，摸起來的觸感，這就是精品的魅力！" : type === "名錶" ? "你們看這個錶面的細節，這個機芯的做工，戴在手上的質感，完全不一樣！" : "你們看這個做工，這個質感，拿在手上就是不一樣！"}\n\n${custom ? `${custom}\n\n` : ""}想要的家人們趕快扣 1，數量真的有限，賣完就沒有了！\n我們伊果代購十年信譽，品質售後都有保障 💪\n\n#伊果國外精品代購 #直播精品 #${brandName}`,
    },
    minimal: {
      short: `${brandName} ${productName}${tagStr ? `\n${tagStr}` : ""}\n\n${custom || "品味，無需多言。"}\n\n伊果國外精品代購`,
      long: `${brandName}\n${productName}\n\n${tagStr ? `— ${tagStr} —\n\n` : ""}${type === "精品包" ? "經典的輪廓，雋永的工藝。\n每一個細節都訴說著品牌的堅持與傳承。" : type === "名錶" ? "時間的藝術，腕間的風景。\n精準的機芯，永恆的優雅。" : "簡約而不簡單。\n真正的奢華，藏在每一個細節之中。"}\n\n${custom ? `${custom}\n\n` : ""}歡迎私訊詢問\n\n伊果國外精品代購\n代購經驗十年 · 品質保證\n\n#${brandName} #精品 #伊果國外精品代購`,
    },
    ai: {
      short: `💎 ${brandName}${productName}${tagStr ? ` | ${tagStr}` : ""}\n\n${custom || "嚴選好物，為您的品味加分。"}代購十年，信譽保證 ✨\n\n📩 私訊了解更多`,
      long: `💎 ${brandName} ${productName}\n\n${tagStr ? `▪️ ${tags.join("\n▪️ ")}\n\n` : ""}在追求品質的路上，我們始終相信：真正的精品，值得被用心對待。\n\n${type === "精品包" ? "這款包袋融合了品牌最經典的設計語言，無論是皮革的選材、五金的打磨，還是車線的精密度，都展現了頂級工藝的水準。" : type === "名錶" ? "這款腕錶凝聚了品牌數十年的製錶工藝，從機芯的精密運轉到錶殼的完美拋光，每一處都彰顯著對時間藝術的極致追求。" : "這款單品完美詮釋了品牌的設計哲學——在簡約中見奢華，在細節中見功力。"}\n\n${custom ? `${custom}\n\n` : ""}🔹 伊果國外精品代購\n🔹 十年代購經驗\n🔹 四大洲親自採買\n🔹 售後保固保修\n\n📩 有興趣歡迎私訊\n\n#伊果國外精品代購 #${brandName} #精品代購 #代購推薦`,
    },
  };

  return templates[style]?.[length] || templates.seed.short;
}

function generateHashtags(brand: string, type: string, tags: string[]): string[] {
  const base = ["伊果國外精品代購", "精品代購", "代購推薦", "精品"];
  if (brand) base.push(brand);
  if (type) base.push(type);
  if (tags.includes("限量款")) base.push("限量");
  if (tags.includes("經典款")) base.push("經典款");
  if (tags.includes("新款/當季")) base.push("新品上市");
  if (tags.includes("明星同款")) base.push("明星同款");
  base.push("精品穿搭", "精品開箱", "代購好物");
  return Array.from(new Set(base));
}

export default function CopyWriter() {
  const [copyStyle, setCopyStyle] = useState("seeding");
  const [copyLength, setCopyLength] = useState("short");
  const [brand, setBrand] = useState("");
  const [productType, setProductType] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState("");
  const [generatedCopy, setGeneratedCopy] = useState("");
  const [hashtags, setHashtags] = useState<string[]>([]);
  const generateMutation = trpc.copywriter.generate.useMutation({
    onSuccess: (data) => {
      const text = typeof data.content === "string" ? data.content : "";
      setGeneratedCopy(text);
      // Extract hashtags from AI output or generate locally
      const tags = generateHashtags(brand, productType, selectedTags);
      setHashtags(tags);
      toast.success("文案生成完成！");
    },
    onError: (err) => {
      toast.error("生成失敗：" + err.message);
    },
  });

  const rewriteMutation = trpc.copywriter.rewrite.useMutation({
    onSuccess: (data) => {
      const text = typeof data.content === "string" ? data.content : "";
      setGeneratedCopy(text);
      toast.success("文案已 AI 改寫優化！");
    },
    onError: (err) => {
      toast.error("改寫失敗：" + err.message);
    },
  });

  const generating = generateMutation.isPending;
  const optimizing = rewriteMutation.isPending;
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [copied, setCopied] = useState(false);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleGenerate = () => {
    if (!productType) {
      toast.error("請先選擇商品類型");
      return;
    }
    generateMutation.mutate({
      style: copyStyle as "seeding" | "live" | "minimal" | "ai",
      length: copyLength as "short" | "long",
      brand,
      productType,
      tags: selectedTags,
      customNote: customTag || undefined,
    });
  };

  const handleOptimize = () => {
    if (!generatedCopy) return;
    rewriteMutation.mutate({
      originalText: generatedCopy,
      style: copyStyle as "seeding" | "live" | "minimal" | "ai",
    });
  };

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("已複製到剪貼簿！");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement("textarea");
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      toast.success("已複製到剪貼簿！");
      setTimeout(() => setCopied(false), 2000);
    }
  }, []);

  return (
    <div className="min-h-screen py-8 sm:py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-10 sm:mb-14 animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <PenTool size={20} className="text-[oklch(0.72_0.08_75)]" />
            <h1 className="font-serif text-2xl sm:text-3xl tracking-[0.12em] text-[oklch(0.92_0.01_80)]">
              文案生成器
            </h1>
          </div>
          <div className="gold-divider max-w-[80px] mx-auto mb-4" />
          <p className="text-[oklch(0.55_0.02_60)] text-sm tracking-[0.05em]">
            一鍵生成精品代購專業文案
          </p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Input */}
          <div className="space-y-8 animate-fade-in" style={{ animationDelay: "0.1s", animationFillMode: "both" }}>
            {/* Copy Style */}
            <div>
              <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">文案風格</h3>
              <div className="grid grid-cols-2 gap-3">
                {copyStyles.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setCopyStyle(s.id)}
                    className={`p-4 rounded-sm border transition-all duration-300 text-left ${
                      copyStyle === s.id
                        ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                    }`}
                  >
                    <span className="block text-xs font-medium text-[oklch(0.82_0.01_80)] mb-1 tracking-[0.08em]">{s.label}</span>
                    <span className="text-[10px] text-[oklch(0.45_0.02_60)]">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Copy Length */}
            <div>
              <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">文案長度</h3>
              <div className="flex gap-3">
                {copyLengths.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setCopyLength(l.id)}
                    className={`flex-1 p-3 rounded-sm border transition-all duration-300 text-center ${
                      copyLength === l.id
                        ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/8%)]"
                        : "border-[oklch(0.25_0.01_65/30%)] hover:border-[oklch(0.72_0.08_75/30%)]"
                    }`}
                  >
                    <span className="block text-xs text-[oklch(0.82_0.01_80)] mb-0.5">{l.label}</span>
                    <span className="text-[10px] text-[oklch(0.45_0.02_60)]">{l.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Name */}
            <div>
              <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">品牌 / 商品名稱</h3>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="例：Chanel、Hermès、LV"
                className="w-full bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-4 py-3 text-sm text-[oklch(0.92_0.01_80)] placeholder:text-[oklch(0.35_0.02_60)] focus:border-[oklch(0.72_0.08_75/50%)] focus:outline-none transition-colors tracking-[0.03em]"
              />
            </div>

            {/* Product Type */}
            <div>
              <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">商品類型</h3>
              <div className="relative">
                <button
                  onClick={() => setShowTypeDropdown(!showTypeDropdown)}
                  className="w-full bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-4 py-3 text-sm text-left flex items-center justify-between hover:border-[oklch(0.72_0.08_75/30%)] transition-colors"
                >
                  <span className={productType ? "text-[oklch(0.92_0.01_80)]" : "text-[oklch(0.35_0.02_60)]"}>
                    {productType || "選擇商品類型"}
                  </span>
                  <ChevronDown size={14} className={`text-[oklch(0.5_0.02_60)] transition-transform ${showTypeDropdown ? "rotate-180" : ""}`} />
                </button>
                {showTypeDropdown && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm z-20 overflow-hidden">
                    {productTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => { setProductType(type); setShowTypeDropdown(false); }}
                        className={`w-full px-4 py-2.5 text-sm text-left hover:bg-[oklch(0.72_0.08_75/8%)] transition-colors ${
                          productType === type ? "text-[oklch(0.72_0.08_75)]" : "text-[oklch(0.7_0.01_80)]"
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Product Tags */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)]">商品特性標籤</h3>
                <Tooltip>
                  <TooltipTrigger><Info size={13} className="text-[oklch(0.4_0.02_60)]" /></TooltipTrigger>
                  <TooltipContent className="bg-[oklch(0.18_0.005_60)] border-[oklch(0.72_0.08_75/20%)] text-[oklch(0.82_0.01_80)]">
                    <p className="text-xs">選擇適用的標籤，文案會自動融入這些特性</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex flex-wrap gap-2">
                {productTags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1.5 rounded-sm text-xs tracking-[0.03em] border transition-all duration-300 ${
                      selectedTags.includes(tag)
                        ? "border-[oklch(0.72_0.08_75/60%)] bg-[oklch(0.72_0.08_75/12%)] text-[oklch(0.72_0.08_75)]"
                        : "border-[oklch(0.25_0.01_65/30%)] text-[oklch(0.6_0.02_60)] hover:border-[oklch(0.72_0.08_75/30%)]"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Tag */}
            <div>
              <h3 className="text-sm tracking-[0.1em] text-[oklch(0.82_0.01_80)] mb-4">自訂特性</h3>
              <input
                type="text"
                value={customTag}
                onChange={(e) => setCustomTag(e.target.value)}
                placeholder="輸入其他商品特性或補充說明"
                className="w-full bg-[oklch(0.14_0.005_60)] border border-[oklch(0.25_0.01_65/50%)] rounded-sm px-4 py-3 text-sm text-[oklch(0.92_0.01_80)] placeholder:text-[oklch(0.35_0.02_60)] focus:border-[oklch(0.72_0.08_75/50%)] focus:outline-none transition-colors tracking-[0.03em]"
              />
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="w-full btn-luxury-filled py-4 rounded-sm text-sm tracking-[0.1em] flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  生成文案
                </>
              )}
            </button>
          </div>

          {/* Right: Output */}
          <div className="space-y-6 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
            {/* Generated Copy */}
            <div className="luxury-card rounded-sm p-6 sm:p-8 min-h-[300px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm tracking-[0.1em] text-[oklch(0.72_0.08_75)] font-serif">生成結果</h3>
                {generatedCopy && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleOptimize}
                      disabled={optimizing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] tracking-[0.08em] border border-[oklch(0.72_0.08_75/30%)] text-[oklch(0.72_0.08_75)] hover:bg-[oklch(0.72_0.08_75/8%)] transition-colors disabled:opacity-50"
                    >
                      {optimizing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                      AI 改寫
                    </button>
                    <button
                      onClick={() => handleCopy(generatedCopy)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] tracking-[0.08em] border border-[oklch(0.72_0.08_75/30%)] text-[oklch(0.72_0.08_75)] hover:bg-[oklch(0.72_0.08_75/8%)] transition-colors"
                    >
                      {copied ? <Check size={11} /> : <Copy size={11} />}
                      {copied ? "已複製" : "複製"}
                    </button>
                  </div>
                )}
              </div>

              {generatedCopy ? (
                <div className="text-sm text-[oklch(0.82_0.01_80)] leading-relaxed whitespace-pre-wrap font-light">
                  {generatedCopy}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 text-center">
                  <PenTool size={24} className="text-[oklch(0.25_0.01_65)] mb-3" />
                  <p className="text-[oklch(0.4_0.02_60)] text-xs tracking-[0.05em]">
                    填寫左側資訊後點擊「生成文案」
                  </p>
                </div>
              )}
            </div>

            {/* Hashtags */}
            {hashtags.length > 0 && (
              <div className="luxury-card rounded-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Hash size={14} className="text-[oklch(0.72_0.08_75)]" />
                    <h3 className="text-sm tracking-[0.1em] text-[oklch(0.72_0.08_75)] font-serif">Hashtag</h3>
                  </div>
                  <button
                    onClick={() => handleCopy(hashtags.map((t) => `#${t}`).join(" "))}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[10px] tracking-[0.08em] border border-[oklch(0.72_0.08_75/30%)] text-[oklch(0.72_0.08_75)] hover:bg-[oklch(0.72_0.08_75/8%)] transition-colors"
                  >
                    <Copy size={11} />
                    一鍵複製
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {hashtags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-1 rounded-sm text-xs text-[oklch(0.72_0.08_75/80%)] bg-[oklch(0.72_0.08_75/8%)] border border-[oklch(0.72_0.08_75/15%)]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Full Copy + Hashtags */}
            {generatedCopy && hashtags.length > 0 && (
              <button
                onClick={() => handleCopy(`${generatedCopy}\n\n${hashtags.map((t) => `#${t}`).join(" ")}`)}
                className="w-full btn-luxury py-3 rounded-sm text-xs tracking-[0.1em] flex items-center justify-center gap-2"
              >
                <Copy size={14} />
                一鍵複製文案 + Hashtag
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
