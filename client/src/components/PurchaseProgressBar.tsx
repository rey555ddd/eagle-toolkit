/**
 * 採購辨識進度條元件 — eagle-toolkit 版
 * (命名 PurchaseProgressBar 避免與既有 ProgressBar 衝突)
 */
import { Loader2 } from 'lucide-react'

interface PurchaseProgressBarProps {
  done: number
  total: number
}

export function PurchaseProgressBar({ done, total }: PurchaseProgressBarProps) {
  const pct = total > 0 ? Math.round((done / total) * 100) : 0

  return (
    <div
      className="p-4 rounded-xl space-y-2"
      style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm" style={{ color: 'oklch(0.92 0.01 80)' }}>
          <Loader2 size={14} style={{ color: 'oklch(0.72 0.08 75)' }} className="animate-spin" />
          <span>AI 辨識中...</span>
        </div>
        <span className="text-sm font-medium" style={{ color: 'oklch(0.72 0.08 75)' }}>
          {done} / {total} 張
        </span>
      </div>

      <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.18 0.005 60)' }}>
        <div
          className="h-full rounded-full transition-all duration-300 ease-out"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(90deg, oklch(0.72 0.08 75), oklch(0.82 0.07 75))',
          }}
        />
      </div>

      <p className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>
        {pct < 100
          ? `約 ${Math.ceil((total - done) * 1.5)} 秒完成`
          : '辨識完成，整理結果中...'}
      </p>
    </div>
  )
}
