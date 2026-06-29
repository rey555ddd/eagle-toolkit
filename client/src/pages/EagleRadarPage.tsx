/**
 * EagleRadarPage — 蹦闆精品 Abby 潛在賣家雷達（Threads 掃描）
 * [2026-05-04 新建] 接 eagleRadar.* tRPC router（KV + Apify fire-and-poll 異步架構）
 * 路由：/eagle-radar
 */
import { useState } from "react";
import { toast } from "sonner";
import {
  Radar as RadarIcon,
  RefreshCw,
  ExternalLink,
  Activity,
  RotateCcw,
  Check,
  X,
  CircleDollarSign,
  Copy,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type EaglePost = {
  id: string;
  postUrl: string;
  author: string;
  authorId?: string;
  content: string;
  scrapedAt: string;
  publishedAt?: string;
  status: "pending" | "contacted" | "matched" | "rejected";
  source: "threads" | "facebook";
  keyword: string;
};

export default function EagleRadarPage() {
  return <EagleRadarContent />;
}

function EagleRadarContent() {
  const [statusFilter, setStatusFilter] = useState<"pending" | "contacted" | "matched" | "rejected" | "all">("pending");

  // listPending query — 進頁面自動跑（内部 best-effort auto-sync）
  const { data: posts, refetch, isFetching } = trpc.eagleRadar.listPending.useQuery(
    { status: statusFilter },
    { refetchOnWindowFocus: false }
  );

  // cost query
  const { data: costData, refetch: refetchCost } = trpc.eagleRadar.getCostThisMonth.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // scanNow — fire-only，立即回 runId
  const scanMut = trpc.eagleRadar.scanNow.useMutation({
    onSuccess: (res) => {
      if (res.status === "budget_exceeded") {
        toast.warning(res.message ?? "預算已滿");
        return;
      }
      const platformLabel = (res as any).platform === 'facebook' ? 'Facebook' : 'Threads';
      toast.success(`掃描已啟動（${platformLabel}・${res.keyword}），約 2-3 分鐘後自動同步，或點「同步結果」`);
      // 不立刻 refetch，等 actor 跑完
    },
    onError: (e) => toast.error("啟動掃描失敗：" + e.message),
  });

  // syncResults — 輪詢 actor 狀態，完成後入庫
  const syncMut = trpc.eagleRadar.syncResults.useMutation({
    onSuccess: (res) => {
      if (res.status === "no_pending") {
        toast.info("目前沒有進行中的掃描任務");
        return;
      }
      if (res.status === "still_running") {
        toast.info("掃描中...請稍候再試（Apify actor 尚未完成）");
        return;
      }
      if (res.status === "synced") {
        toast.success(`同步完成！爬到 ${res.scanned} 筆，新入庫 ${res.newCount} 筆`);
        refetch();
        refetchCost();
        return;
      }
      if (res.status === "run_failed") {
        toast.error(`掃描任務失敗（Apify status: ${(res as { runActorStatus?: string }).runActorStatus ?? "unknown"}）`);
        return;
      }
      toast.error("同步異常：" + res.status);
    },
    onError: (e) => toast.error("同步失敗：" + e.message),
  });

  // updateStatus
  const updateMut = trpc.eagleRadar.updateStatus.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });

  const handleRefresh = () => {
    refetch();
    refetchCost();
  };

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: "oklch(0.08 0.01 260)" }}>
      <div className="container mx-auto px-4 lg:px-8 max-w-5xl">

        {/* 頁首 */}
        <div className="pt-6 pb-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <RadarIcon size={22} style={{ color: "#f0c040" }} />
            <div>
              <h1 className="text-xl font-bold" style={{ color: "#f5f0e8" }}>
                Threads 賣家雷達
              </h1>
              <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                蹦闆精品 · 潛在賣家自動掃描
              </p>
            </div>
          </div>

          {/* 操作按鈕 */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => scanMut.mutate({})}
              disabled={scanMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #c9a84c, #f0c040)", color: "#0a0a0a" }}
            >
              {scanMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
              {scanMut.isPending ? "啟動中..." : "立即掃描"}
            </button>

            <button
              onClick={() => syncMut.mutate()}
              disabled={syncMut.isPending}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50"
              style={{
                background: "rgba(99,179,237,0.15)",
                border: "1px solid rgba(99,179,237,0.4)",
                color: "#93c5fd",
              }}
            >
              {syncMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : <RotateCcw size={12} />}
              {syncMut.isPending ? "同步中..." : "同步結果"}
            </button>

            <button
              onClick={handleRefresh}
              disabled={isFetching}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs disabled:opacity-50"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.1)",
                color: "rgba(255,255,255,0.6)",
              }}
            >
              <RefreshCw size={12} className={isFetching ? "animate-spin" : ""} />
              重整
            </button>
          </div>
        </div>

        {/* 本月費用 */}
        {costData && (
          <div
            className="mb-4 px-4 py-3 rounded-xl flex items-center gap-3 text-sm"
            style={{
              background: "rgba(201,168,76,0.07)",
              border: "1px solid rgba(201,168,76,0.2)",
            }}
          >
            <CircleDollarSign size={16} style={{ color: "#f0c040" }} />
            <span style={{ color: "rgba(255,255,255,0.6)" }}>
              本月費用：
              <span style={{ color: "#f0c040", fontWeight: 600 }}>NT${costData.costMonth}</span>
              {" "}/ 預算 NT${costData.budget}
              {" "}（{costData.percentUsed}% 已用）
            </span>
            {costData.lastRun && (
              <span className="ml-auto text-xs" style={{ color: "rgba(255,255,255,0.3)" }}>
                上次掃描：{new Date(costData.lastRun).toLocaleString("zh-TW")}
              </span>
            )}
          </div>
        )}

        {/* 狀態篩選 */}
        <div className="flex gap-1.5 mb-5 flex-wrap">
          {(["pending", "contacted", "matched", "rejected", "all"] as const).map((s) => {
            const labels = {
              pending: "待聯繫",
              contacted: "已聯繫",
              matched: "成交",
              rejected: "不符",
              all: "全部",
            };
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className="px-3 py-1.5 rounded-lg text-xs transition-all"
                style={{
                  background: statusFilter === s ? "rgba(240,192,64,0.2)" : "rgba(255,255,255,0.04)",
                  border: statusFilter === s ? "1px solid rgba(240,192,64,0.5)" : "1px solid rgba(255,255,255,0.1)",
                  color: statusFilter === s ? "#f0c040" : "rgba(255,255,255,0.5)",
                }}
              >
                {labels[s]}
              </button>
            );
          })}
        </div>

        {/* 貼文列表 */}
        {isFetching && !posts ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>
            載入中...
          </div>
        ) : !posts || posts.length === 0 ? (
          <EmptyState
            scanning={scanMut.isPending}
            onScan={() => scanMut.mutate({})}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <PostCard
                key={p.id}
                post={p as EaglePost}
                onUpdateStatus={(status) =>
                  updateMut.mutate({ id: p.id, status })
                }
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ scanning, onScan }: { scanning: boolean; onScan: () => void }) {
  return (
    <div
      className="py-16 text-center rounded-xl"
      style={{
        background: "rgba(255,255,255,0.02)",
        border: "1px dashed rgba(255,255,255,0.1)",
      }}
    >
      <RadarIcon size={36} className="mx-auto mb-3" style={{ color: "rgba(240,192,64,0.4)" }} />
      <p className="text-sm mb-2" style={{ color: "rgba(255,255,255,0.5)" }}>
        還沒有資料
      </p>
      <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.3)" }}>
        點「立即掃描」啟動 Apify actor，約 2-3 分鐘後再點「同步結果」
      </p>
      <button
        onClick={onScan}
        disabled={scanning}
        className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2"
        style={{ background: "linear-gradient(135deg, #c9a84c, #f0c040)", color: "#0a0a0a" }}
      >
        {scanning ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
        {scanning ? "啟動中..." : "立即執行第一次掃描"}
      </button>
    </div>
  );
}

