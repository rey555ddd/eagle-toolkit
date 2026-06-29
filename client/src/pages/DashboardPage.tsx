/**
 * 數據儀表板 /dashboard
 * Abby 專用
 * 功能：
 *   - 統計大卡（4 顆）：總商品 / 庫存價值 / 已售件數+金額 / 平均週轉天數
 *   - 採購趨勢（SVG 折線 + bar）：monthlyTrend 最近 6 月
 *   - 品牌佔比（橫向 bar）：byBrand top 8
 *   - 在店 vs 已售（div conic-gradient 圓餅）：byStatus 4 狀態
 *   - 週轉天數小卡：avgTurnoverDays vs 業界 ~120 天
 */

import { useMemo } from 'react'
import {
  BarChart3, Package, TrendingUp, DollarSign, RefreshCw,
  Timer, ShoppingBag, AlertCircle,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { Link } from 'wouter'

// ─── 型別 ─────────────────────────────────────────────────────────────────────

interface StatsData {
  totalItems: number
  totalValueNT: number
  byStatus: {
    in_store: { count: number; valueNT: number }
    sold: { count: number; valueNT: number }
    consigned: { count: number; valueNT: number }
    pending_clear: { count: number; valueNT: number }
  }
  byBrand: Array<{ brand: string; count: number; totalValueNT: number }>
  avgTurnoverDays: number
  monthlyTrend: Array<{ month: string; batches: number; items: number; totalNT: number }>
}

// ─── 品牌色票（精品慣例色，不用螢光色）──────────────────────────────────────────

const BRAND_COLORS: Record<string, string> = {
  CHANEL:     '#2a2a2a',
  LV:         '#8b6914',
  HERMES:     '#d4522a',
  DIOR:       '#c8a96e',
  GUCCI:      '#1a3a2a',
  YSL:        '#1c1c1c',
  BV:         '#5c4a3a',
  GOYARD:     '#c8962e',
  BALENCIAGA: '#3a3a3a',
  LOEWE:      '#7a6a5a',
  FENDI:      '#c8a050',
  PRADA:      '#1a2a3a',
  CELINE:     '#4a4a3a',
  BURBERRY:   '#8a6040',
  OTHER:      '#5a5a6a',
}

function getBrandColor(brand: string): string {
  return BRAND_COLORS[brand] || '#5a5a6a'
}

// ─── 狀態顏色 ─────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  in_store:      { label: '在店',  color: 'oklch(0.65 0.14 145)', hex: '#4ade80' },
  sold:          { label: '已售',  color: 'oklch(0.65 0.18 260)', hex: '#818cf8' },
  consigned:     { label: '寄賣',  color: 'oklch(0.72 0.14 75)',  hex: '#fbbf24' },
  pending_clear: { label: '待清',  color: 'oklch(0.62 0.20 25)',  hex: '#f87171' },
}

// ─── 格式化工具 ───────────────────────────────────────────────────────────────

function fmtNT(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(n)
}

function fmtNTFull(n: number): string {
  return n.toLocaleString('zh-TW')
}

// ─── 統計大卡 ─────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: string
  sub?: string
  accent?: string
}

function StatCard({ icon, label, value, sub, accent = 'oklch(0.72 0.08 75)' }: StatCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-3"
      style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.22 0.01 65 / 60%)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs tracking-wide" style={{ color: 'oklch(0.55 0.02 60)' }}>{label}</span>
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: `${accent}20`, color: accent }}
        >
          {icon}
        </div>
      </div>
      <div>
        <div className="text-2xl font-light tracking-tight" style={{ color: 'oklch(0.92 0.01 80)' }}>
          {value}
        </div>
        {sub && (
          <div className="text-xs mt-1" style={{ color: 'oklch(0.5 0.02 60)' }}>{sub}</div>
        )}
      </div>
    </div>
  )
}

// ─── 採購趨勢圖（SVG 折線 + 直條）────────────────────────────────────────────

interface TrendChartProps {
  data: Array<{ month: string; items: number; totalNT: number }>
}

