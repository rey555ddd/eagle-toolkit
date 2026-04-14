import { useState } from "react";
import { toast } from "sonner";
import { Radar as RadarIcon, Lock, RefreshCw, ExternalLink, Copy, Check, X, Sparkles, LogOut, Activity } from "lucide-react";
import { trpc } from "@/lib/trpc";

const LS_KEY_TOKEN = "eagle-radar-token";
const LS_KEY_NAME = "eagle-radar-name";

export default function Radar() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_KEY_TOKEN));
  const [operatorName, setOperatorName] = useState<string>(() => localStorage.getItem(LS_KEY_NAME) ?? "");

  if (!token) {
    return (
      <LoginGate
        onLogin={(tk, name) => {
          localStorage.setItem(LS_KEY_TOKEN, tk);
          localStorage.setItem(LS_KEY_NAME, name);
          setToken(tk);
          setOperatorName(name);
        }}
      />
    );
  }

  return (
    <RadarDashboard
      token={token}
      operatorName={operatorName}
      onLogout={() => {
        localStorage.removeItem(LS_KEY_TOKEN);
        setToken(null);
      }}
    />
  );
}

function LoginGate({ onLogin }: { onLogin: (token: string, name: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [operatorName, setOperatorName] = useState("");

  const loginMut = trpc.radar.login.useMutation({
    onSuccess: (data) => {
      onLogin(data.token, operatorName.trim() || username);
      toast.success("登入成功");
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "linear-gradient(135deg, #0d0d1a 0%, #1a1a2e 100%)" }}>
      <div className="w-full max-w-sm p-8 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(201,168,76,0.25)", backdropFilter: "blur(12px)" }}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 rounded-full flex items-center justify-center mb-3" style={{ background: "rgba(201,168,76,0.15)", border: "1px solid rgba(201,168,76,0.3)" }}>
            <RadarIcon size={24} style={{ color: "#f0c040" }} />
          </div>
          <h1 className="text-xl font-light tracking-widest" style={{ color: "#f5f0e8", fontFamily: "'Noto Serif TC', serif" }}>潛在賣家雷達</h1>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>伊果精品 · 客服專屬</p>
        </div>
        <div className="space-y-3">
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="帳號" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="密碼" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          <input value={operatorName} onChange={(e) => setOperatorName(e.target.value)} placeholder="你的名字（團隊協作用）" className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.1)", color: "#fff" }} />
          <button onClick={() => loginMut.mutate({ username: username.trim(), password: password.trim() })} disabled={!username || !password || loginMut.isPending} className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50" style={{ background: "linear-gradient(135deg, #c9a84c, #f0c040)", color: "#0a0a0a" }}>
            {loginMut.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
            登入
          </button>
        </div>
      </div>
    </div>
  );
}

type PostStatus = "pending" | "handled" | "skipped" | "all";
type SourceFilter = "all" | "dcard" | "ptt" | "threads";

function RadarDashboard({ token, operatorName, onLogout }: { token: string; operatorName: string; onLogout: () => void }) {
  const [statusFilter, setStatusFilter] = useState<PostStatus>("pending");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("all");
  const [lastScanAt, setLastScanAt] = useState<Date | null>(null);

  const { data, refetch, isLoading } = trpc.radar.list.useQuery(
    { token, status: statusFilter, source: sourceFilter, limit: 80 },
    { refetchInterval: 60000 }
  );

  const scanMut = trpc.radar.scanNow.useMutation({
    onSuccess: (res) => {
      setLastScanAt(new Date());
      toast.success(`掃描完成：找到 ${res.scraped} 則候選，新增 ${res.inserted} 則`);
      refetch();
    },
    onError: (e) => {
      if (e.message.includes("未授權")) { onLogout(); }
      toast.error("掃描失敗：" + e.message);
    },
  });

  const markMut = trpc.radar.markHandled.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });
  const skipMut = trpc.radar.skip.useMutation({
    onSuccess: () => refetch(),
    onError: (e) => toast.error(e.message),
  });
  const replyMut = trpc.radar.generateReply.useMutation();

  const stats = data?.stats ?? { total: 0, pending: 0, handled: 0, skipped: 0 };
  const posts = data?.posts ?? [];

  return (
    <div className="min-h-screen pt-20 pb-16" style={{ background: "oklch(0.08 0.01 260)" }}>
      <div className="container mx-auto px-4 lg:px-8 max-w-6xl">
        {/* 頁首 */}
        <div className="pt-6 pb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="flex items-center gap-3">
              <RadarIcon size={22} style={{ color: "#f0c040" }} />
              <h1 className="text-2xl font-bold" style={{ color: "#f5f0e8" }}>潛在賣家雷達</h1>
            </div>
            <p className="text-xs mt-1 ml-9" style={{ color: "rgba(255,255,255,0.45)" }}>
              客服：<span style={{ color: "#f0c040" }}>{operatorName}</span>
              {lastScanAt && <span> ｜ 上次掃描：{lastScanAt.toLocaleTimeString()}</span>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => scanMut.mutate({ token })} disabled={scanMut.isPending} className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold disabled:opacity-50" style={{ background: "linear-gradient(135deg, #c9a84c, #f0c040)", color: "#0a0a0a" }}>
              {scanMut.isPending ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
              {scanMut.isPending ? "掃描中..." : "立即掃描"}
            </button>
            <button onClick={onLogout} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
              <LogOut size={12} /> 登出
            </button>
          </div>
        </div>

        {/* 統計卡片 */}
        <div className="grid grid-cols-4 gap-3 mb-5">
          <StatCard label="總筆數" value={stats.total} color="#94a3b8" />
          <StatCard label="待處理" value={stats.pending} color="#f0c040" />
          <StatCard label="已處理" value={stats.handled} color="#22c55e" />
          <StatCard label="已略過" value={stats.skipped} color="#64748b" />
        </div>

        {/* 篩選 */}
        <div className="flex flex-wrap gap-2 mb-5">
          <FilterGroup
            label="狀態"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as PostStatus)}
            options={[
              { id: "pending", label: "待處理" },
              { id: "handled", label: "已處理" },
              { id: "skipped", label: "已略過" },
              { id: "all", label: "全部" },
            ]}
          />
          <FilterGroup
            label="平台"
            value={sourceFilter}
            onChange={(v) => setSourceFilter(v as SourceFilter)}
            options={[
              { id: "all", label: "全部" },
              { id: "dcard", label: "Dcard" },
              { id: "ptt", label: "PTT" },
              { id: "threads", label: "Threads" },
            ]}
          />
        </div>

        {/* 卡片流 */}
        {isLoading ? (
          <div className="text-center py-16" style={{ color: "rgba(255,255,255,0.3)" }}>載入中...</div>
        ) : posts.length === 0 ? (
          <EmptyState scanning={scanMut.isPending} onScan={() => scanMut.mutate({ token })} />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {posts.map((p) => (
              <RadarCard
                key={p.id}
                post={p}
                onMarkHandled={() => markMut.mutate({ token, id: p.id, handledBy: operatorName })}
                onSkip={() => skipMut.mutate({ token, id: p.id })}
                onGenerateReply={async () => {
                  const res = await replyMut.mutateAsync({ token, id: p.id });
                  refetch();
                  return res.reply;
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="p-3 rounded-xl text-center" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30` }}>
      <p className="text-[10px] tracking-wider mb-1" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</p>
      <p className="text-xl font-bold" style={{ color }}>{value}</p>
    </div>
  );
}

function FilterGroup<T extends string>({ label, value, onChange, options }: { label: string; value: T; onChange: (v: T) => void; options: { id: T; label: string }[] }) {
  return (
    <div className="flex items-center gap-1.5 p-1 rounded-lg" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <span className="px-2 text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{label}</span>
      {options.map((o) => (
        <button
          key={o.id}
          onClick={() => onChange(o.id)}
          className="px-3 py-1 rounded-md text-xs transition-all"
          style={{
            background: value === o.id ? "rgba(240,192,64,0.18)" : "transparent",
            color: value === o.id ? "#f0c040" : "rgba(255,255,255,0.55)",
          }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function EmptyState({ scanning, onScan }: { scanning: boolean; onScan: () => void }) {
  return (
    <div className="py-16 text-center rounded-xl" style={{ background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)" }}>
      <RadarIcon size={36} className="mx-auto mb-3" style={{ color: "rgba(240,192,64,0.4)" }} />
      <p className="text-sm mb-3" style={{ color: "rgba(255,255,255,0.5)" }}>還沒有資料</p>
      <button onClick={onScan} disabled={scanning} className="px-4 py-2 rounded-lg text-xs font-semibold inline-flex items-center gap-2" style={{ background: "linear-gradient(135deg, #c9a84c, #f0c040)", color: "#0a0a0a" }}>
        {scanning ? <RefreshCw size={12} className="animate-spin" /> : <Activity size={12} />}
        {scanning ? "掃描中..." : "立即執行第一次掃描"}
      </button>
    </div>
  );
}

type Post = {
  id: number; source: string; url: string; title: string; content: string; author: string;
  brandTags: string[]; priority: number; aiReply: string | null; status: string;
  handledBy: string | null; handledAt: number | null; scrapedAt: number;
};

function RadarCard({ post, onMarkHandled, onSkip, onGenerateReply }: {
  post: Post;
  onMarkHandled: () => void;
  onSkip: () => void;
  onGenerateReply: () => Promise<string>;
}) {
  const [reply, setReply] = useState(post.aiReply ?? "");
  const [replyLoading, setReplyLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sourceColors: Record<string, string> = { dcard: "#3b82f6", ptt: "#10b981", threads: "#a855f7" };
  const sourceLabels: Record<string, string> = { dcard: "Dcard", ptt: "PTT", threads: "Threads" };
  const color = sourceColors[post.source] ?? "#94a3b8";

  const ageMin = Math.floor((Date.now() - post.scrapedAt) / 60000);
  const ageText = ageMin < 60 ? `${ageMin} 分鐘前` : `${Math.floor(ageMin / 60)} 小時前`;

  const handleGenReply = async () => {
    setReplyLoading(true);
    try {
      const r = await onGenerateReply();
      setReply(r);
    } finally {
      setReplyLoading(false);
    }
  };

  const handleCopyReply = () => {
    if (!reply) return;
    navigator.clipboard.writeText(reply);
    setCopied(true);
    toast.success("話術已複製");
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColor = post.status === "handled" ? "#22c55e" : post.status === "skipped" ? "#64748b" : "#f0c040";

  return (
    <div className="p-4 rounded-xl flex flex-col gap-3" style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${color}30`, opacity: post.status !== "pending" ? 0.55 : 1 }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: `${color}25`, color }}>{sourceLabels[post.source] ?? post.source}</span>
          {post.priority >= 80 && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "rgba(239,68,68,0.2)", color: "#fca5a5" }}>🔥 高優先</span>}
          {post.brandTags.slice(0, 3).map((b) => (
            <span key={b} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(240,192,64,0.15)", color: "#f0c040" }}>{b}</span>
          ))}
          {post.status !== "pending" && (
            <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: `${statusColor}25`, color: statusColor }}>
              {post.status === "handled" ? `✓ ${post.handledBy ?? "已處理"}` : "略過"}
            </span>
          )}
        </div>
        <span className="text-[10px]" style={{ color: "rgba(255,255,255,0.35)" }}>{ageText}</span>
      </div>

      {/* Content */}
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: "#f5f0e8" }}>{post.title}</p>
        <p className="text-xs leading-relaxed line-clamp-3" style={{ color: "rgba(255,255,255,0.55)" }}>{post.content || "(無內文摘要)"}</p>
        <p className="text-[10px] mt-1.5" style={{ color: "rgba(255,255,255,0.35)" }}>作者：{post.author} ｜ 優先度 {post.priority}</p>
      </div>

      {/* AI Reply */}
      {reply ? (
        <div className="p-2.5 rounded-lg" style={{ background: "rgba(240,192,64,0.06)", border: "1px solid rgba(240,192,64,0.2)" }}>
          <p className="text-xs leading-relaxed whitespace-pre-wrap" style={{ color: "rgba(255,243,192,0.9)" }}>
            {reply}
          </p>
          <button onClick={handleCopyReply} className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: "#f0c040" }}>
            {copied ? <Check size={11} /> : <Copy size={11} />}
            {copied ? "已複製" : "複製話術"}
          </button>
        </div>
      ) : (
        <button onClick={handleGenReply} disabled={replyLoading} className="flex items-center justify-center gap-2 py-2 rounded-lg text-xs" style={{ background: "rgba(240,192,64,0.12)", border: "1px solid rgba(240,192,64,0.3)", color: "#f0c040" }}>
          {replyLoading ? <RefreshCw size={12} className="animate-spin" /> : <Sparkles size={12} />}
          {replyLoading ? "生成中..." : "✨ AI 生成個人化留言話術"}
        </button>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <a href={post.url} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold" style={{ background: `${color}20`, border: `1px solid ${color}55`, color }}>
          <ExternalLink size={12} /> 開啟貼文
        </a>
        {post.status === "pending" && (
          <>
            <button onClick={onMarkHandled} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#86efac" }}>
              <Check size={12} /> 已處理
            </button>
            <button onClick={onSkip} className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-xs" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)" }}>
              <X size={12} /> 略過
            </button>
          </>
        )}
      </div>
    </div>
  );
}
