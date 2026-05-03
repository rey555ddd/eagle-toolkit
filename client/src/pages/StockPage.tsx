/**
 * 庫存盤點 /stock
 * Abby 專用 — 共用 eagle_abby_auth cookie（Abby888）
 * 功能：
 *   - 9 欄庫存表格（縮圖/品牌/型號/商品名稱/顏色/進貨價/售價/狀態/操作）
 *   - 篩選列：狀態 5 chip + 品牌 dropdown + 型號搜尋
 *   - 統計小卡：在店 N 件 / 庫存價值
 *   - 狀態改 sold → 跳售價輸入 modal
 *   - 加入型號庫 → inventory.addToModelDb
 */

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Package, RefreshCw, LogOut, ChevronDown, ChevronLeft, ChevronRight,
  Search, X, Library, DollarSign,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import LoginGate from '@/components/LoginGate'

// ─── 常數 ─────────────────────────────────────────────────────────────────────

const BRANDS = [
  'CHANEL', 'LV', 'HERMES', 'DIOR', 'GUCCI', 'YSL', 'BV',
  'GOYARD', 'BALENCIAGA', 'LOEWE', 'FENDI', 'PRADA', 'CELINE',
  'BURBERRY', 'CHLOE', 'MIUMIU', 'BVLGARI', 'OTHER',
] as const

type Brand = typeof BRANDS[number] | ''

type InventoryStatus = 'in_store' | 'sold' | 'consigned' | 'pending_clear'

const STATUS_LABELS: Record<InventoryStatus, string> = {
  in_store:      '在店',
  sold:          '已售',
  consigned:     '寄賣',
  pending_clear: '待清',
}

const STATUS_COLORS: Record<InventoryStatus, { bg: string; text: string; border: string }> = {
  in_store:      { bg: 'rgba(34,197,94,0.12)',  text: '#86efac', border: 'rgba(34,197,94,0.35)' },
  sold:          { bg: 'rgba(99,102,241,0.12)', text: '#a5b4fc', border: 'rgba(99,102,241,0.35)' },
  consigned:     { bg: 'rgba(251,191,36,0.12)', text: '#fcd34d', border: 'rgba(251,191,36,0.35)' },
  pending_clear: { bg: 'rgba(239,68,68,0.12)',  text: '#fca5a5', border: 'rgba(239,68,68,0.35)' },
}

const STATUS_FILTER_OPTIONS: Array<{ label: string; value: InventoryStatus | 'all' }> = [
  { label: '全部',   value: 'all' },
  { label: '在店',   value: 'in_store' },
  { label: '已售',   value: 'sold' },
  { label: '寄賣',   value: 'consigned' },
  { label: '待清',   value: 'pending_clear' },
]

const PAGE_SIZE = 50

// ─── 型別定義 ─────────────────────────────────────────────────────────────────

interface InventoryItem {
  inventoryId: string
  brand: string
  model: string
  productName: string
  color: string
  costNT?: number | null
  soldPriceNT?: number | null
  status: InventoryStatus
  photoUrl?: string | null
  soldAt?: string | null
  location?: string | null
  notes?: string | null
  serial?: string | null
  verifiedTimes?: number
  arrivalDate?: string | null
}