function TrendChart({ data }: TrendChartProps) {
  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-2">
        <BarChart3 size={28} style={{ color: 'oklch(0.35 0.01 65)' }} />
        <p className="text-xs" style={{ color: 'oklch(0.45 0.02 60)' }}>
          累積一個月後將自動產生趨勢圖
        </p>
      </div>
    )
  }

  const maxItems = Math.max(...data.map(d => d.items), 1)
  const maxNT = Math.max(...data.map(d => d.totalNT), 1)

  const W = 480
  const H = 140
  const PAD = { top: 12, right: 16, bottom: 32, left: 44 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const barW = Math.max(4, (chartW / data.length) * 0.5)

  const xPos = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * chartW
  const yBarH = (v: number) => (v / maxItems) * chartH
  const yLine = (v: number) => PAD.top + chartH - (v / maxNT) * chartH

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${xPos(i)},${yLine(d.totalNT)}`)
    .join(' ')

  return (
    <div style={{ width: '100%', overflowX: 'auto' }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: '100%', minWidth: 280, height: 'auto' }}
        aria-label="採購趨勢圖"
      >
        {/* 橫格線 */}
        {[0.25, 0.5, 0.75, 1].map(f => {
          const y = PAD.top + chartH * (1 - f)
          return (
            <line
              key={f}
              x1={PAD.left} y1={y} x2={W - PAD.right} y2={y}
              stroke="oklch(0.22 0.01 65 / 40%)"
              strokeWidth={0.5}
              strokeDasharray="3,4"
            />
          )
        })}

        {/* 直條（件數）*/}
        {data.map((d, i) => {
          const bh = yBarH(d.items)
          const bx = xPos(i) - barW / 2
          const by = PAD.top + chartH - bh
          return (
            <rect
              key={i}
              x={bx} y={by} width={barW} height={bh}
              rx={2}
              fill="oklch(0.72 0.08 75 / 35%)"
            />
          )
        })}

        {/* 折線（金額）*/}
        <path
          d={linePath}
          fill="none"
          stroke="oklch(0.72 0.08 75)"
          strokeWidth={1.5}
          strokeLinejoin="round"
        />

        {/* 折線節點 */}
        {data.map((d, i) => (
          <circle
            key={i}
            cx={xPos(i)}
            cy={yLine(d.totalNT)}
            r={3}
            fill="oklch(0.72 0.08 75)"
          />
        ))}

        {/* X 軸月份標籤 */}
        {data.map((d, i) => (
          <text
            key={i}
            x={xPos(i)}
            y={H - 6}
            textAnchor="middle"
            fontSize={9}
            fill="oklch(0.5 0.02 60)"
          >
            {d.month.slice(5)}
          </text>
        ))}

        {/* Y 軸左側（件數）*/}
        <text x={PAD.left - 4} y={PAD.top + 4} textAnchor="end" fontSize={8} fill="oklch(0.45 0.02 60)">
          {maxItems}
        </text>
        <text x={PAD.left - 4} y={PAD.top + chartH / 2 + 3} textAnchor="end" fontSize={8} fill="oklch(0.45 0.02 60)">
          {Math.round(maxItems / 2)}
        </text>
      </svg>

      {/* 圖例 */}
      <div className="flex items-center gap-4 mt-1 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm" style={{ background: 'oklch(0.72 0.08 75 / 35%)' }} />
          <span className="text-[11px]" style={{ color: 'oklch(0.5 0.02 60)' }}>入貨件數</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 rounded" style={{ background: 'oklch(0.72 0.08 75)' }} />
          <span className="text-[11px]" style={{ color: 'oklch(0.5 0.02 60)' }}>入貨金額</span>
        </div>
      </div>
    </div>
  )
}

// ─── 品牌佔比（橫向 bar）──────────────────────────────────────────────────────

interface BrandBarChartProps {
  data: Array<{ brand: string; count: number; totalValueNT: number }>
}

function BrandBarChart({ data }: BrandBarChartProps) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-32">
        <p className="text-xs" style={{ color: 'oklch(0.45 0.02 60)' }}>尚無品牌資料</p>
      </div>
    )
  }

  const top8 = data.slice(0, 8)
  const maxCount = Math.max(...top8.map(d => d.count), 1)

  return (
    <div className="space-y-3">
      {top8.map(d => {
        const pct = (d.count / maxCount) * 100
        const color = getBrandColor(d.brand)
        return (
          <div key={d.brand} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium tracking-wide" style={{ color: 'oklch(0.82 0.01 80)' }}>
                {d.brand}
              </span>
              <span style={{ color: 'oklch(0.55 0.02 60)' }}>
                {d.count} 件 · NT${fmtNT(d.totalValueNT)}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: 'oklch(0.18 0.005 60)' }}
            >
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${pct}%`, background: color, opacity: 0.85 }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ─── 狀態圓餅（conic-gradient）────────────────────────────────────────────────

