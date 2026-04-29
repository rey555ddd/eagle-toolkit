/**
 * 採購辨識結果表格 — eagle-toolkit 版
 * - 每欄可直接編輯
 * - confidence < 0.7 → 整列橘色邊框警示
 * - 縮圖從 dropFiles 取 previewUrl
 * - 包含價格欄（Abby 手 key）
 */
import { useState, useEffect } from 'react'
import { AlertTriangle, ChevronDown } from 'lucide-react'
import type { EditableResult } from '@/hooks/useRecognize'
import type { DropFile } from '@/hooks/useDropzone'
import { FeatureTagEditor } from './FeatureTagEditor'

const LUXURY_BRANDS = ['香奈兒', 'LV', '愛馬仕', 'DIOR', 'GUCCI', 'YSL', 'BV', 'GOYARD', '其他'] as const

interface PurchaseResultTableProps {
  results: EditableResult[]
  dropFiles: DropFile[]
  onUpdate: (id: string, patch: Partial<EditableResult>) => void
}

const INPUT_STYLE: React.CSSProperties = {
  background: 'oklch(0.18 0.005 60)',
  border: '1px solid oklch(0.25 0.01 65 / 50%)',
  color: 'oklch(0.92 0.01 80)',
  borderRadius: '0.375rem',
  padding: '4px 8px',
  fontSize: '0.75rem',
  outline: 'none',
}

export function PurchaseResultTable({ results, dropFiles, onUpdate }: PurchaseResultTableProps) {
  const fileMap = new Map(dropFiles.map(f => [f.id, f]))

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid oklch(0.25 0.01 65 / 50%)' }}>
            {['縮圖', '品牌', '型號', '顏色', '尺寸', '序號', '特徵', '價格 NT$', '商品名稱', '信心'].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={{ color: 'oklch(0.55 0.02 60)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map(r => {
            const df = fileMap.get(r.id)
            const lowConf = r.confidence < 0.7

            return (
              <tr
                key={r.id}
                className="transition-colors"
                style={{
                  borderBottom: '1px solid oklch(0.25 0.01 65 / 30%)',
                  borderLeft: lowConf ? '2px solid rgba(249,115,22,0.6)' : undefined,
                }}
              >
                {/* 縮圖 */}
                <td className="px-3 py-2">
                  {df ? (
                    <img
                      src={df.previewUrl}
                      alt={`img ${r.imageIndex + 1}`}
                      className="w-12 h-12 object-cover rounded-lg"
                      style={{ border: '1px solid oklch(0.25 0.01 65 / 50%)' }}
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)' }}>
                      <span className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>{r.imageIndex + 1}</span>
                    </div>
                  )}
                </td>

                {/* 品牌 select */}
                <td className="px-3 py-2">
                  <div className="relative">
                    <select
                      value={r.brand}
                      onChange={e => onUpdate(r.id, { brand: e.target.value })}
                      style={{ ...INPUT_STYLE, paddingRight: '24px', appearance: 'none', minWidth: '80px' }}
                    >
                      {LUXURY_BRANDS.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: 'oklch(0.55 0.02 60)' }} />
                  </div>
                </td>

                {/* 型號 */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.model}
                    onChange={e => onUpdate(r.id, { model: e.target.value })}
                    style={{ ...INPUT_STYLE, width: '112px' }}
                    placeholder="型號"
                  />
                </td>

                {/* 顏色 */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.color}
                    onChange={e => onUpdate(r.id, { color: e.target.value })}
                    style={{ ...INPUT_STYLE, width: '80px' }}
                    placeholder="顏色"
                  />
                </td>

                {/* 尺寸 */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.size ?? ''}
                    onChange={e => onUpdate(r.id, { size: e.target.value || null })}
                    style={{ ...INPUT_STYLE, width: '80px' }}
                    placeholder="尺寸"
                  />
                </td>

                {/* 序號 */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.serial ?? ''}
                    onChange={e => onUpdate(r.id, { serial: e.target.value || null })}
                    style={{ ...INPUT_STYLE, width: '96px' }}
                    placeholder="序號"
                  />
                </td>

                {/* 特徵 tag */}
                <td className="px-3 py-2 max-w-[160px]">
                  <FeatureTagEditor
                    value={r.features}
                    onChange={features => onUpdate(r.id, { features })}
                  />
                </td>

                {/* 價格 */}
                <td className="px-3 py-2">
                  <PriceCell
                    value={r.price}
                    onChange={price => onUpdate(r.id, { price })}
                  />
                </td>

                {/* 商品名稱（唯讀） */}
                <td className="px-3 py-2">
                  <p className="text-xs whitespace-nowrap font-medium min-w-[180px]" style={{ color: 'oklch(0.92 0.01 80)' }}>
                    {r.formattedName}
                  </p>
                </td>

                {/* 信心度 */}
                <td className="px-3 py-2">
                  <ConfidenceBadge confidence={r.confidence} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function PriceCell({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [raw, setRaw] = useState<string>(value != null ? String(value) : '')

  useEffect(() => {
    setRaw(value != null ? String(value) : '')
  }, [value])

  const handleBlur = () => {
    const n = parseInt(raw, 10)
    onChange(isNaN(n) ? null : n)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      value={raw}
      onChange={e => setRaw(e.target.value.replace(/[^0-9]/g, ''))}
      onBlur={handleBlur}
      style={{ ...INPUT_STYLE, width: '96px', textAlign: 'right' } as React.CSSProperties}
      placeholder="待填入"
    />
  )
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100)
  const low = confidence < 0.7

  return (
    <div className={`flex items-center gap-1 ${low ? 'text-orange-400' : ''}`} style={low ? {} : { color: 'oklch(0.55 0.02 60)' }}>
      {low && <AlertTriangle size={12} />}
      <span className={`text-xs font-medium ${low ? 'text-orange-400' : ''}`}>
        {pct}%
      </span>
    </div>
  )
}
