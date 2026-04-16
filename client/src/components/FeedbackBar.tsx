import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ThumbsUp, ThumbsDown, Award, Check } from "lucide-react";
import { toast } from "sonner";

interface Props {
  tool: string;
  toolContext?: string;
  outputText: string;
  className?: string;
}

type Rating = "up" | "down" | "gold";

export default function FeedbackBar({ tool, toolContext, outputText, className = "" }: Props) {
  const [submitted, setSubmitted] = useState<Rating | null>(null);
  const statusQuery = trpc.feedback.status.useQuery();

  const submitMutation = trpc.feedback.rateOutput.useMutation({
    onSuccess: (_, vars) => {
      setSubmitted(vars.rating as Rating);
      const msg =
        vars.rating === "up" ? "謝謝！已標為「採用」✅"
        : vars.rating === "down" ? "已記錄「重做」，AI 會學習"
        : "已存入金庫 🏆";
      toast.success(msg);
    },
    onError: () => toast.error("送出失敗，請稍後再試"),
  });

  const handleClick = (rating: Rating) => {
    if (submitted || submitMutation.isPending) return;
    submitMutation.mutate({ tool, toolContext, outputText, rating });
  };

  if (!statusQuery.data?.configured) {
    return (
      <div className={`text-[10px] tracking-[0.04em] ${className}`} style={{ color: "rgba(255,255,255,0.3)" }}>
        💡 D1 綁定後可給 AI 回饋
      </div>
    );
  }

  if (submitted) {
    return (
      <div className={`flex items-center gap-1.5 text-[11px] ${className}`} style={{ color: "oklch(0.6 0.1 150)" }}>
        <Check className="w-3 h-3" />
        已回饋：{submitted === "up" ? "採用" : submitted === "down" ? "重做" : "金庫 🏆"}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-[10px] tracking-[0.04em]" style={{ color: "rgba(255,255,255,0.4)" }}>這版好用嗎？</span>
      <button
        onClick={() => handleClick("up")}
        disabled={submitMutation.isPending}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] transition"
        style={{ border: "1px solid rgba(100,200,120,0.3)", color: "rgba(100,200,120,0.8)", background: "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(100,200,120,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <ThumbsUp className="w-3 h-3" /> 採用
      </button>
      <button
        onClick={() => handleClick("down")}
        disabled={submitMutation.isPending}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] transition"
        style={{ border: "1px solid rgba(220,80,80,0.3)", color: "rgba(220,80,80,0.8)", background: "transparent" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(220,80,80,0.1)")}
        onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
      >
        <ThumbsDown className="w-3 h-3" /> 重做
      </button>
      <button
        onClick={() => handleClick("gold")}
        disabled={submitMutation.isPending}
        className="inline-flex items-center gap-1 px-2 py-1 rounded-sm text-[10px] transition"
        style={{ border: "1px solid rgba(212,160,23,0.4)", color: "oklch(0.72 0.08 75)", background: "rgba(212,160,23,0.07)" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(212,160,23,0.15)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(212,160,23,0.07)")}
      >
        <Award className="w-3 h-3" /> 存金庫
      </button>
    </div>
  );
}