interface StatusPieProps {
  byStatus: StatsData['byStatus']
}

function StatusPie({ byStatus }: StatusPieProps) {
  const entries = (Object.keys(byStatus) as Array<keyof typeof byStatus>).map(k => ({
    key: k,
    label: STATUS_CONFIG[k].label,
    color: STATUS_CONFIG[k].hex,
    count: byStatus[k].count,
  }))

  const total = entries.reduce((s, e) => s + e.count, 0)

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40">
        <p className="text-xs" style={{ color: 'oklch(0.45 0.02 60)' }}>尚無庫存資料</p>
      </div>
    )
  }

  // conic-gradient 字串
  let deg = 0
  const segments = entries.map(e => {
    const share = (e.count / total) * 360
    const from = deg
    deg += share
    return { ...e, from, to: deg }
  })

  const gradient = segments
    .map(s => `${s.color} ${s.from.toFixed(1)}deg ${s.to.toFixed(1)}deg`)
    .join(', ')

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6">
      {/* 圓餅 */}
      <div
        className="shrink-0 rounded-full"
        style={{
          width: 120,
          height: 120,
          background: `conic-gradient(${gradient})`,
          mask: 'radial-gradient(circle at 50%, transparent 38%, black 39%)',
          WebkitMask: 'radial-gradient(circle at 50%, transparent 38%, black 39%)',
        }}
      />

      {/* 圖例 */}
      <div className="flex flex-col gap-2.5 w-full">
        {segments.map(s => {
          const pct = total > 0 ? ((s.count / total) * 100).toFixed(1) : '0'
          return (
            <div key={s.key} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: s.color }} />
                <span style={{ color: 'oklch(0.78 0.01 80)' }}>{s.label}</span>
              </div>
              <span style={{ color: 'oklch(0.55 0.02 60)' }}>
                {s.count} 件 <span style={{ color: 'oklch(0.38 0.01 65)' }}>({pct}%)</span>
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── 週轉天數小卡 ─────────────────────────────────────────────────────────────

interface TurnoverCardProps {
  avgDays: number
}

function TurnoverCard({ avgDays }: TurnoverCardProps) {
  const INDUSTRY_AVG = 120
  const better = avgDays > 0 && avgDays < INDUSTRY_AVG
  const diffDays = INDUSTRY_AVG - avgDays

  const barPct = avgDays > 0 ? Math.min((avgDays / (INDUSTRY_AVG * 1.5)) * 100, 100) : 0
  const industryPct = Math.min((INDUSTRY_AVG / (INDUSTRY_AVG * 1.5)) * 100, 100)

  return (
    <div className="space-y-4">
      {/* 大數字 */}
      <div className="flex items-end gap-3">
        <div className="text-4xl font-light tracking-tight" style={{ color: 'oklch(0.92 0.01 80)' }}>
          {avgDays > 0 ? avgDays : '—'}
        </div>
        <div className="text-sm mb-1" style={{ color: 'oklch(0.55 0.02 60)' }}>天</div>
        {avgDays > 0 && (
          <div
            className="text-xs px-2 py-1 rounded-full ml-auto"
            style={better
              ? { background: 'oklch(0.65 0.14 145 / 15%)', color: 'oklch(0.65 0.14 145)', border: '1px solid oklch(0.65 0.14 145 / 30%)' }
              : { background: 'oklch(0.62 0.20 25 / 15%)', color: 'oklch(0.72 0.20 25)', border: '1px solid oklch(0.62 0.20 25 / 30%)' }
            }
          >
            {better ? `比業界快 ${diffDays} 天` : `慢業界 ${-diffDays} 天`}
          </div>
        )}
      </div>

      {/* 比對 bar */}
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'oklch(0.5 0.02 60)' }}>
            <span>伊果平均</span>
            <span>{avgDays > 0 ? `${avgDays} 天` : '尚無資料'}</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.18 0.005 60)' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${barPct}%`, background: better ? 'oklch(0.65 0.14 145)' : 'oklch(0.62 0.20 25)' }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-[11px] mb-1" style={{ color: 'oklch(0.5 0.02 60)' }}>
            <span>業界平均（二手精品）</span>
            <span>{INDUSTRY_AVG} 天</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.18 0.005 60)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${industryPct}%`, background: 'oklch(0.55 0.02 60)' }}
            />
          </div>
        </div>
      </div>

      <p className="text-[11px]" style={{ color: 'oklch(0.38 0.01 65)' }}>
        業界基準：二手精品平均約 120 天（參考值）
      </p>
    </div>
  )
}

// ─── 主儀表板內容 ─────────────────────────────────────────────────────────────

function DashboardContent() {
  const statsQuery = trpc.inventory.getStats.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  })

  const stats = statsQuery.data as StatsData | undefined
  const isLoading = statsQuery.isLoading
  const isError = statsQuery.isError
  const isProdOnly = isError && (statsQuery.error?.message ?? '').includes('production')

  // 最近 6 個月趨勢
  const trendData = useMemo(() => {
    if (!stats?.monthlyTrend) return []
    return stats.monthlyTrend.slice(-6)
  }, [stats])

  const isEmpty = !isLoading && !isError && (stats?.totalItems ?? 0) === 0

  // ── 空態 ─────────────────────────────────────────────────────────────────────
  if (isEmpty) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.72 0.08 75 / 10%)', border: '1px solid oklch(0.72 0.08 75 / 20%)' }}
        >
          <Package size={28} style={{ color: 'oklch(0.65 0.07 75)' }} />
        </div>
        <div>
          <p className="text-base font-light" style={{ color: 'oklch(0.85 0.01 80)' }}>尚無庫存資料</p>
          <p className="text-sm mt-1" style={{ color: 'oklch(0.5 0.02 60)' }}>
            請先到採購助手新增一批商品
          </p>
        </div>
        <Link
          href="/purchase"
          className="px-4 py-2 rounded-lg text-sm transition-all"
          style={{
            background: 'oklch(0.72 0.08 75 / 20%)',
            border: '1px solid oklch(0.72 0.08 75 / 40%)',
            color: 'oklch(0.82 0.07 75)',
          }}
        >
          前往採購助手
        </Link>
      </div>
    )
  }

  // ── production-only 提示 ──────────────────────────────────────────────────────
  if (isProdOnly) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 text-center px-6">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: 'oklch(0.62 0.20 25 / 10%)', border: '1px solid oklch(0.62 0.20 25 / 25%)' }}
        >
          <AlertCircle size={24} style={{ color: 'oklch(0.72 0.20 25)' }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: 'oklch(0.85 0.01 80)' }}>
            數據儀表板僅在正式環境顯示
          </p>
          <p className="text-xs mt-1.5 max-w-xs" style={{ color: 'oklch(0.5 0.02 60)' }}>
            本頁需連線至 eagle.reyway.com 才能讀取真實庫存統計資料。
          </p>
        </div>
        <a
          href="https://eagle.reyway.com/dashboard"
          className="px-4 py-2 rounded-lg text-xs transition-all"
          style={{
            background: 'oklch(0.18 0.005 60)',
            border: '1px solid oklch(0.25 0.01 65 / 60%)',
            color: 'oklch(0.65 0.02 60)',
          }}
        >
          前往正式站查看
        </a>
      </div>
    )
  }

  // ── 讀取中 ───────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <RefreshCw size={20} className="animate-spin" style={{ color: 'oklch(0.55 0.02 60)' }} />
      </div>
    )
  }

  // ── 有資料 ───────────────────────────────────────────────────────────────────
  const totalItems = stats?.totalItems ?? 0
  const totalValueNT = stats?.totalValueNT ?? 0
  const soldCount = stats?.byStatus?.sold?.count ?? 0
  const soldValueNT = stats?.byStatus?.sold?.valueNT ?? 0
  const avgTurnoverDays = Math.round(stats?.avgTurnoverDays ?? 0)

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

      {/* ── 頁首 ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1
            className="text-xl sm:text-2xl font-light tracking-wide"
            style={{ color: 'oklch(0.92 0.01 80)', fontFamily: "'Noto Serif TC', serif" }}
          >
            數據儀表板
          </h1>
          <p className="text-xs mt-0.5" style={{ color: 'oklch(0.5 0.02 60)' }}>
            蹦闆精品 · 庫存與銷售總覽
          </p>
        </div>
        <button
          onClick={() => statsQuery.refetch()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
          style={{
            background: 'oklch(0.18 0.005 60)',
            border: '1px solid oklch(0.25 0.01 65 / 60%)',
            color: 'oklch(0.65 0.02 60)',
          }}
        >
          <RefreshCw size={12} className={statsQuery.isFetching ? 'animate-spin' : ''} />
          重新整理
        </button>
      </div>

      {/* ── A. 統計大卡（4 顆）──────────────────────────────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Package size={16} />}
          label="總商品數"
          value={`${totalItems.toLocaleString()} 件`}
          sub={`在店 ${stats?.byStatus?.in_store?.count ?? 0} 件`}
          accent="oklch(0.72 0.08 75)"
        />
        <StatCard
          icon={<DollarSign size={16} />}
          label="庫存價值"
          value={`NT$ ${fmtNT(totalValueNT)}`}
          sub={`總計 NT$${fmtNTFull(totalValueNT)}`}
          accent="oklch(0.65 0.14 145)"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="已售出"
          value={`${soldCount} 件`}
          sub={soldValueNT > 0 ? `銷售額 NT$${fmtNT(soldValueNT)}` : '尚無銷售紀錄'}
          accent="oklch(0.65 0.18 260)"
        />
        <StatCard
          icon={<Timer size={16} />}
          label="平均週轉天數"
          value={avgTurnoverDays > 0 ? `${avgTurnoverDays} 天` : '—'}
          sub={avgTurnoverDays > 0 ? (avgTurnoverDays < 120 ? '優於業界平均' : '業界平均 120 天') : '售出後產生數據'}
          accent="oklch(0.72 0.14 75)"
        />
      </section>

      {/* ── B + C：採購趨勢 + 品牌佔比（兩欄）────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-5 gap-4">

        {/* B. 採購趨勢 */}
        <div
          className="lg:col-span-3 rounded-xl p-5 space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.22 0.01 65 / 60%)' }}
        >
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <h2 className="text-sm font-medium tracking-wide" style={{ color: 'oklch(0.82 0.01 80)' }}>
              採購趨勢（最近 6 個月）
            </h2>
          </div>
          <TrendChart data={trendData} />
        </div>

        {/* C. 品牌佔比 */}
        <div
          className="lg:col-span-2 rounded-xl p-5 space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.22 0.01 65 / 60%)' }}
        >
          <div className="flex items-center gap-2">
            <ShoppingBag size={14} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <h2 className="text-sm font-medium tracking-wide" style={{ color: 'oklch(0.82 0.01 80)' }}>
              品牌佔比 Top 8
            </h2>
          </div>
          <BrandBarChart data={stats?.byBrand ?? []} />
        </div>
      </section>

      {/* ── D + E：狀態圓餅 + 週轉天數（兩欄）────────────────────────────────── */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">

        {/* D. 在店 vs 已售 */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.22 0.01 65 / 60%)' }}
        >
          <div className="flex items-center gap-2">
            <Package size={14} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <h2 className="text-sm font-medium tracking-wide" style={{ color: 'oklch(0.82 0.01 80)' }}>
              庫存狀態分佈
            </h2>
          </div>
          {stats?.byStatus && <StatusPie byStatus={stats.byStatus} />}
        </div>

        {/* E. 週轉天數 */}
        <div
          className="rounded-xl p-5 space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.22 0.01 65 / 60%)' }}
        >
          <div className="flex items-center gap-2">
            <Timer size={14} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <h2 className="text-sm font-medium tracking-wide" style={{ color: 'oklch(0.82 0.01 80)' }}>
              週轉速度
            </h2>
          </div>
          <TurnoverCard avgDays={avgTurnoverDays} />
        </div>
      </section>

    </div>
  )
}

// ─── DashboardPage ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.1 0.005 60)' }}>
      {/* 副頁首工具列 */}
      <div
        className="sticky top-16 sm:top-20 z-30 backdrop-blur-md"
        style={{ background: 'oklch(0.1 0.005 60 / 92%)', borderBottom: '1px solid oklch(0.72 0.08 75 / 10%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 size={14} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <span className="text-xs tracking-wide" style={{ color: 'oklch(0.65 0.02 60)' }}>
              數據儀表板
            </span>
          </div>
        </div>
      </div>

      <DashboardContent />
    </div>
  )
}
