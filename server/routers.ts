import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { getDb } from "./db";
import { feedbacks } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleGenAI, RawReferenceImage, EditMode } from "@google/genai";
import { ENV } from "./_core/env";

// ─── Gemini 初始化 ────────────────────────────────────────────────────────────
function getGeminiClient() {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY 未設定");
  return new GoogleGenerativeAI(apiKey);
}

function getGenAIClient() {
  const apiKey = ENV.geminiApiKey;
  if (!apiKey) throw new Error("GEMINI_API_KEY 未設定");
  return new GoogleGenAI({ apiKey });
}

// ─── Imagen 3 圖片生成（主要方案）────────────────────────────────────────────
async function generateWithImagen(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGenAIClient();

  // 先用 Gemini Vision 分析商品
  const visionModel = getGeminiClient().getGenerativeModel({ model: "gemini-2.5-flash" });
  const visionResult = await visionModel.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
      },
    },
    {
      text: "Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. Be concise and specific. English only.",
    },
  ]);
  const productDesc = visionResult.response.text().trim();

  // 使用 Imagen 3 生成合成圖
  const fullPrompt = `${prompt} Product: ${productDesc}. Ultra-high quality commercial photography, 8K resolution, perfect lighting, no text, no watermark, photorealistic.`;

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-001",
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
      safetyFilterLevel: "BLOCK_ONLY_HIGH" as never,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("Imagen 未返回圖片");

  return imageBytes; // base64
}

// ─── remove.bg 去背（商品棚拍模式：保留商品原始像素）────────────────────────
// 呼叫 remove.bg API，回傳透明背景 PNG base64
// 商品上所有文字、中文標示、logo 100% 保留，因為是原始像素

