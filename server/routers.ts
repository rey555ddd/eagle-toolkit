import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { feedbacks } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { ENV } from "./_core/env";

// ─── Gemini 初始化（文案生成仍用 Gemini）─────────────────────────────────────
function getGeminiClient() {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY 未設定");
  return new GoogleGenerativeAI(apiKey);
}

// ─── GPT Image 2 精修（OpenAI images.edit）──────────────────────────────────
// 單一模式：原圖 + Prompt → 保留商品主體與所有文字、替換場景
async function refineWithGptImage(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = ENV.openaiApiKey;
  if (!apiKey) throw new Error("OPENAI_API_KEY 未設定，請至 Cloudflare Pages 環境變數配置");

  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });

  const form = new FormData();
  form.append("model", ENV.openaiImageModel);
  form.append("image", blob, mimeType === "image/png" ? "product.png" : "product.jpg");
  form.append("prompt", prompt);
  form.append("n", "1");
  form.append("size", "1024x1024");
  form.append("quality", "high");

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`GPT Image 失敗 (${res.status}): ${errText.slice(0, 500)}`);
  }

  const json = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
  const b64 = json.data?.[0]?.b64_json;
  if (b64) return b64;

  const url = json.data?.[0]?.url;
  if (url) {
    const imgRes = await fetch(url);
    const buf = new Uint8Array(await imgRes.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return btoa(bin);
  }

  throw new Error("GPT Image 未回傳圖片資料");
}

async function callGeminiText(systemPrompt: string, userPrompt: string): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: systemPrompt,
  });
  const result = await model.generateContent(userPrompt);
  return result.response.text();
}


