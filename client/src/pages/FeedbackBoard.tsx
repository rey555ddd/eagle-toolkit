/*
 * 修改建議區 — 深藍紫色調，與黑金工具區做視覺區分
 * 功能：提交建議、查看所有建議、刪除自己的建議
 */
import { useState } from "react";
import { MessageSquarePlus, Send, Trash2, Clock, CheckCircle2, Loader2, RefreshCw, Lightbulb, Bug, Layout, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const CATEGORY_OPTIONS = [
  { id: "feature", label: "功能需求", icon: Lightbulb, color: "text-amber-400" },
  { id: "ui", label: "介面改善", icon: Layout, color: "text-sky-400" },
  { id: "bug", label: "Bug 回報", icon: Bug, color: "text-rose-400" },
  { id: "other", label: "其他", icon: HelpCircle, color: "text-slate-400" },
] as const;

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "待處理", color: "bg-slate-700 text-slate-300" },
  inprogress: { label: "處理中", color: "bg-blue-900 text-blue-300" },
  done: { label: "已完成", color: "bg-emerald-900 text-emerald-300" },
  closed: { label: "已關閉", color: "bg-gray-800 text-gray-500" },
};

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(date).getTime()) / 1000);
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return `${Math.floor(diff / 86400)} 天前`;
}