async function removeBackgroundApi(
  apiKey: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const binary = atob(imageBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const blob = new Blob([bytes], { type: mimeType });

  const formData = new FormData();
  formData.append("image_file", blob, "product.jpg");
  formData.append("size", "auto");

  const res = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": apiKey },
    body: formData,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`remove.bg 失敗 (${res.status}): ${errText}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const resultBytes = new Uint8Array(arrayBuffer);
  let bin = "";
  for (let i = 0; i < resultBytes.length; i++) bin += String.fromCharCode(resultBytes[i]);
  return btoa(bin); // 透明 PNG base64
}

// ─── Imagen 3 純背景生成（商品棚拍模式：只生成背景，不含商品）────────────────

async function generateBackgroundOnly(bgPrompt: string): Promise<string> {
  const ai = getGenAIClient();
  const prompt = `${bgPrompt} Empty studio background with no products, no objects, no text. Pure background texture and lighting only. Professional luxury product photography backdrop.`;

  const response = await ai.models.generateImages({
    model: "imagen-3.0-generate-001",
    prompt,
    config: {
      numberOfImages: 1,
      aspectRatio: "1:1",
      safetyFilterLevel: "BLOCK_ONLY_HIGH" as never,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("背景圖片生成失敗");
  return imageBytes; // base64
}

// ─── Imagen 3 Background Swap（商品棚拍模式：保留商品原貌）──────────────────
// 使用 editImage + EDIT_MODE_BGSWAP，AI 自動去背並套用新背景
// 商品上的文字、logo、中文包裝標示 100% 保留不變

async function generateWithImagenBgSwap(
  bgPrompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGenAIClient();

  const rawRef = new RawReferenceImage();
  rawRef.referenceImage = { imageBytes: imageBase64 };
  rawRef.referenceId = 0;

  const response = await ai.models.editImage({
    model: "imagen-3.0-capability-001",
    prompt: bgPrompt,
    referenceImages: [rawRef],
    config: {
      editMode: EditMode.EDIT_MODE_BGSWAP,
      numberOfImages: 1,
    },
  });

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("Imagen BGSWAP 未返回圖片");
  return imageBytes;
}

// ─── Gemini 2.0 Flash Exp 圖片生成（Fallback 方案）───────────────────────────
// gemini-2.0-flash-exp 是目前唯一支援 responseModalities IMAGE 輸出的 Gemini 模型
async function generateWithGeminiFallback(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGenAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash-exp",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: {
              data: imageBase64,
              mimeType: mimeType as "image/jpeg" | "image/png",
            },
          },
          {
            text: `${prompt} Use the product shown in the image. Generate a luxury product photography composite image. Return only the image.`,
          },
        ],
      },
    ],
    config: {
      responseModalities: ["IMAGE", "TEXT"],
    },
  });

  const parts = response.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      return part.inlineData.data;
    }
  }
  throw new Error("Gemini fallback 未返回圖片");
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

async function callGeminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const genAI = getGeminiClient();
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as "image/jpeg" | "image/png" | "image/webp",
      },
    },
    { text: prompt },
  ]);
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

  // ─── 圖片去背 + 背景合成（Imagen 3 AI 生成）────────────────────────────────
  imageProcessor: router({
    removeBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default("image/jpeg"),
        })
      )
      .mutation(async ({ input }) => {
        const analysisPrompt = `Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. English only.`;
        const productDescription = await callGeminiVision(analysisPrompt, input.imageBase64, input.mimeType);
        return {
          productDescription: productDescription.trim(),
          message: "圖片分析完成，請選擇背景進行合成",
        };
      }),

    applyLuxuryBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default("image/jpeg"),
          backgroundStyle: z.enum([
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
          ]),
          // 模式選擇
          // "ai-studio"  = AI 棚拍模式（remove.bg 去背 + Imagen 3 生成背景 + Canvas 合成）
          // "real-bg"    = 純去背模式（remove.bg 去背 + 自訂背景 + Canvas 合成，不跑 Imagen）
          // "lifestyle"  = 情境生活照（完整 Imagen 3 重新生成，原有邏輯不變）
          mode: z.enum(["ai-studio", "real-bg", "lifestyle"]).default("ai-studio"),
          colorLock: z.boolean().default(false),
          customBackgroundBase64: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const bgPrompts: Record<string, string> = {
          "marble-white": "luxury product photography on white Carrara marble surface with subtle gold veining, soft studio lighting, clean minimalist composition,",
          "marble-black": "luxury product photography on dramatic black marble with gold veining, moody side lighting, deep shadows, high-end editorial style,",
          "velvet-black": "luxury product photography on rich black velvet fabric, dramatic side lighting, jewelry photography style, deep shadows,",
          "velvet-deep-blue": "luxury product photography on deep navy blue velvet background, soft dramatic lighting, high fashion editorial,",
          "gold-bokeh": "luxury product photography with warm golden bokeh background, champagne gold light halo, dreamy opulent atmosphere,",
          "champagne-silk": "luxury product photography on flowing champagne silk fabric with soft folds, warm golden hour lighting, elegant and soft,",
          "dark-wood": "luxury product photography on dark walnut wood texture surface, warm accent lighting, refined lifestyle photography,",
          "mirror-reflection": "luxury product photography on smooth mirror/acrylic surface with perfect reflection, high-end commercial product photography,",
          "rose-petal": "luxury product photography surrounded by scattered rose petals on dark background, romantic opulent atmosphere, soft warm light,",
          "crystal-light": "luxury product photography with crystal prism light effects, rainbow light refraction, jewelry photography style, magical luxury,",
        };

        const prompt = bgPrompts[input.backgroundStyle];
        let resultBase64: string;
        let usedFallback = false;

        if (input.mode === "ai-studio" || input.mode === "real-bg") {
          // ── AI 棚拍 / 純去背：remove.bg 去背 + 背景（自訂或 Imagen 3 生成）──
          // 前端用 Canvas 合成，原始商品像素完整保留，文字 100% 清晰
          const removeBgKey = ENV.removeBgApiKey;
          if (!removeBgKey) throw new Error("REMOVE_BG_API_KEY 未設定，請在 Cloudflare Pages 環境變數中配置");

          if (input.mode === "real-bg" || input.customBackgroundBase64) {
            // real-bg 模式 or 有自訂背景：只去背，不呼叫 Imagen 3
            if (!input.customBackgroundBase64) {
              throw new Error("純去背模式需要提供背景照片（customBackgroundBase64）");
            }
            const cutoutBase64 = await removeBackgroundApi(removeBgKey, input.imageBase64, input.mimeType);
            return {
              imageBase64: null,
              cutoutBase64,
              backgroundBase64: input.customBackgroundBase64,
              useCanvas: true,
              backgroundStyle: input.backgroundStyle,
              usedFallback: false,
              message: "✨ 去背完成，使用自訂背景合成中",
            };
          }

          // ai-studio 模式，無自訂背景：Imagen 3 生成純背景
          const [cutoutBase64, backgroundBase64] = await Promise.all([
            removeBackgroundApi(removeBgKey, input.imageBase64, input.mimeType),
            generateBackgroundOnly(prompt),
          ]);

          return {
            imageBase64: null,
            cutoutBase64,       // 透明 PNG，前端 Canvas 用
            backgroundBase64,   // Imagen 3 純背景，前端 Canvas 用
            useCanvas: true,    // 通知前端用 Canvas 合成
            backgroundStyle: input.backgroundStyle,
            usedFallback: false,
            message: "✨ 去背完成，前端合成中",
          };
        } else {
          // ── 情境生活照模式：Imagen 3 重新生成（原有邏輯不變）──
          try {
            resultBase64 = await generateWithImagen(prompt, input.imageBase64, input.mimeType);
          } catch (imagenError) {
            console.warn("[Imagen 3 failed, trying Gemini fallback]", imagenError);
            try {
              resultBase64 = await generateWithGeminiFallback(prompt, input.imageBase64, input.mimeType);
              usedFallback = true;
            } catch (fallbackError) {
              console.error("[Gemini fallback also failed]", fallbackError);
              throw new Error(`AI 圖片生成失敗，請稍後重試。原因：${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}`);
            }
          }
          return {
            imageBase64: resultBase64,
            backgroundStyle: input.backgroundStyle,
            usedFallback,
            message: usedFallback ? "AI 圖片已生成（使用備用方案）" : "✨ Imagen 3 AI 圖片已生成",
          };
        }
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
});

export type AppRouter = typeof appRouter;