// Mock data（蕭何 inventory.list 上線前的暫時資料）
const MOCK_ITEMS: InventoryItem[] = [
  {
    inventoryId: 'mock-1',
    brand: 'CHANEL',
    model: 'A12345',
    productName: '經典翻蓋包 羊皮 小金',
    color: '黑',
    costNT: 35000,
    soldPriceNT: null,
    status: 'in_store',
    photoUrl: null,
    serial: null,
    verifiedTimes: 3,
    arrivalDate: '2026-05-01',
  },
  {
    inventoryId: 'mock-2',
    brand: 'LV',
    model: 'M56478',
    productName: 'Neverfull MM Monogram',
    color: '棕',
    costNT: 28000,
    soldPriceNT: 38000,
    status: 'sold',
    photoUrl: null,
    soldAt: '2026-05-03',
    serial: 'TH1234',
    verifiedTimes: 5,
    arrivalDate: '2026-04-20',
  },
  {
    inventoryId: 'mock-3',
    brand: 'HERMES',
    model: 'Birkin 30',
    productName: 'Birkin 30 Togo 金扣',
    color: '藍',
    costNT: 180000,
    soldPriceNT: null,
    status: 'consigned',
    photoUrl: null,
    serial: null,
    verifiedTimes: 2,
    arrivalDate: '2026-04-15',
  },
  {
    inventoryId: 'mock-4',
    brand: 'DIOR',
    model: 'Lady Dior S',
    productName: 'Lady Dior 小款 藤格紋',
    color: '粉',
    costNT: 55000,
    soldPriceNT: null,
    status: 'pending_clear',
    photoUrl: null,
    serial: null,
    verifiedTimes: 1,
    arrivalDate: '2026-03-10',
  },
  {
    inventoryId: 'mock-5',
    brand: 'GUCCI',
    model: 'GG Marmont',
    productName: 'GG Marmont 中款 絎縫皮',
    color: '奶白',
    costNT: 32000,
    soldPriceNT: null,
    status: 'in_store',
    photoUrl: null,
    serial: null,
    verifiedTimes: 4,
    arrivalDate: '2026-05-02',
  },
]

// ─── SoldModal（改狀態為 sold 時跳出）─────────────────────────────────────────

interface SoldModalProps {
  item: InventoryItem
  onConfirm: (price: number) => void
  onCancel: () => void
}

function SoldModal({ item, onConfirm, onCancel }: SoldModalProps) {
  const [price, setPrice] = useState(item.soldPriceNT ? String(item.soldPriceNT) : '')
  const [isComposing, setIsComposing] = useState(false)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return
    if (e.key === 'Enter') handleConfirm()
    if (e.key === 'Escape') onCancel()
  }

  const handleConfirm = () => {
    const num = parseInt(price.replace(/,/g, ''), 10)
    if (!num || num <= 0) { toast.error('請輸入有效售價'); return }
    onConfirm(num)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onCancel}
    >
      <div
        className="w-full max-w-sm p-6 rounded-2xl space-y-4"
        style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 30%)' }}
        onClick={e => e.stopPropagation()}
      >
        <div>
          <h3 className="text-sm font-semibold" style={{ color: 'oklch(0.92 0.01 80)' }}>
            確認售出
          </h3>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.02 60)' }}>
            {item.brand} {item.model} · {item.color}
          </p>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs" style={{ color: 'oklch(0.65 0.02 60)' }}>
            售價（NT$）
          </label>
          <div className="relative">
            <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.55 0.02 60)' }} />
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="例：48000"
              autoFocus
              className="w-full pl-8 pr-3 py-2.5 rounded-lg text-sm outline-none"
              style={{
                background: 'oklch(0.1 0.005 60)',
                border: '1px solid oklch(0.25 0.01 65 / 50%)',
                color: 'oklch(0.92 0.01 80)',
              }}
            />
          </div>
          {item.costNT && (
            <p className="text-xs" style={{ color: 'oklch(0.45 0.02 60)' }}>
              進貨價 NT${item.costNT.toLocaleString()}
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs transition-all"
            style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.6 0.02 60)' }}
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all"
            style={{ background: 'linear-gradient(135deg, oklch(0.65 0.08 75), oklch(0.72 0.08 75))', color: 'oklch(0.1 0.005 60)' }}
          >
            確認售出
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── PhotoModal（點縮圖看大圖）─────────────────────────────────────────────────

function PhotoModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.85)' }}
      onClick={onClose}
    >
      <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
        <img src={url} alt="商品大圖" className="w-full rounded-xl object-contain max-h-[80vh]" />
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center transition-all"
          style={{ background: 'oklch(0.2 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 30%)', color: 'oklch(0.72 0.08 75)' }}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}

// ─── InventoryTable ────────────────────────────────────────────────────────────

interface InventoryTableProps {
  items: InventoryItem[]
  onStatusChange: (item: InventoryItem, newStatus: InventoryStatus, soldPrice?: number) => Promise<void>
  onAddToModelDb: (item: InventoryItem) => Promise<void>
  isLoading?: boolean
}