function PostCard({
  post,
  onUpdateStatus,
}: {
  post: EaglePost;
  onUpdateStatus: (status: "pending" | "contacted" | "matched" | "rejected") => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(
      '歡迎諮詢伊果精品，我們高價收購。https://www.facebook.com/EagleShopping'
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const statusColors: Record<string, string> = {
    pending: "#f0c040",
    contacted: "#3b82f6",
    matched: "#22c55e",
    rejected: "#64748b",
  };
  const statusLabels: Record<string, string> = {
    pending: "待聯繫",
    contacted: "已聯繫",
    matched: "成交",
    rejected: "不符",
  };
  const color = statusColors[post.status] ?? "#94a3b8";

  const sourceBadge = {
    threads: { label: 'Threads', bg: 'rgba(168,85,247,0.2)', color: '#c4b5fd' },
    facebook: { label: 'Facebook', bg: 'rgba(59,130,246,0.2)', color: '#93c5fd' },
  };
  const badge = sourceBadge[post.source as keyof typeof sourceBadge] ?? sourceBadge.threads;

  const displayTime = post.publishedAt || post.scrapedAt;
  const ageMin = Math.floor((Date.now() - new Date(displayTime).getTime()) / 60000);
  const ageText =
    ageMin < 60
      ? `${ageMin} 分鐘前`
      : ageMin < 1440
      ? `${Math.floor(ageMin / 60)} 小時前`
      : `${Math.floor(ageMin / 1440)} 天前`;

  return (
    <div
      className="p-4 rounded-xl flex flex-col gap-3"
      style={{
        background: "rgba(255,255,255,0.03)",
        border: `1px solid ${color}30`,
        opacity: post.status === "rejected" ? 0.5 : 1,
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: badge.bg, color: badge.color }}
          >
            {badge.label}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: `${color}20`, color }}
          >
            {statusLabels[post.status] ?? post.status}
          </span>
          <span
            className="text-[10px] px-2 py-0.5 rounded"
            style={{ background: "rgba(240,192,64,0.1)", color: "#f0c040" }}
          >
            #{post.keyword}
          </span>
        </div>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          {ageText}
        </span>
      </div>

      {/* Content */}
      <div>
        <p
          className="text-xs font-medium mb-1"
          style={{ color: "rgba(255,255,255,0.7)" }}
        >
          @{post.author}
        </p>
        <p
          className="text-sm leading-relaxed line-clamp-4"
          style={{ color: "rgba(255,255,255,0.65)" }}
        >
          {post.content || "(無內文)"}
        </p>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1 flex-wrap">
        <button
          onClick={handleCopy}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-all"
          style={{
            background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(240,192,64,0.15)',
            border: copied ? '1px solid rgba(34,197,94,0.4)' : '1px solid rgba(240,192,64,0.4)',
            color: copied ? '#86efac' : '#f0c040',
          }}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? '已複製！' : '複製文案'}
        </button>

        <a
          href={post.postUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold min-w-[90px]"
          style={{
            background: "rgba(168,85,247,0.15)",
            border: "1px solid rgba(168,85,247,0.35)",
            color: "#c4b5fd",
          }}
        >
          <ExternalLink size={12} /> 開貼文
        </a>

        {post.status === "pending" && (
          <button
            onClick={() => onUpdateStatus("contacted")}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(59,130,246,0.15)",
              border: "1px solid rgba(59,130,246,0.35)",
              color: "#93c5fd",
            }}
          >
            <Check size={12} /> 已聯繫
          </button>
        )}

        {(post.status === "pending" || post.status === "contacted") && (
          <button
            onClick={() => onUpdateStatus("matched")}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.35)",
              color: "#86efac",
            }}
          >
            <Check size={12} /> 成交
          </button>
        )}

        {post.status !== "rejected" && (
          <button
            onClick={() => onUpdateStatus("rejected")}
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs"
            style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.5)",
            }}
          >
            <X size={12} /> 不符
          </button>
        )}
      </div>
    </div>
  );
}
