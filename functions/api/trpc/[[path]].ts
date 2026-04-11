/**
 * Cloudflare Pages Functions: tRPC Handler
 * Handles all AI-powered routes for the eagle-toolkit project
 * Runs on Cloudflare Workers runtime (V8 isolates), not Node.js
 */

import { initTRPC } from '@trpc/server';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import superjson from 'superjson';
import { z } from 'zod';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleGenAI } from '@google/genai';

// ─── Environment & Context ────────────────────────────────────────────────────

interface Env {
  GEMINI_API_KEY: string;
}

interface Context {
  env: Env;
}

// ─── tRPC Setup ───────────────────────────────────────────────────────────────

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

const router = t.router;
const publicProcedure = t.procedure;

// ─── Gemini Clients ───────────────────────────────────────────────────────────

function getGeminiClient(env: Env): GoogleGenerativeAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Cloudflare Pages environment');
  return new GoogleGenerativeAI(apiKey);
}

function getGenAIClient(env: Env): GoogleGenAI {
  const apiKey = env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured in Cloudflare Pages environment');
  return new GoogleGenAI({ apiKey });
}

// ─── Helper: Base64 utilities for Workers runtime (no Buffer) ──────────────────

function base64ToUint8Array(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// ─── Gemini API Helpers ───────────────────────────────────────────────────────

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-flash-lite'];

async function callGeminiText(
  env: Env,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const genAI = getGeminiClient(env);
  let lastError: unknown;
  for (const modelName of TEXT_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName, systemInstruction: systemPrompt });
      const result = await model.generateContent(userPrompt);
      return result.response.text();
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('503') || msg.includes('404') || msg.includes('overloaded') || msg.includes('high demand') || msg.includes('no longer available')) {
        console.log(`Model ${modelName} overloaded, trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function callGeminiVision(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const genAI = getGeminiClient(env);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
  const result = await model.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    { text: prompt },
  ]);
  return result.response.text();
}

// ─── Image Generation with Fallback ───────────────────────────────────────────

async function generateWithImagen(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  const ai = getGenAIClient(env);

  // First, analyze the product with Gemini Vision
  const visionModel = getGeminiClient(env).getGenerativeModel({
    model: 'gemini-2.5-flash',
  });
  const visionResult = await visionModel.generateContent([
    {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
      },
    },
    {
      text: 'Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. Be concise and specific. English only.',
    },
  ]);
  const productDesc = visionResult.response.text().trim();

  // Use Imagen 4 for highest quality image generation
  const fullPrompt = `${prompt} Product: ${productDesc}. Ultra-high quality commercial photography, 8K resolution, perfect lighting, no text, no watermark, photorealistic.`;

  // Try Imagen 4 first (best quality), fallback to Imagen 3
  const IMAGEN_MODELS = ['imagen-4.0-generate-001', 'imagen-3.0-generate-001'];
  let response: Awaited<ReturnType<typeof ai.models.generateImages>> | null = null;
  for (const imgModel of IMAGEN_MODELS) {
    try {
      response = await ai.models.generateImages({
        model: imgModel,
        prompt: fullPrompt,
        config: {
          numberOfImages: 1,
          aspectRatio: '1:1',
          safetyFilterLevel: 'BLOCK_ONLY_HIGH' as never,
        },
      });
      if (response?.generatedImages?.[0]?.image?.imageBytes) break;
    } catch (e) {
      console.warn(`[Imagen ${imgModel} failed]`, e instanceof Error ? e.message : e);
      continue;
    }
  }

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error('Imagen did not return image bytes');

  return imageBytes;
}

async function generateWithGeminiFallback(
  env: Env,
  prompt: string,
  imageBase64: string,
  mimeType: string
): Promise<string> {
  // Must use image-capable model — gemini-2.5-flash-image supports image output
  const IMAGE_MODELS = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp'];
  const ai = getGenAIClient(env);
  let lastError: unknown;

  for (const modelName of IMAGE_MODELS) {
    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: mimeType as 'image/jpeg' | 'image/png',
                },
              },
              {
                text: `${prompt} Use the product shown in the image. Generate a luxury product photography composite image. Return only the image.`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      });

      const parts = response.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        if (part.inlineData?.data) {
          return part.inlineData.data;
        }
      }
      throw new Error(`Model ${modelName} did not return image data`);
    } catch (err: unknown) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[Image model ${modelName} failed]`, msg);
      if (msg.includes('503') || msg.includes('404') || msg.includes('only supports text') || msg.includes('no longer available')) {
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

// ─── tRPC Routes ──────────────────────────────────────────────────────────────

const appRouter = router({
  // ─── Text Copywriting ────────────────────────────────────────────────────────
  copywriter: router({
    generate: publicProcedure
      .input(
        z.object({
          style: z.enum(['seeding', 'live', 'minimal', 'ai']),
          length: z.enum(['short', 'long']),
          brand: z.string().max(100),
          productType: z.string().max(50),
          tags: z.array(z.string()).max(20),
          customNote: z.string().max(300).optional(),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const styleMap: Record<string, string> = {
          seeding: `種草帶貨風格。架構用 PAS（痛點→放大→解方）：\n1. 開頭用一個具體生活場景切入痛點或渴望（例：「每次出國逛精品店，看到價差都心痛」）\n2. 放大這個情緒——不解決會怎樣、解決了生活會有什麼改變\n3. 帶出商品作為解方，用五感描寫讓人「看到畫面」\n語氣：像閨蜜在跟你分享戰利品，口語、有溫度、偶爾自嘲`,
          live: `直播導購風格。架構用 AIDA（注意→興趣→慾望→行動）：\n1. 開頭要像在直播間喊話，短句、節奏快、有緊迫感\n2. 馬上丟出一個讓人停下來的數字或事實（價差、限量數、搶購速度）\n3. 用觸覺/視覺描寫讓觀眾「摸到」商品質感\n4. 結尾明確行動呼籲，製造稀缺感\n語氣：口播節奏、像面對面在賣場跟你講話`,
          minimal: `精品極簡風格。架構用 FABE（特色→優勢→好處→證據）：\n1. 用最少的字說最多的事，每個字都有任務\n2. 留白感——不說滿，讓讀者自己填入想像\n3. 像精品品牌官方 IG 的調性，冷靜但有力\n4. 一句話段落製造節奏，長短交錯\n語氣：克制、優雅、像品牌官方發言人`,
          ai: `綜合最優化風格。融合種草的情境感、直播的節奏感、極簡的質感：\n1. 開頭用 Hook 3秒法則：8字以內的短句抓住注意力\n2. 中段用 PAS 或 AIDA 架構推進\n3. 收尾不要太完美——用吐槽式、懸念式或突然結束式\n4. 全文至少一處五感描寫、一個具體數字\n語氣：最自然流暢，像一個有品味的朋友在聊天`,
        };

        const lengthMap: Record<string, string> = {
          short: '短文案（50-100字，精煉有力，適合 IG 限動或貼文標題）。短不代表弱——每句話都要有力道，像子彈不像散文。',
          long: '長文案（200-400字）。用六層架構：①提問題→②形容有多嚴重→③不解決的壞事/解決的好事→④解決問題→⑤形容解決後的感受→⑥為什麼你能解決。段落長短要參差不齊，有的一句話就一段。',
        };

        const tagLabels = input.tags.join('、');

        const systemPrompt = `你是「伊果國外精品代購」的首席文案——這個品牌 Facebook 39 萬粉絲、代購超過十年、四大洲親自採買。你寫的每一篇文案都要讓人停下拇指。

## 核心能力

你精通三大文案模型：
- AIDA：注意→興趣→慾望→行動
- PAS：痛點→放大→解方
- FABE：特色→優勢→好處→證據

## 情緒引擎（馬斯洛 7 情——選擇最適合商品的 1-2 個切角）

| 層級 | 情緒 | 切角範例 |
|------|------|---------|
| 自我實現 | 成就感 | 擁有它代表你走到了這一步 |
| 美好 | 美感愉悅 | 光是看著它放在桌上就覺得值了 |
| 認知 | 知識感 | 懂得欣賞這個細節的人不多 |
| 自尊 | 優越感 | 聰明的選擇，有品味的象徵 |
| 社交 | 歸屬感 | 送禮、犒賞自己、被看見 |
| 安全 | 安心感 | 正品保證、十年代購信譽 |
| 生理 | 舒適感 | 觸感、使用體驗的直覺滿足 |

## 五感寫作法（每篇至少出現一種）

- 視覺：不寫「很美」，寫「午後陽光打在皮面上，那個光澤會讓你多看兩眼」
- 觸覺：不寫「質感好」，寫「指尖滑過荔枝紋皮革，那種顆粒感會上癮」
- 嗅覺：「打開盒子的瞬間，皮革混著木質調的香氣撲過來」
- 聽覺：「金屬扣環 click 一聲扣上，那個聲音就是精品的聲音」

## Hook / 開頭 3 秒法則

前兩句決定生死。開頭策略（五選一）：
- 痛點型：說出讀者的困擾
- 賣點型：一句話秒懂獨特好處
- 驚點型：打破認知、製造意外
- 懸點型：勾起好奇心
- 暖點型：說出心聲、情感共鳴

## 去 AI 味守則（嚴格遵守）

1. 不用 emoji 當分類標題
2. 段落長短參差不齊——有的一句話就一段，有的寫長一點
3. 禁用：「整體」「氛圍」「超級」「真心覺得」「非常推薦」「不僅…更…」「無論…都…」「值得一提的是」
4. 推薦要帶具體細節——一個價差數字、一個觸感描寫、一個場景
5. 語氣全篇統一，結尾不要突然變正式
6. 結尾不要太正面太完美——可以用吐槽、懸念、或突然結束
7. 帶至少一個具體數字（用非圓整數更可信：「省了 8,700」比「省了快一萬」好）
8. 分析或推測加語氣緩衝：「可能」「我猜」「應該是」
9. 禁止句型：「在這個…的時代」「讓我們一起…」「相信你一定會…」「話不多說」「廢話不多說」
10. 最終檢驗：拿掉品牌名，讀起來要像一個有血有肉的人在說話

## 格式要求

- 繁體中文，符合台灣 FB/IG 閱讀習慣
- 適當換行，段落有呼吸感
- emoji 克制使用（最多 3 個，選精品感符號）
- Hashtag 另起一行放最後，8-12 個，中英混合
- 文案中自然帶出「伊果國外精品代購」（不要硬塞在最後一句）

## 行銷 4 有自檢

產出前確認：
- 有哏：能不能讓人想停下來看？
- 有關：跟目標讀者的生活有關嗎？
- 有感：能引起情感共鳴嗎？
- 有想要：看完會不會想買？`;

        const userPrompt = `請為以下商品撰寫一篇${lengthMap[input.length]}：

品牌/商品名稱：${input.brand || '（精品）'}
商品類型：${input.productType || '精品'}
商品特性：${tagLabels || '（未指定）'}
${input.customNote ? `補充說明：${input.customNote}` : ''}

文案風格：${styleMap[input.style]}

直接輸出文案，不要任何前言、說明、或「以下是文案」之類的開場。`;

        const content = await callGeminiText(ctx.env, systemPrompt, userPrompt);
        return { content };
      }),

    rewrite: publicProcedure
      .input(
        z.object({
          originalText: z.string().max(2000),
          style: z.enum(['seeding', 'live', 'minimal', 'ai']),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const styleMap: Record<string, string> = {
          seeding:
            '種草帶貨風格：用 PAS 架構（痛點→放大→解方），加入生活場景和五感描寫，語氣像閨蜜分享戰利品',
          live: '直播導購風格：用 AIDA 架構（注意→興趣→慾望→行動），短句快節奏、有數字有緊迫感、像面對面在講話',
          minimal: '精品極簡風格：用 FABE 架構（特色→優勢→好處→證據），字字珠璣、留白感、冷靜但有力',
          ai: '最優化版本：融合三種風格的優點，Hook 開頭、架構清晰、五感描寫、具體數字、結尾不落俗套',
        };

        const systemPrompt = `你是「伊果國外精品代購」的文案改寫專家。改寫時保留原文核心資訊，但大幅提升品質。

改寫原則：
1. 開頭換掉——用 Hook 3秒法則重寫第一句（痛點/賣點/驚點/懸點/暖點五選一）
2. 加入至少一處五感描寫（視覺畫面、觸覺質感、嗅覺記憶、聽覺細節）
3. 補一個具體數字（價差、限量數、年份——用非圓整數）
4. 段落長短參差不齊，用一句話段落製造節奏
5. 結尾不要太完美——吐槽式、懸念式、或突然結束式
6. 去 AI 味：禁用「整體」「氛圍」「不僅…更…」「在這個…的時代」「讓我們一起…」「話不多說」
7. 情緒切角：從馬斯洛 7 情中選最適合的（自尊/美好/社交/安全感）
8. 最終檢驗：拿掉品牌名，讀起來像不像一個真人寫的？

使用繁體中文，符合台灣 FB/IG 閱讀習慣。`;

        const userPrompt = `請將以下文案改寫為${styleMap[input.style]}：

原文：
${input.originalText}

直接輸出改寫後的完整文案，不要任何前言或說明。`;

        const content = await callGeminiText(ctx.env, systemPrompt, userPrompt);
        return { content };
      }),
  }),

  // ─── Image Processing ────────────────────────────────────────────────────────
  imageProcessor: router({
    removeBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default('image/jpeg'),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const analysisPrompt = `Describe this product in 1-2 sentences for luxury product photography. Include: product type, main color, material, and brand if visible. English only.`;
        const productDescription = await callGeminiVision(
          ctx.env,
          analysisPrompt,
          input.imageBase64,
          input.mimeType
        );
        return {
          productDescription: productDescription.trim(),
          message: '圖片分析完成，請選擇背景進行合成',
        };
      }),

    applyLuxuryBackground: publicProcedure
      .input(
        z.object({
          imageBase64: z.string().max(10_000_000),
          mimeType: z.string().default('image/jpeg'),
          backgroundStyle: z.enum([
            'marble-white',
            'marble-black',
            'velvet-black',
            'velvet-deep-blue',
            'gold-bokeh',
            'champagne-silk',
            'dark-wood',
            'mirror-reflection',
            'rose-petal',
            'crystal-light',
          ]),
          colorLock: z.boolean().default(false),
        })
      )
      .mutation(async ({ input, ctx }) => {
        const bgPrompts: Record<string, string> = {
          'marble-white':
            'luxury product photography on white Carrara marble surface with subtle gold veining, soft studio lighting, clean minimalist composition,',
          'marble-black':
            'luxury product photography on dramatic black marble with gold veining, moody side lighting, deep shadows, high-end editorial style,',
          'velvet-black':
            'luxury product photography on rich black velvet fabric, dramatic side lighting, jewelry photography style, deep shadows,',
          'velvet-deep-blue':
            'luxury product photography on deep navy blue velvet background, soft dramatic lighting, high fashion editorial,',
          'gold-bokeh':
            'luxury product photography with warm golden bokeh background, champagne gold light halo, dreamy opulent atmosphere,',
          'champagne-silk':
            'luxury product photography on flowing champagne silk fabric with soft folds, warm golden hour lighting, elegant and soft,',
          'dark-wood':
            'luxury product photography on dark walnut wood texture surface, warm accent lighting, refined lifestyle photography,',
          'mirror-reflection':
            'luxury product photography on smooth mirror/acrylic surface with perfect reflection, high-end commercial product photography,',
          'rose-petal':
            'luxury product photography surrounded by scattered rose petals on dark background, romantic opulent atmosphere, soft warm light,',
          'crystal-light':
            'luxury product photography with crystal prism light effects, rainbow light refraction, jewelry photography style, magical luxury,',
        };

        const basePrompt = bgPrompts[input.backgroundStyle];
        const colorLockInstruction = input.colorLock
          ? ' CRITICAL IMAGE EDITING INSTRUCTION: Keep the product EXACTLY as shown in the original photo. Preserve the EXACT same colors, patterns, details, shape, and textures. Do NOT alter, tint, recolor, or regenerate the product in any way. ONLY replace the background. The product must remain pixel-perfect identical to the input image.'
          : '';
        const prompt = basePrompt + colorLockInstruction;

        let resultBase64: string;
        let usedFallback = false;

        if (input.colorLock) {
          // Color Lock ON: MUST use Gemini which receives the actual image.
          // Imagen only generates from text prompt and cannot preserve original colors.
          try {
            resultBase64 = await generateWithGeminiFallback(
              ctx.env,
              prompt,
              input.imageBase64,
              input.mimeType
            );
            usedFallback = true;
          } catch (fallbackError) {
            console.error('[Gemini Color Lock generation failed]', fallbackError);
            throw new Error(
              `Color Lock generation failed. Please try again. Error: ${
                fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
              }`
            );
          }
        } else {
          try {
            // Primary method: Imagen (best quality for non-color-lock)
            resultBase64 = await generateWithImagen(
              ctx.env,
              prompt,
              input.imageBase64,
              input.mimeType
            );
          } catch (imagenError) {
            console.warn('[Imagen failed, trying Gemini fallback]', imagenError);
            try {
              resultBase64 = await generateWithGeminiFallback(
                ctx.env,
                prompt,
                input.imageBase64,
                input.mimeType
              );
              usedFallback = true;
            } catch (fallbackError) {
              console.error('[Gemini fallback also failed]', fallbackError);
              throw new Error(
                `AI image generation failed. Please try again later. Error: ${
                  fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
                }`
              );
            }
          }
        }

        // Return base64 directly (no S3 storage on Cloudflare Pages)
        return {
          imageBase64: resultBase64,
          backgroundStyle: input.backgroundStyle,
          usedFallback,
          message: usedFallback
            ? 'AI image generated (using fallback method)'
            : 'Imagen 3 AI image generated',
        };
      }),
  }),

  // ─── Feedback (Database-dependent - Mock responses) ──────────────────────────
  feedback: router({
    submit: publicProcedure
      .input(
        z.object({
          nickname: z.string().min(1).max(50),
          category: z.enum(['feature', 'ui', 'bug', 'other']),
          content: z.string().min(5).max(2000),
        })
      )
      .mutation(async () => {
        throw new Error(
          'Feedback feature requires database connection. Not available on Cloudflare Pages.'
        );
      }),

    list: publicProcedure.query(async () => {
      // Return empty list (database not available on CF Pages)
      return [];
    }),

    delete: publicProcedure
      .input(z.object({ id: z.number(), nickname: z.string() }))
      .mutation(async () => {
        throw new Error(
          'Feedback deletion requires database connection. Not available on Cloudflare Pages.'
        );
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Cloudflare Pages Function Handler ───────────────────────────────────────

export const onRequest: PagesFunction<Env> = async (context) => {
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req: context.request,
    router: appRouter,
    createContext: () => ({
      env: context.env as unknown as Env,
    }),
  });
};