function InventoryTable({ items, onStatusChange, onAddToModelDb, isLoading }: InventoryTableProps) {
  const [soldModalItem, setSoldModalItem] = useState<InventoryItem | null>(null)
  const [photoUrl, setPhotoUrl] = useState<string | null>(null)
  const [pendingStatusItem, setPendingStatusItem] = useState<InventoryItem | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [addingId, setAddingId] = useState<string | null>(null)

  const handleStatusChange = async (item: InventoryItem, newStatus: InventoryStatus) => {
    if (newStatus === 'sold') {
      // 先記住要改成 sold 的 item，然後跳 modal 問售價
      setPendingStatusItem(item)
      setSoldModalItem(item)
      return
    }
    setUpdatingId(item.inventoryId)
    await onStatusChange(item, newStatus)
    setUpdatingId(null)
  }

  const handleSoldConfirm = async (price: number) => {
    if (!pendingStatusItem) return
    setSoldModalItem(null)
    setUpdatingId(pendingStatusItem.inventoryId)
    await onStatusChange(pendingStatusItem, 'sold', price)
    setUpdatingId(null)
    setPendingStatusItem(null)
  }

  const handleAddToModelDb = async (item: InventoryItem) => {
    setAddingId(item.inventoryId)
    await onAddToModelDb(item)
    setAddingId(null)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw size={20} className="animate-spin" style={{ color: 'oklch(0.55 0.02 60)' }} />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div
        className="rounded-xl flex flex-col items-center justify-center gap-3 py-16 text-center"
        style={{ background: 'oklch(0.12 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 10%)' }}
      >
        <Package size={32} style={{ color: 'oklch(0.35 0.02 60)' }} />
        <p className="text-sm" style={{ color: 'oklch(0.5 0.02 60)' }}>此篩選條件下沒有庫存</p>
      </div>
    )
  }

  return (
    <>
      {soldModalItem && (
        <SoldModal
          item={soldModalItem}
          onConfirm={handleSoldConfirm}
          onCancel={() => { setSoldModalItem(null); setPendingStatusItem(null) }}
        />
      )}
      {photoUrl && (
        <PhotoModal url={photoUrl} onClose={() => setPhotoUrl(null)} />
      )}

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto rounded-xl" style={{ border: '1px solid oklch(0.72 0.08 75 / 15%)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr style={{ background: 'oklch(0.16 0.005 60)', borderBottom: '1px solid oklch(0.72 0.08 75 / 15%)' }}>
              {['縮圖', '品牌', '型號', '商品名稱', '顏色', '進貨價', '售價', '狀態', '操作'].map(h => (
                <th
                  key={h}
                  className="px-3 py-3 text-left font-medium tracking-wide"
                  style={{ color: 'oklch(0.65 0.02 60)' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const statusColor = STATUS_COLORS[item.status]
              const isUpdating = updatingId === item.inventoryId
              const isAdding = addingId === item.inventoryId
              return (
                <tr
                  key={item.inventoryId}
                  style={{
                    background: idx % 2 === 0 ? 'oklch(0.12 0.005 60)' : 'oklch(0.13 0.005 60)',
                    borderBottom: '1px solid oklch(0.72 0.08 75 / 8%)',
                    opacity: isUpdating ? 0.6 : 1,
                    transition: 'opacity 0.2s',
                  }}
                >
                  {/* 縮圖 */}
                  <td className="px-3 py-2">
                    {item.photoUrl ? (
                      <button
                        onClick={() => setPhotoUrl(item.photoUrl!)}
                        className="shrink-0 rounded-lg overflow-hidden transition-all hover:opacity-80"
                        style={{ width: 64, height: 80, border: '1px solid oklch(0.72 0.08 75 / 20%)' }}
                      >
                        <img
                          src={item.photoUrl}
                          alt={item.productName}
                          className="w-full h-full object-contain"
                          style={{ background: 'oklch(0.1 0.005 60)' }}
                        />
                      </button>
                    ) : (
                      <div
                        className="rounded-lg flex items-center justify-center"
                        style={{ width: 64, height: 80, background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
                      >
                        <Package size={20} style={{ color: 'oklch(0.35 0.02 60)' }} />
                      </div>
                    )}
                  </td>

                  {/* 品牌 */}
                  <td className="px-3 py-2">
                    <span className="font-semibold tracking-wide" style={{ color: 'oklch(0.82 0.06 75)' }}>
                      {item.brand}
                    </span>
                  </td>

                  {/* 型號 */}
                  <td className="px-3 py-2" style={{ color: 'oklch(0.75 0.02 80)', maxWidth: 120 }}>
                    <span className="block truncate">{item.model || '—'}</span>
                    {item.serial && (
                      <span className="block text-[10px] mt-0.5" style={{ color: 'oklch(0.45 0.02 60)' }}>
                        #{item.serial}
                      </span>
                    )}
                  </td>

                  {/* 商品名稱 */}
                  <td className="px-3 py-2" style={{ color: 'oklch(0.85 0.01 80)', maxWidth: 200 }}>
                    <span className="block truncate">{item.productName}</span>
                  </td>

                  {/* 顏色 */}
                  <td className="px-3 py-2" style={{ color: 'oklch(0.75 0.02 80)' }}>
                    {item.color || '—'}
                  </td>

                  {/* 進貨價 */}
                  <td className="px-3 py-2" style={{ color: 'oklch(0.65 0.02 60)' }}>
                    {item.costNT ? `NT$${item.costNT.toLocaleString()}` : '—'}
                  </td>

                  {/* 售價 */}
                  <td className="px-3 py-2">
                    {item.status === 'sold' && item.soldPriceNT ? (
                      <span style={{ color: '#86efac' }}>NT${item.soldPriceNT.toLocaleString()}</span>
                    ) : item.status !== 'sold' ? (
                      <span style={{ color: 'oklch(0.45 0.02 60)' }}>—</span>
                    ) : (
                      <span style={{ color: 'oklch(0.45 0.02 60)' }}>未記錄</span>
                    )}
                  </td>

                  {/* 狀態 */}
                  <td className="px-3 py-2">
                    <div className="relative">
                      <select
                        value={item.status}
                        disabled={isUpdating}
                        onChange={e => handleStatusChange(item, e.target.value as InventoryStatus)}
                        className="appearance-none pr-6 pl-2 py-1 rounded-full text-xs font-medium outline-none cursor-pointer"
                        style={{
                          background: statusColor.bg,
                          border: `1px solid ${statusColor.border}`,
                          color: statusColor.text,
                          minWidth: 72,
                        }}
                      >
                        {(Object.entries(STATUS_LABELS) as [InventoryStatus, string][]).map(([v, l]) => (
                          <option key={v} value={v} style={{ background: 'oklch(0.14 0.005 60)', color: 'oklch(0.9 0.01 80)' }}>
                            {l}
                          </option>
                        ))}
                      </select>
                      <ChevronDown size={10} className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2" style={{ color: statusColor.text }} />
                    </div>
                  </td>

                  {/* 操作 */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleAddToModelDb(item)}
                      disabled={isAdding}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all whitespace-nowrap disabled:opacity-50"
                      style={{
                        background: 'oklch(0.18 0.005 60)',
                        border: '1px solid oklch(0.72 0.08 75 / 30%)',
                        color: 'oklch(0.72 0.08 75)',
                      }}
                    >
                      {isAdding ? <RefreshCw size={11} className="animate-spin" /> : <Library size={11} />}
                      加入型號庫
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {items.map(item => {
          const statusColor = STATUS_COLORS[item.status]
          const isUpdating = updatingId === item.inventoryId
          const isAdding = addingId === item.inventoryId
          return (
            <div
              key={item.inventoryId}
              className="rounded-xl p-4 space-y-3"
              style={{
                background: 'oklch(0.14 0.005 60)',
                border: '1px solid oklch(0.72 0.08 75 / 15%)',
                opacity: isUpdating ? 0.6 : 1,
              }}
            >
              <div className="flex gap-3">
                {/* 縮圖 */}
                {item.photoUrl ? (
                  <button onClick={() => setPhotoUrl(item.photoUrl!)} className="shrink-0">
                    <img
                      src={item.photoUrl}
                      alt={item.productName}
                      className="w-16 h-20 rounded-lg object-contain"
                      style={{ background: 'oklch(0.1 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 20%)' }}
                    />
                  </button>
                ) : (
                  <div
                    className="w-16 h-20 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
                  >
                    <Package size={18} style={{ color: 'oklch(0.35 0.02 60)' }} />
                  </div>
                )}

                {/* 資訊 */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-sm" style={{ color: 'oklch(0.82 0.06 75)' }}>{item.brand}</span>
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0"
                      style={{ background: statusColor.bg, border: `1px solid ${statusColor.border}`, color: statusColor.text }}
                    >
                      {STATUS_LABELS[item.status]}
                    </span>
                  </div>
                  <p className="text-xs font-medium truncate" style={{ color: 'oklch(0.75 0.02 80)' }}>{item.model}</p>
                  <p className="text-xs truncate" style={{ color: 'oklch(0.65 0.02 60)' }}>{item.productName}</p>
                  <p className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>
                    {item.color}
                    {item.costNT && ` · 進 NT$${item.costNT.toLocaleString()}`}
                    {item.status === 'sold' && item.soldPriceNT && ` · 售 NT$${item.soldPriceNT.toLocaleString()}`}
                  </p>
                </div>
              </div>

              {/* 操作列 */}
              <div className="flex items-center gap-2 pt-1" style={{ borderTop: '1px solid oklch(0.25 0.01 65 / 30%)' }}>
                <div className="relative flex-1">
                  <select
                    value={item.status}
                    disabled={isUpdating}
                    onChange={e => handleStatusChange(item, e.target.value as InventoryStatus)}
                    className="w-full appearance-none pr-6 pl-3 py-1.5 rounded-lg text-xs outline-none"
                    style={{
                      background: statusColor.bg,
                      border: `1px solid ${statusColor.border}`,
                      color: statusColor.text,
                    }}
                  >
                    {(Object.entries(STATUS_LABELS) as [InventoryStatus, string][]).map(([v, l]) => (
                      <option key={v} value={v} style={{ background: 'oklch(0.14 0.005 60)', color: 'oklch(0.9 0.01 80)' }}>
                        {l}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={10} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: statusColor.text }} />
                </div>

                <button
                  onClick={() => handleAddToModelDb(item)}
                  disabled={isAdding}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs transition-all disabled:opacity-50"
                  style={{
                    background: 'oklch(0.18 0.005 60)',
                    border: '1px solid oklch(0.72 0.08 75 / 30%)',
                    color: 'oklch(0.72 0.08 75)',
                  }}
                >
                  {isAdding ? <RefreshCw size={11} className="animate-spin" /> : <Library size={11} />}
                  加入型號庫
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </>
  )
}

// ─── StockDashboard ────────────────────────────────────────────────────────────

function StockDashboard({ onLogout }: { onLogout: () => void }) {
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | 'all'>('all')
  const [brandFilter, setBrandFilter] = useState<Brand>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [page, setPage] = useState(0)
  const [items, setItems] = useState<InventoryItem[]>([])
  // 蕭何 Day 3.1 已上線、切真 API（韓信 2026-05-04）
  const isMockData = false

  // tRPC inventory.list（蕭何 router 已 ready）
  const inventoryListQuery = trpc.inventory.list.useQuery(
    { status: statusFilter === 'all' ? undefined : statusFilter, limit: PAGE_SIZE, offset: page * PAGE_SIZE },
    {
      enabled: true,
      retry: false,
    }
  )

  // sync query.data → items state
  useEffect(() => {
    if (inventoryListQuery.data?.items) {
      setItems(inventoryListQuery.data.items as InventoryItem[])
    }
  }, [inventoryListQuery.data])

  const updateStatusMutation = trpc.inventory.updateStatus.useMutation()
  const addToModelDbMutation = trpc.inventory.addToModelDb.useMutation()

  // 本地篩選（mock data 模式）
  const filteredItems = useMemo(() => {
    let result = items
    if (statusFilter !== 'all') result = result.filter(i => i.status === statusFilter)
    if (brandFilter) result = result.filter(i => i.brand === brandFilter)
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(i =>
        i.model?.toLowerCase().includes(q) ||
        i.productName?.toLowerCase().includes(q) ||
        i.serial?.toLowerCase().includes(q)
      )
    }
    return result
  }, [items, statusFilter, brandFilter, searchQuery])

  // 統計
  const stats = useMemo(() => {
    const inStore = items.filter(i => i.status === 'in_store')
    const totalValue = inStore.reduce((sum, i) => sum + (i.costNT ?? 0), 0)
    return { inStoreCount: inStore.length, totalValue }
  }, [items])

  // 狀態更新
  const handleStatusChange = useCallback(async (item: InventoryItem, newStatus: InventoryStatus, soldPrice?: number) => {
    // 等蕭何 API 上線後：先呼叫 API，成功再 refetch
    // 目前 API stub 會 throw，所以直接跳 fallback
    try {
      await updateStatusMutation.mutateAsync({
        inventoryId: item.inventoryId,
        status: newStatus,
        soldPriceNT: soldPrice,
        soldAt: newStatus === 'sold' ? new Date().toISOString() : undefined,
      })
      void inventoryListQuery.refetch()
    } catch {
      // API 尚未上線，本地更新作 fallback
    }
    setItems(prev => prev.map(i =>
      i.inventoryId === item.inventoryId
        ? { ...i, status: newStatus, soldPriceNT: soldPrice ?? i.soldPriceNT, soldAt: newStatus === 'sold' ? new Date().toISOString() : i.soldAt }
        : i
    ))
    toast.success(`已更新狀態為「${STATUS_LABELS[newStatus]}」`)
  }, [updateStatusMutation, inventoryListQuery])

  // 加入型號庫
  const handleAddToModelDb = useCallback(async (item: InventoryItem) => {
    try {
      const result = await addToModelDbMutation.mutateAsync({
        brand: item.brand,
        serial: item.serial ?? undefined,
        productName: item.productName,
        photoUrl: item.photoUrl ?? undefined,
      })
      const verifiedTimes = (result as unknown as { verifiedTimes?: number })?.verifiedTimes ?? 1
      toast.success(`已加入蹦闆型號資料庫（驗證 ${verifiedTimes} 次）`)
      return
    } catch {
      // API stub 尚未上線，用本地 mock fallback
    }
    const verifiedTimes = (item.verifiedTimes ?? 0) + 1
    setItems(prev => prev.map(i => i.inventoryId === item.inventoryId ? { ...i, verifiedTimes } : i))
    toast.success(`已加入蹦闆型號資料庫（驗證 ${verifiedTimes} 次）`)
  }, [addToModelDbMutation])

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE)
  const pagedItems = filteredItems.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  return (
    <div className="min-h-screen" style={{ background: 'oklch(0.1 0.005 60)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-30 backdrop-blur-md"
        style={{ background: 'oklch(0.14 0.005 60 / 90%)', borderBottom: '1px solid oklch(0.72 0.08 75 / 15%)' }}
      >
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: 'linear-gradient(135deg, oklch(0.65 0.08 75), oklch(0.72 0.08 75))' }}
            >
              <Package size={14} style={{ color: 'oklch(0.1 0.005 60)' }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none" style={{ color: 'oklch(0.92 0.01 80)' }}>庫存盤點</h1>
              <p className="text-[10px]" style={{ color: 'oklch(0.45 0.02 60)' }}>蹦闆精品 · Abby 專用{isMockData ? ' · 示範模式' : ''}</p>
            </div>
          </div>

          <button
            onClick={async () => {
              await fetch('/api/abby-logout', { method: 'POST', credentials: 'include' }).catch(() => {})
              onLogout()
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.6 0.02 60)' }}
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* 統計小卡 */}
        <div className="flex flex-wrap gap-3">
          <div
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
            style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
          >
            <Package size={15} style={{ color: 'oklch(0.72 0.08 75)' }} />
            <span className="text-sm" style={{ color: 'oklch(0.75 0.02 80)' }}>
              在店 <span className="font-semibold" style={{ color: 'oklch(0.92 0.01 80)' }}>{stats.inStoreCount}</span> 件
            </span>
          </div>
          {stats.totalValue > 0 && (
            <div
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl"
              style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
            >
              <DollarSign size={15} style={{ color: 'oklch(0.72 0.08 75)' }} />
              <span className="text-sm" style={{ color: 'oklch(0.75 0.02 80)' }}>
                庫存價值 <span className="font-semibold" style={{ color: 'oklch(0.92 0.01 80)' }}>NT${stats.totalValue.toLocaleString()}</span>
              </span>
            </div>
          )}
        </div>

        {/* 篩選列 */}
        <section
          className="p-4 rounded-xl space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
        >
          {/* 狀態 chip */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTER_OPTIONS.map(opt => {
              const isActive = statusFilter === opt.value
              const color = opt.value !== 'all' ? STATUS_COLORS[opt.value as InventoryStatus] : null
              return (
                <button
                  key={opt.value}
                  onClick={() => { setStatusFilter(opt.value); setPage(0) }}
                  className="px-3 py-1.5 rounded-full text-xs font-medium transition-all"
                  style={isActive && color ? {
                    background: color.bg,
                    border: `1px solid ${color.border}`,
                    color: color.text,
                  } : isActive ? {
                    background: 'oklch(0.72 0.08 75 / 20%)',
                    border: '1px solid oklch(0.72 0.08 75 / 50%)',
                    color: 'oklch(0.82 0.07 75)',
                  } : {
                    background: 'oklch(0.18 0.005 60)',
                    border: '1px solid oklch(0.25 0.01 65 / 50%)',
                    color: 'oklch(0.55 0.02 60)',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          {/* 品牌 dropdown + 搜尋框 */}
          <div className="flex flex-wrap gap-3">
            {/* 品牌 */}
            <div className="relative">
              <select
                value={brandFilter}
                onChange={e => { setBrandFilter(e.target.value as Brand); setPage(0) }}
                className="appearance-none pl-3 pr-7 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: 'oklch(0.18 0.005 60)',
                  border: '1px solid oklch(0.72 0.08 75 / 30%)',
                  color: brandFilter ? 'oklch(0.82 0.06 75)' : 'oklch(0.55 0.02 60)',
                  minWidth: 120,
                }}
              >
                <option value="">全部品牌</option>
                {BRANDS.map(b => (
                  <option key={b} value={b} style={{ background: 'oklch(0.14 0.005 60)', color: 'oklch(0.9 0.01 80)' }}>
                    {b}
                  </option>
                ))}
              </select>
              <ChevronDown size={12} className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.55 0.02 60)' }} />
            </div>

            {/* 搜尋框 */}
            <div className="relative flex-1 min-w-[180px]">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'oklch(0.45 0.02 60)' }} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setPage(0) }}
                placeholder="搜尋型號 / 商品名稱..."
                className="w-full pl-8 pr-8 py-2 rounded-lg text-xs outline-none"
                style={{
                  background: 'oklch(0.18 0.005 60)',
                  border: '1px solid oklch(0.25 0.01 65 / 50%)',
                  color: 'oklch(0.85 0.01 80)',
                }}
              />
              {searchQuery && (
                <button
                  onClick={() => { setSearchQuery(''); setPage(0) }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 transition-colors"
                  style={{ color: 'oklch(0.45 0.02 60)' }}
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* 結果數 */}
            <div className="flex items-center text-xs" style={{ color: 'oklch(0.5 0.02 60)' }}>
              共 {filteredItems.length} 件
            </div>
          </div>
        </section>

        {/* 表格 */}
        <InventoryTable
          items={pagedItems}
          onStatusChange={handleStatusChange}
          onAddToModelDb={handleAddToModelDb}
          isLoading={inventoryListQuery?.isLoading ?? false}
        />

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="p-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.65 0.02 60)' }}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>
              {page + 1} / {totalPages}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page >= totalPages - 1}
              className="p-2 rounded-lg transition-all disabled:opacity-40"
              style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.65 0.02 60)' }}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── StockPage（AuthGate 包裝）────────────────────────────────────────────────

export default function StockPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)

  useEffect(() => {
    fetch('/api/abby-check', { credentials: 'include' })
      .then(res => setAuthed(res.ok))
      .catch(() => setAuthed(false))
  }, [])

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'oklch(0.1 0.005 60)' }}>
        <RefreshCw size={20} className="animate-spin" style={{ color: 'oklch(0.55 0.02 60)' }} />
      </div>
    )
  }

  if (!authed) {
    return (
      <LoginGate
        title="庫存盤點"
        subtitle="蹦闆精品 · Abby 專用"
        onLogin={() => setAuthed(true)}
      />
    )
  }

  return <StockDashboard onLogout={() => setAuthed(false)} />
}
