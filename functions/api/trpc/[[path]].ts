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

const TEXT_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

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
      if (msg.includes('503') || msg.includes('overloaded') || msg.includes('high demand')) {
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

  // Use Imagen 3 to generate composite image
  const fullPrompt = `${prompt} Product: ${productDesc}. Ultra-high quality commercial photography, 8K resolution, perfect lighting, no text, no watermark, photorealistic.`;

  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-001',
    prompt: fullPrompt,
    config: {
      numberOfImages: 1,
      aspectRatio: '1:1',
      safetyFilterLevel: 'BLOCK_ONLY_HIGH' as never,
    },
  });

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
  const ai = getGenAIClient(env);
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  throw new Error('Gemini fallback did not return image data');
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
          seeding:
            '種草帶貨風格（引發購買慾望、情境代入、製造 FOMO 感、口語化但有質感）',
          live: '直播導購風格（口播節奏感強、有緊迫感、適合直播時唸出來、有互動感）',
          minimal: '精品極簡風格（簡潔優雅、留白感、像精品品牌官方文案、字字珠璣）',
          ai: 'AI 優化風格（綜合以上優點、最自然流暢、最有說服力的版本）',
        };

        const lengthMap: Record<string, string> = {
          short: '短文案（50-100字，精煉有力，適合 IG 限動或貼文標題）',
          long: '長文案（200-400字，完整描述商品魅力、包含情境描述、特色亮點、購買理由）',
        };

        const tagLabels = input.tags.join('、');

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

品牌/商品名稱：${input.brand || '（精品）'}
商品類型：${input.productType || '精品'}
商品特性：${tagLabels || '（未指定）'}
${input.customNote ? `補充說明：${input.customNote}` : ''}

文案風格：${styleMap[input.style]}

請直接輸出文案內容，不需要任何前言或說明。`;

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
            '種草帶貨風格（更有購買慾望、更有情境感、更能引發共鳴）',
          live: '直播導購風格（更有節奏感、更適合口播、更有現場感）',
          minimal: '精品極簡風格（更簡潔優雅、更有精品感、字字珠璣）',
          ai: '最優化版本（最自然流暢、最有說服力、最適合社群發佈）',
        };

        const systemPrompt = `你是一位頂尖的精品代購文案改寫專家，專門優化台灣精品代購業者「伊果國外精品代購」的社群媒體文案。改寫時保留原文的核心資訊，但讓文案更有質感、更有說服力、更有情感溫度。使用繁體中文。`;

        const userPrompt = `請將以下文案改寫為${styleMap[input.style]}：

原文：
${input.originalText}

請直接輸出改寫後的完整文案，不需要任何前言或說明。`;

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

        const prompt = bgPrompts[input.backgroundStyle];

        let resultBase64: string;
        let usedFallback = false;

        try {
          // Try primary method: Imagen 3
          resultBase64 = await generateWithImagen(
            ctx.env,
            prompt,
            input.imageBase64,
            input.mimeType
          );
        } catch (imagenError) {
          console.warn('[Imagen 3 failed, trying Gemini fallback]', imagenError);
          try {
            // Fallback: Gemini 2.5 Flash image generation
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
                fallbackError instanceof Error
                  ? fallbackError.message
                  : String(fallbackError)
              }`
            );
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
