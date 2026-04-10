import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

describe("Gemini API Key", () => {
  it("GEMINI_API_KEY 環境變數已正確設定", () => {
    expect(ENV.geminiApiKey).toBeTruthy();
    expect(ENV.geminiApiKey.length).toBeGreaterThan(10);
    expect(ENV.geminiApiKey).toMatch(/^AIza/);
  });
});

describe("copywriter router", () => {
  it("should have generate procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.copywriter.generate).toBe("function");
  });

  it("should have rewrite procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.copywriter.rewrite).toBe("function");
  });

  it("should reject invalid style enum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.copywriter.generate({
        style: "invalid" as "seeding",
        length: "short",
        brand: "Chanel",
        productType: "精品包",
        tags: ["經典款"],
      })
    ).rejects.toThrow();
  });

  it("should reject invalid length enum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.copywriter.generate({
        style: "seeding",
        length: "invalid" as "short",
        brand: "Chanel",
        productType: "精品包",
        tags: [],
      })
    ).rejects.toThrow();
  });
});

describe("imageProcessor router", () => {
  it("should have applyLuxuryBackground procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.imageProcessor.applyLuxuryBackground).toBe("function");
  });

  it("should have removeBackground procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.imageProcessor.removeBackground).toBe("function");
  });

  it("should reject invalid backgroundStyle enum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.imageProcessor.applyLuxuryBackground({
        imageBase64: "dGVzdA==",
        mimeType: "image/jpeg",
        backgroundStyle: "invalid-style" as "marble-white",
      })
    ).rejects.toThrow();
  });
});

describe("feedback router", () => {
  it("should have submit procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.feedback.submit).toBe("function");
  });

  it("should have list procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.feedback.list).toBe("function");
  });

  it("should have delete procedure defined", () => {
    const caller = appRouter.createCaller(createPublicContext());
    expect(typeof caller.feedback.delete).toBe("function");
  });

  it("should reject invalid category enum", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.feedback.submit({
        nickname: "測試用戶",
        category: "invalid" as "feature",
        content: "這是一條測試建議內容，超過五個字",
      })
    ).rejects.toThrow();
  });

  it("should reject content shorter than 5 chars", async () => {
    const caller = appRouter.createCaller(createPublicContext());
    await expect(
      caller.feedback.submit({
        nickname: "測試",
        category: "feature",
        content: "短",
      })
    ).rejects.toThrow();
  });
});
