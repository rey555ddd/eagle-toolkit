import { Sparkles } from "lucide-react";

interface Props {
  message?: string;
}

export default function LoadingBanner({ message = "Gemini AI 生成中..." }: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-4">
      <div className="relative">
        <div
          className="w-12 h-12 rounded-full animate-spin"
          style={{ border: "2px solid rgba(212,160,23,0.15)", borderTopColor: "oklch(0.72 0.08 75)" }}
        />
        <Sparkles className="absolute inset-0 m-auto w-5 h-5" style={{ color: "oklch(0.72 0.08 75)", opacity: 0.8 }} />
      </div>
      <p
        className="text-xs tracking-[0.06em] animate-pulse"
        style={{ color: "rgba(255,255,255,0.4)" }}
      >
        {message}
      </p>
    </div>
  );
}
