/**
 * 採購辨識結果表格 — eagle-toolkit 版
 * 欄位順序（2026-04-30 主公拍板）：
 *   縮圖 / 編號 / 到貨日期 / 品牌 / 型號 / 商品名稱(可編輯) / 顏色 / 尺寸 / 特徵 / 價格 NT$
 * - 材質欄已移除（AI 仍辨識、包在商品名稱字串裡）
 * - 品牌 dropdown 全英文
 * - 商品名稱直接可編輯（Abby 可改）
 * - confidence < 0.7 → 整列橘色邊框警示
 */
import { useState, useEffect } from 'react'
import { ChevronDown, X } from 'lucide-react'
import type { EditableResult } from '@/hooks/useRecognize'
import type { DropFile } from '@/hooks/useDropzone'
import { FeatureTagEditor } from './FeatureTagEditor'

const BRAND_OPTIONS = [
  'CHANEL',
  'LV',
  'HERMES',
  'DIOR',
  'GUCCI',
  'YSL',
  'BV',
  'GOYARD',
  'BALENCIAGA',
  'LOEWE',
  'FENDI',
  'PRADA',
  'CELINE',
  'BURBERRY',
  'CHLOE',
  'MIUMIU',
  'BVLGARI',
  'OTHER',
] as const

interface PurchaseResultTableProps {
  results: EditableResult[]
  dropFiles: DropFile[]
  onUpdate: (id: string, patch: Partial<EditableResult>) => void
}

const DATE_INPUT_STYLE: React.CSSProperties = {
  background: 'oklch(0.18 0.005 60)',
  border: '1px solid oklch(0.25 0.01 65 / 50%)',
  color: 'oklch(0.92 0.01 80)',
  borderRadius: '0.375rem',
  padding: '4px 8px',
  fontSize: '0.75rem',
  outline: 'none',
  colorScheme: 'dark',
  width: '130px',
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

const HEADERS = ['縮圖', '編號', '到貨日期', '品牌', '型號', '商品名稱', '顏色', '尺寸', '特徵', '價格 NT$']

export function PurchaseResultTable({ results, dropFiles, onUpdate }: PurchaseResultTableProps) {
  const fileMap = new Map(dropFiles.map(f => [f.id, f]))

  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="min-w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid oklch(0.25 0.01 65 / 50%)' }}>
            {HEADERS.map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-xs font-medium whitespace-nowrap" style={{ color: 'oklch(0.55 0.02 60)' }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((r, index) => {
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
                {/* 縮圖 — 160×200px object-contain，可點開大圖 */}
                <td className="px-3 py-2">
                  {df ? (
                    <ThumbnailCell src={df.previewUrl} alt={`img ${r.imageIndex + 1}`} />
                  ) : (
                    <div className="w-[160px] h-[200px] rounded-lg flex items-center justify-center" style={{ background: 'oklch(0.12 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)' }}>
                      <span className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>{r.imageIndex + 1}</span>
                    </div>
                  )}
                </td>

                {/* 編號 — 自動帶 index+1，唯讀 */}
                <td className="px-3 py-2 whitespace-nowrap">
                  <span className="text-xs font-medium tabular-nums" style={{ color: 'oklch(0.45 0.02 60)' }}>
                    {index + 1}
                  </span>
                </td>

                {/* 到貨日期 — 每筆獨立 */}
                <td className="px-3 py-2">
                  <input
                    type="date"
                    value={r.arrivalDate ?? ''}
                    onChange={e => onUpdate(r.id, { arrivalDate: e.target.value || undefined })}
                    style={DATE_INPUT_STYLE}
                  />
                </td>

                {/* 品牌 select — 全英文 */}
                <td className="px-3 py-2">
                  <div className="relative">
                    <select
                      value={r.brand}
                      onChange={e => onUpdate(r.id, { brand: e.target.value })}
                      style={{ ...INPUT_STYLE, paddingRight: '24px', appearance: 'none', minWidth: '88px' }}
                    >
                      {BRAND_OPTIONS.map(b => (
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

                {/* 商品名稱 — 可直接編輯（Abby 手改） */}
                <td className="px-3 py-2">
                  <input
                    type="text"
                    value={r.productName ?? r.formattedName}
                    onChange={e => onUpdate(r.id, { productName: e.target.value })}
                    style={{ ...INPUT_STYLE, width: '280px' }}
                    placeholder="商品名稱"
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

                {/* 特徵 tag */}
                <td className="px-3 py-2 w-[200px]">
                  <FeatureTagEditor
                    value={r.features}
                    onChange={features => onUpdate(r.id, { features })}
                  />
                </td>

                {/* 價格 NT$ — Abby 手 key */}
                <td className="px-3 py-2">
                  <PriceCell
                    value={r.price}
                    onChange={price => onUpdate(r.id, { price })}
                  />
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

/** 縮圖：160×200px 預覽，點擊開全尺寸 modal */
function ThumbnailCell({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="block rounded-lg overflow-hidden transition-opacity hover:opacity-80 focus:outline-none"
        style={{ border: '1px solid oklch(0.25 0.01 65 / 50%)', background: 'oklch(0.12 0.005 60)' }}
        title="點擊放大"
      >
        <img
          src={src}
          alt={alt}
          className="w-[160px] h-[200px] object-contain block"
        />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'oklch(0.05 0.005 60 / 85%)' }}
          onClick={() => setOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full rounded-2xl overflow-hidden"
            style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 25%)' }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{ background: 'oklch(0.2 0.005 60)', color: 'oklch(0.7 0.02 70)' }}
            >
              <X size={16} />
            </button>
            <img
              src={src}
              alt={alt}
              className="w-full max-h-[80vh] object-contain block"
            />
          </div>
        </div>
      )}
    </>
  )
}