export default function FeedbackBoard() {
  const [nickname, setNickname] = useState("");
  const [category, setCategory] = useState<"feature" | "ui" | "bug" | "other">("feature");
  const [content, setContent] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteNickname, setDeleteNickname] = useState("");

  const { data: feedbackList, isLoading, refetch } = trpc.feedback.list.useQuery(undefined, {
    refetchInterval: 30000, // 每 30 秒自動刷新
  });

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: () => {
      toast.success("建議已提交，感謝您的回饋！");
      setContent("");
      setNickname("");
      refetch();
    },
    onError: (err) => {
      toast.error("提交失敗：" + err.message);
    },
  });

  const deleteMutation = trpc.feedback.delete.useMutation({
    onSuccess: () => {
      toast.success("建議已刪除");
      setDeletingId(null);
      setDeleteNickname("");
      refetch();
    },
    onError: (err) => {
      toast.error("刪除失敗：" + err.message);
    },
  });

  const handleSubmit = () => {
    if (!nickname.trim()) {
      toast.error("請填寫您的暱稱");
      return;
    }
    if (content.trim().length < 5) {
      toast.error("建議內容至少需要 5 個字");
      return;
    }
    submitMutation.mutate({ nickname: nickname.trim(), category, content: content.trim() });
  };

  const handleDelete = (id: number) => {
    if (!deleteNickname.trim()) {
      toast.error("請輸入您的暱稱以確認刪除");
      return;
    }
    deleteMutation.mutate({ id, nickname: deleteNickname.trim() });
  };


  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #0f0a2e 40%, #0a1628 100%)" }}>
      {/* 頁面標題 */}
      <div className="pt-24 pb-12 px-4 text-center">
        <div className="animate-fade-in-up">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, transparent, #818cf8)" }} />
            <MessageSquarePlus className="w-8 h-8" style={{ color: "#818cf8" }} />
            <div className="w-px h-8" style={{ background: "linear-gradient(to bottom, transparent, #818cf8)" }} />
          </div>
          <h1
            className="text-4xl sm:text-5xl font-light tracking-widest mb-4"
            style={{ fontFamily: "'Noto Serif TC', serif", color: "#c7d2fe" }}
          >
            修改建議區
          </h1>
          <div className="w-24 h-px mx-auto mb-6" style={{ background: "linear-gradient(to right, transparent, #818cf8, transparent)" }} />
          <p className="text-base font-light tracking-wide" style={{ color: "#94a3b8" }}>
            您的每一條建議都是我們進步的動力，歡迎提出功能需求、介面改善或 Bug 回報
          </p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 pb-20">
        {/* 提交表單 */}
        <div
          className="rounded-2xl p-6 sm:p-8 mb-10 animate-fade-in-up"
          style={{
            background: "rgba(30, 27, 75, 0.6)",
            border: "1px solid rgba(129, 140, 248, 0.25)",
            backdropFilter: "blur(12px)",
            boxShadow: "0 0 40px rgba(99, 102, 241, 0.1)",
            animationDelay: "0.2s",
            animationFillMode: "both",
          }}
        >
          <h2 className="text-xl font-light tracking-widest mb-6" style={{ color: "#c7d2fe", fontFamily: "'Noto Serif TC', serif" }}>
            提交建議
          </h2>

          {/* 暱稱 */}
          <div className="mb-5">
            <label className="block text-sm tracking-widest mb-2" style={{ color: "#94a3b8" }}>您的暱稱</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="請輸入暱稱（例如：笙哥）"
              maxLength={50}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200"
              style={{
                background: "rgba(15, 10, 46, 0.8)",
                border: "1px solid rgba(129, 140, 248, 0.2)",
                color: "#e2e8f0",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(129, 140, 248, 0.6)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(129, 140, 248, 0.2)"; }}
            />
          </div>

          {/* 建議類型 */}
          <div className="mb-5">
            <label className="block text-sm tracking-widest mb-3" style={{ color: "#94a3b8" }}>建議類型</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {CATEGORY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                const isSelected = category === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => setCategory(opt.id)}
                    className="flex flex-col items-center gap-2 py-3 px-2 rounded-xl text-sm transition-all duration-200"
                    style={{
                      background: isSelected ? "rgba(99, 102, 241, 0.25)" : "rgba(15, 10, 46, 0.6)",
                      border: isSelected ? "1px solid rgba(129, 140, 248, 0.6)" : "1px solid rgba(129, 140, 248, 0.15)",
                      color: isSelected ? "#c7d2fe" : "#64748b",
                    }}
                  >
                    <Icon className={`w-5 h-5 ${opt.color}`} />
                    <span className="tracking-wide">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 建議內容 */}
          <div className="mb-6">
            <label className="block text-sm tracking-widest mb-2" style={{ color: "#94a3b8" }}>
              建議內容
              <span className="ml-2 text-xs" style={{ color: "#475569" }}>（{content.length}/2000 字）</span>
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="請詳細描述您的建議或需求，例如：希望影片生成器能支援背景音樂選擇..."
              rows={5}
              maxLength={2000}
              className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all duration-200 resize-none"
              style={{
                background: "rgba(15, 10, 46, 0.8)",
                border: "1px solid rgba(129, 140, 248, 0.2)",
                color: "#e2e8f0",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(129, 140, 248, 0.6)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(129, 140, 248, 0.2)"; }}
            />
          </div>

          {/* 提交按鈕 */}
          <button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="flex items-center gap-2 px-8 py-3 rounded-lg text-sm tracking-widest transition-all duration-300 disabled:opacity-50"
            style={{
              background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
              color: "#fff",
              boxShadow: "0 4px 20px rgba(99, 102, 241, 0.3)",
            }}
          >
            {submitMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {submitMutation.isPending ? "提交中..." : "提交建議"}
          </button>
        </div>

        {/* 建議列表 */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-light tracking-widest" style={{ color: "#c7d2fe", fontFamily: "'Noto Serif TC', serif" }}>
              所有建議
              {feedbackList && (
                <span className="ml-3 text-sm" style={{ color: "#64748b" }}>（共 {feedbackList.length} 條）</span>
              )}
            </h2>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs tracking-wider transition-all duration-200"
              style={{
                background: "rgba(30, 27, 75, 0.6)",
                border: "1px solid rgba(129, 140, 248, 0.2)",
                color: "#818cf8",
              }}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              刷新
            </button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#818cf8" }} />
            </div>
          ) : !feedbackList || feedbackList.length === 0 ? (
            <div className="text-center py-20" style={{ color: "#475569" }}>
              <MessageSquarePlus className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p className="text-sm tracking-widest">尚無建議，成為第一個提交建議的人！</p>
            </div>
          ) : (
            <div
              className="space-y-4"
            >
              {feedbackList.map((item) => {
                const catOpt = CATEGORY_OPTIONS.find((c) => c.id === item.category);
                const CatIcon = catOpt?.icon ?? HelpCircle;
                const statusInfo = STATUS_MAP[item.status] ?? STATUS_MAP.pending;
                const isDeleting = deletingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="rounded-xl p-5 sm:p-6 animate-fade-in-up"
                    style={{
                      background: "rgba(20, 17, 55, 0.7)",
                      border: "1px solid rgba(129, 140, 248, 0.15)",
                      backdropFilter: "blur(8px)",
                      animationDelay: `${feedbackList.indexOf(item) * 0.08}s`,
                      animationFillMode: "both",
                    }}
                  >
                    {/* 頂部：暱稱 + 類型 + 狀態 + 時間 */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <span className="text-sm font-medium" style={{ color: "#c7d2fe" }}>
                        {item.nickname}
                      </span>
                      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(99, 102, 241, 0.15)", color: "#818cf8" }}>
                        <CatIcon className={`w-3 h-3 ${catOpt?.color ?? ""}`} />
                        {catOpt?.label ?? item.category}
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                      <span className="ml-auto flex items-center gap-1 text-xs" style={{ color: "#475569" }}>
                        <Clock className="w-3 h-3" />
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    {/* 建議內容 */}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap mb-3" style={{ color: "#94a3b8" }}>
                      {item.content}
                    </p>

                    {/* 管理員回覆 */}
                    {item.adminReply && (
                      <div className="mt-3 pl-4 py-3 rounded-lg" style={{ background: "rgba(16, 185, 129, 0.08)", borderLeft: "2px solid rgba(16, 185, 129, 0.4)" }}>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-xs tracking-widest text-emerald-400">官方回覆</span>
                        </div>
                        <p className="text-sm" style={{ color: "#6ee7b7" }}>{item.adminReply}</p>
                      </div>
                    )}

                    {/* 刪除按鈕 */}
                    {!isDeleting ? (
                      <button
                        onClick={() => setDeletingId(item.id)}
                        className="mt-3 flex items-center gap-1 text-xs transition-all duration-200 opacity-40 hover:opacity-80"
                        style={{ color: "#f87171" }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        刪除
                      </button>
                    ) : (
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <input
                          type="text"
                          value={deleteNickname}
                          onChange={(e) => setDeleteNickname(e.target.value)}
                          placeholder="輸入您的暱稱確認刪除"
                          className="px-3 py-1.5 rounded-lg text-xs outline-none"
                          style={{
                            background: "rgba(15, 10, 46, 0.8)",
                            border: "1px solid rgba(248, 113, 113, 0.3)",
                            color: "#e2e8f0",
                            width: "180px",
                          }}
                        />
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteMutation.isPending}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs transition-all duration-200"
                          style={{ background: "rgba(239, 68, 68, 0.2)", color: "#f87171", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                        >
                          {deleteMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                          確認刪除
                        </button>
                        <button
                          onClick={() => { setDeletingId(null); setDeleteNickname(""); }}
                          className="text-xs px-3 py-1.5 rounded-lg"
                          style={{ color: "#64748b", border: "1px solid rgba(100, 116, 139, 0.2)" }}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