export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── 文案生成器（Gemini gemini-2.5-flash）────────────────────────────────────
  copywriter: router({
    generate: publicProcedure
      .input(
        z.object({
          style: z.enum(["seeding", "live", "minimal", "ai"]),
          length: z.enum(["short", "long"]),
          brand: z.string().max(100),
          productType: z.string().max(50),
          tags: z.array(z.string()).max(20),
          customNote: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const styleMap: Record<string, string> = {
          seeding: "種草帶貨風格（引發購買慾望、情境代入、製造 FOMO 感、口語化但有質感）",
          live: "直播導購風格（口播節奏感強、有緊迫感、適合直播時唸出來、有互動感）",
          minimal: "精品極簡風格（簡潔優雅、留白感、像精品品牌官方文案、字字珠璣）",
          ai: "AI 優化風格（綜合以上優點、最自然流暢、最有說服力的版本）",
        };

        const lengthMap: Record<string, string> = {
          short: "短文案（50-100字，精煉有力，適合 IG 限動或貼文標題）",
          long: "長文案（200-400字，完整描述商品魅力、包含情境描述、特色亮點、購買理由）",
        };

        const tagLabels = input.tags.join("、");

        const systemPrompt = `你是一位頂尖的精品代購文案寫手，專門為台灣知名精品代購品牌「伊果國外精品代購」撰寫社群媒體文案。這個品牌在 Facebook 有 39 萬粉絲，代購經驗超過十年，遍及四大洲親自採買。

你的文案要求：
- 使用繁體中文，語氣自然流暢
- 有精品質感，不俗氣、不誇張
- 符合台灣 Facebook/Instagram 用戶的閱讀習慣
- 適當使用換行和段落，讓文案易讀
- 文案結尾自然帶出品牌名「伊果國外精品代購」
- emoji 使用要克制，最多 3-5 個，選用精品感符號（💎✨🔑👜⌚）
- Hashtag 另起一行放在最後，10-15個，繁體中文和英文混合
- 文案要真實、有說服力，像是真人在分享，不要像廣告稿
- 要有情感溫度，讓讀者感受到代購者對精品的熱愛與專業`;

        const userPrompt = `請為以下商品撰寫一篇${lengthMap[input.length]}：

品牌/商品名稱：${input.brand || "（精品）"}
商品類型：${input.productType || "精品"}
商品特性：${tagLabels || "（未指定）"}
${input.customNote ? `補充說明：${input.customNote}` : ""}

文案風格：${styleMap[input.style]}

請直接輸出文案內容，不需要任何前言或說明。`;

        const content = await callGeminiText(systemPrompt, userPrompt);
        return { content };
      }),

    rewrite: publicProcedure
      .input(
        z.object({
          originalText: z.string().max(2000),
          style: z.enum(["seeding", "live", "minimal", "ai"]),
        })
      )
      .mutation(async ({ input }) => {
        const styleMap: Record<string, string> = {
          seeding: "種草帶貨風格（更有購買慾望、更有情境感、更能引發共鳴）",
          live: "直播導購風格（更有節奏感、更適合口播、更有現場感）",
          minimal: "精品極簡風格（更簡潔優雅、更有精品感、字字珠璣）",
          ai: "最優化版本（最自然流暢、最有說服力、最適合社群發佈）",
        };

        const systemPrompt = `你是一位頂尖的精品代購文案改寫專家，專門優化台灣精品代購業者「伊果國外精品代購」的社群媒體文案。改寫時保留原文的核心資訊，但讓文案更有質感、更有說服力、更有情感溫度。使用繁體中文。`;

        const userPrompt = `請將以下文案改寫為${styleMap[input.style]}：

原文：
${input.originalText}

請直接輸出改寫後的完整文案，不需要任何前言或說明。`;

        const content = await callGeminiText(systemPrompt, userPrompt);
        return { content };
      }),
  }),

  // ─── 圖片精修（GPT Image 2 單一模式）───────────────────────────────────────
  // 流程：上傳商品原圖 → GPT Image 2 edit → 保留主體/文字+換場景
  imageProcessor: router({
    refine: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default("image/jpeg"),
          preset: z
            .enum([
              "marble-white",
              "marble-black",
              "velvet-black",
              "velvet-deep-blue",
              "gold-bokeh",
              "champagne-silk",
              "dark-wood",
              "mirror-reflection",
              "rose-petal",
              "crystal-light",
            ])
            .optional(),
          customPrompt: z.string().max(2000).optional(),
        })
      )
      .mutation(async ({ input }) => {
        const presets: Record<string, string> = {
          "marble-white": "Place the product on a pristine white Carrara marble surface with subtle gold veining. Soft studio lighting, clean minimalist composition, luxury product photography.",
          "marble-black": "Place the product on dramatic black marble with gold veining. Moody side lighting, deep shadows, high-end editorial luxury style.",
          "velvet-black": "Place the product on rich black velvet fabric. Dramatic side lighting, jewelry photography style, deep luxurious shadows.",
          "velvet-deep-blue": "Place the product on deep navy blue velvet background. Soft dramatic lighting, high fashion editorial style.",
          "gold-bokeh": "Place the product against a warm golden bokeh background. Champagne gold light halo, dreamy opulent atmosphere.",
          "champagne-silk": "Place the product on flowing champagne silk fabric with soft folds. Warm golden hour lighting, elegant and soft luxury.",
          "dark-wood": "Place the product on a dark walnut wood texture surface. Warm accent lighting, refined luxury lifestyle photography.",
          "mirror-reflection": "Place the product on a smooth mirror acrylic surface with perfect reflection. High-end commercial product photography.",
          "rose-petal": "Place the product surrounded by scattered rose petals on a dark background. Romantic opulent atmosphere, soft warm light.",
          "crystal-light": "Place the product with crystal prism light effects and rainbow light refraction. Jewelry photography style, magical luxury feel.",
        };

        const sceneInstruction = input.customPrompt?.trim()
          ? input.customPrompt.trim()
          : presets[input.preset ?? "marble-white"];

        // 強硬保護商品本體與所有文字/LOGO——GPT Image 2 的強項
        const prompt = [
          sceneInstruction,
          "CRITICAL: Keep the product itself completely identical to the input image — do NOT alter the product's shape, colors, materials, labels, packaging, or any text/logos on it.",
          "Preserve every character of Chinese, English, or other text on the product packaging with pixel-perfect accuracy.",
          "Only change the background scene and lighting around the product.",
          "Ultra-high quality commercial product photography, sharp focus on the product, photorealistic.",
        ].join(" ");

        const imageBase64 = await refineWithGptImage(prompt, input.imageBase64, input.mimeType);

        return {
          imageBase64,
          preset: input.preset,
          message: "✨ GPT Image 2 精修完成，商品文字 100% 保留",
        };
      }),
  }),

  // ─── 修改建議留言板 ───────────────────────────────────────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(
        z.object({
          nickname: z.string().min(1).max(50),
          category: z.enum(["feature", "ui", "bug", "other"]),
          content: z.string().min(5).max(2000),
        })
      )
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) {
          const reason = !process.env.DATABASE_URL
            ? "未設定 DATABASE_URL"
            : "連線初始化失敗（請檢查 server log）";
          throw new Error(`資料庫連線失敗：${reason}`);
        }
        try {
          await db.insert(feedbacks).values({
            nickname: input.nickname,
            category: input.category,
            content: input.content,
            status: "pending",
          });
          return { success: true };
        } catch (err) {
          console.error("[feedback.submit] insert failed:", err);
          const msg = err instanceof Error ? err.message : String(err);
          throw new Error(`送出失敗：${msg}`);
        }
      }),

    list: publicProcedure.query(async () => {
      const db = await getDb();
      if (!db) return [];
      const rows = await db
        .select()
        .from(feedbacks)
        .orderBy(desc(feedbacks.createdAt))
        .limit(100);
      return rows;
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number(), nickname: z.string() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new Error("資料庫連線失敗");
        const existing = await db
          .select()
          .from(feedbacks)
          .where(eq(feedbacks.id, input.id))
          .limit(1);
        if (!existing[0] || existing[0].nickname !== input.nickname) {
          throw new Error("無法刪除此建議");
        }
        await db.delete(feedbacks).where(eq(feedbacks.id, input.id));
        return { success: true };
      }),
  }),

  // ─── 採購助手（Abby 專用）────────────────────────────────────────────────────
  // 密碼守門由 /api/abby-login cookie 處理；dev mode 不支援（僅 production CF Pages 跑）
  purchase: router({
    batchRecognize: publicProcedure
      .input(
        z.object({
          images: z
            .array(z.string().min(1))
            .min(1, "至少上傳 1 張照片")
            .max(60, "單次最多 60 張（成本控制）"),
        })
      )
      .mutation(async () => {
        throw new Error("採購助手僅在 production（Cloudflare Pages）環境執行，dev mode 不支援。");
      }),
  }),

  // ─── 賣家雷達（Abby 專用）────────────────────────────────────────────────────
  // 密碼守門由 /api/abby-login cookie 處理；dev mode stub（不支援）
  eagleRadar: router({
    scanNow: publicProcedure
      .input(z.object({ keywords: z.array(z.string().min(1)).optional() }).optional())
      .mutation(async () => {
        throw new Error("賣家雷達僅在 production（Cloudflare Pages）環境執行，dev mode 不支援。");
      }),

    listPending: publicProcedure
      .input(
        z.object({
          status: z.enum(["pending", "contacted", "matched", "rejected", "all"]).default("pending"),
        }).optional()
      )
      .query(async () => {
        throw new Error("賣家雷達僅在 production（Cloudflare Pages）環境執行，dev mode 不支援。");
      }),

    updateStatus: publicProcedure
      .input(
        z.object({
          id: z.string().min(1),
          status: z.enum(["pending", "contacted", "matched", "rejected"]),
        })
      )
      .mutation(async () => {
        throw new Error("賣家雷達僅在 production（Cloudflare Pages）環境執行，dev mode 不支援。");
      }),

    getCostThisMonth: publicProcedure
      .query(async () => {
        throw new Error("賣家雷達僅在 production（Cloudflare Pages）環境執行，dev mode 不支援。");
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── 採購助手輔助函式 ─────────────────────────────────────────────────────────

function buildFormattedName(
  seq: number, brand: string, model: string, color: string,
  size: string | null, serial: string | null, features: string[],
): string {
  const f = features.join("")
  switch (brand) {
    case "LV": return `${seq}.LV${model}/${color}${serial ? ` ${serial}` : ""}`.trim()
    case "愛馬仕": return `${seq}.愛馬仕${model}${size ? ` ${size}` : ""}${color ? `/${color}` : ""}${features.length > 0 ? `/${features.join("/")}` : ""}`.trim()
    case "香奈兒": return `${seq}.香奈兒 ${model}/${color}${size ? ` ${size}` : ""}${f ? ` ${f}` : ""}`.trim()
    case "DIOR": return `${seq}.DIOR ${model}${color ? `/${color}` : ""}${features.length > 0 ? `/${features.join("")}` : ""}`.trim()
    case "GUCCI": return `${seq}.GUCCI${model}${color ? `/${color}` : ""}`.trim()
    case "YSL": return `${seq}.YSL ${model}${color ? `/${color}` : ""}${features.length > 0 ? `/${features.join("")}` : ""}`.trim()
    case "BV": return `${seq}.BV${model}${color ? `/${color}` : ""}`.trim()
    case "GOYARD": return `${seq}.GOYARD${model}${color ? `/${color}` : ""}`.trim()
    default: return `${seq}.${brand}${model}${color ? `/${color}` : ""}${size ? `/${size}` : ""}`.trim()
  }
}
