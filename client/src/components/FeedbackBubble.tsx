import { useState } from "react";
import { useLocation } from "wouter";
import { Bug, Lightbulb, Copy } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

type Kind = "bug" | "wish";

const SITE_LABEL = "eagle.reyway.com 蹦闆精品工具";
const REPO_NAME = "rey555ddd/eagle-toolkit";

export default function FeedbackBubble() {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [location] = useLocation();

  const reset = () => {
    setTitle("");
    setDetail("");
  };

  const buildMarkdown = () => {
    const head = kind === "bug" ? "🐛 Bug 回報" : "💡 許願 / 改善建議";
    return [
      `# ${head}：${title}`,
      "",
      `- 類型：${kind === "bug" ? "Bug" : "Wish"}`,
      `- 頁面：${location}`,
      `- 時間：${new Date().toLocaleString("zh-TW")}`,
      "",
      "## 詳細描述",
      detail,
      "",
      "---",
      `**提示給 Claude Code**：這是 ${SITE_LABEL} 的${kind === "bug" ? "Bug 回報" : "許願"}。`,
      kind === "bug"
        ? "請依上述描述定位問題、修復、commit、push。"
        : "請評估可行性，列出 1-2 個具體做法後再動工。",
      `\nRepo：${REPO_NAME}。`,
    ].join("\n");
  };

  const handleCopy = async () => {
    if (!title.trim() || !detail.trim()) {
      toast.warning("請填寫標題和詳細描述");
      return;
    }
    try {
      await navigator.clipboard.writeText(buildMarkdown());
      toast.success("✓ 已複製為可貼給 Claude Code 的提示詞");
      setTimeout(() => {
        reset();
        setOpen(false);
      }, 1200);
    } catch {
      toast.error("複製失敗，請手動選取");
    }
  };

  return (
    <>
      {/* Floating launcher — bottom-left */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: "fixed",
          bottom: "1.25rem",
          left: "1.25rem",
          zIndex: 40,
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          height: "2.5rem",
          paddingLeft: "1rem",
          paddingRight: "1rem",
          borderRadius: "9999px",
          fontSize: "0.875rem",
          fontWeight: 500,
          border: "1px solid rgba(212,160,23,0.4)",
          color: "oklch(0.72 0.08 75)",
          background: "rgba(212,160,23,0.06)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
          cursor: "pointer",
          transition: "transform 0.15s",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
        }}
        aria-label="回報問題或提出建議"
      >
        <span>💬</span>
        <span>有問題按我</span>
      </button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) reset();
        }}
      >
        <DialogContent
          className="max-w-md p-0 gap-0"
          style={{
            background: "oklch(0.1 0.01 260)",
            border: "1px solid rgba(212,160,23,0.15)",
            color: "rgba(255,255,255,0.85)",
          }}
        >
          <DialogTitle className="sr-only">Bug 回報 / 許願池</DialogTitle>

          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: "rgba(212,160,23,0.15)", background: "oklch(0.08 0.01 260)" }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">💡</span>
              <div>
                <div className="text-sm font-bold" style={{ color: "oklch(0.72 0.08 75)" }}>
                  Bug 回報 / 許願池
                </div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.45)" }}>
                  內部測試通道
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b" style={{ borderColor: "rgba(212,160,23,0.15)" }}>
            {(["bug", "wish"] as Kind[]).map((k) => (
              <button
                key={k}
                onClick={() => setKind(k)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm border-b-2 transition"
                style={{
                  borderBottomColor: kind === k ? "oklch(0.72 0.08 75)" : "transparent",
                  color: kind === k ? "oklch(0.72 0.08 75)" : "rgba(255,255,255,0.45)",
                  background: kind === k ? "rgba(212,160,23,0.06)" : "transparent",
                }}
              >
                {k === "bug" ? (
                  <Bug className="w-4 h-4" />
                ) : (
                  <Lightbulb className="w-4 h-4" />
                )}
                {k === "bug" ? "Bug 回報" : "許願池"}
              </button>
            ))}
          </div>

          {/* Form */}
          <div className="p-4 space-y-3">
            <div className="space-y-1">
              <label
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                {kind === "bug" ? "問題標題（必填）" : "許願標題（必填）"}
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="一句話標題"
                maxLength={100}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,160,23,0.2)",
                  color: "rgba(255,255,255,0.85)",
                }}
              />
            </div>
            <div className="space-y-1">
              <label
                className="text-xs font-medium"
                style={{ color: "rgba(255,255,255,0.6)" }}
              >
                詳細描述（必填）
              </label>
              <textarea
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder={
                  kind === "bug"
                    ? "在哪個頁面、點了什麼、期望什麼、實際發生什麼..."
                    : "告訴我們你希望多什麼功能、或哪裡用起來不順..."
                }
                rows={4}
                className="w-full px-3 py-2 text-sm rounded-lg outline-none resize-none"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(212,160,23,0.2)",
                  color: "rgba(255,255,255,0.85)",
                }}
              />
            </div>
          </div>

          {/* Footer */}
          <div
            className="border-t px-4 pb-4 pt-3"
            style={{ borderColor: "rgba(212,160,23,0.15)" }}
          >
            <div className="text-[10px] mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>
              頁面：{location} · {new Date().toLocaleString("zh-TW")}
            </div>
            <button
              onClick={handleCopy}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition"
              style={{
                background: "rgba(212,160,23,0.85)",
                color: "rgba(0,0,0,0.85)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,160,23,1)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.background = "rgba(212,160,23,0.85)";
              }}
            >
              <Copy className="w-4 h-4" />
              複製給 Claude Code
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
