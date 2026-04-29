/**
 * 採購助手 /purchase
 * Abby 專用 — 要密碼才能進
 * - 密碼驗證：localStorage token（與 /radar 同模式）
 * - 拖拉上傳 → 批次辨識 → 結果表格（含價格欄）→ 信心度警示
 */
import { useState } from 'react'
import { toast } from 'sonner'
import {
  ScanLine, Trash2, RefreshCw, Save, DollarSign, Lock, Eye, EyeOff, LogOut,
  ShoppingBag,
} from 'lucide-react'
import { trpc } from '@/lib/trpc'
import { useDropzone } from '@/hooks/useDropzone'
import { useRecognize } from '@/hooks/useRecognize'
import { DropZone } from '@/components/DropZone'
import { PurchaseProgressBar } from '@/components/PurchaseProgressBar'
import { PurchaseResultTable } from '@/components/PurchaseResultTable'

const LS_TOKEN = 'abby-purchase-token'

// ─── AuthGuard ───────────────────────────────────────────────────────────────

export default function PurchasePage() {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(LS_TOKEN))

  if (!token) {
    return (
      <LoginGate onLogin={(tk) => {
        localStorage.setItem(LS_TOKEN, tk)
        setToken(tk)
      }} />
    )
  }

  return (
    <PurchaseDashboard
      onLogout={() => {
        localStorage.removeItem(LS_TOKEN)
        setToken(null)
      }}
    />
  )
}

// ─── 登入頁 ───────────────────────────────────────────────────────────────────

function LoginGate({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  const loginMut = trpc.purchase.login.useMutation({
    onSuccess: (data) => {
      onLogin(data.token)
      toast.success('登入成功')
    },
    onError: (err) => {
      toast.error(err.message || '密碼錯誤')
      setPassword('')
    },
  })

  const handleSubmit = async () => {
    if (!password.trim()) { toast.error('請輸入密碼'); return }
    setIsLoading(true)
    try {
      await loginMut.mutateAsync({ password: password.trim() })
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (isComposing) return
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: 'linear-gradient(135deg, oklch(0.08 0.005 60) 0%, oklch(0.12 0.005 60) 100%)' }}
    >
      <div
        className="w-full max-w-sm p-8 rounded-2xl"
        style={{
          background: 'oklch(0.14 0.005 60)',
          border: '1px solid oklch(0.72 0.08 75 / 25%)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {/* 圖示 */}
        <div className="flex flex-col items-center mb-6">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mb-3"
            style={{ background: 'oklch(0.72 0.08 75 / 15%)', border: '1px solid oklch(0.72 0.08 75 / 30%)' }}
          >
            <ShoppingBag size={24} style={{ color: 'oklch(0.82 0.07 75)' }} />
          </div>
          <h1
            className="text-xl font-light tracking-widest"
            style={{ color: 'oklch(0.92 0.01 80)', fontFamily: "'Noto Serif TC', serif" }}
          >
            採購辨識助手
          </h1>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0.02 60)' }}>蹦闆精品 · Abby 專用</p>
        </div>

        {/* 輸入 */}
        <div className="space-y-3">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={() => setIsComposing(false)}
              placeholder="請輸入密碼"
              autoFocus
              autoComplete="current-password"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none pr-10"
              style={{
                background: 'oklch(0.1 0.005 60)',
                border: '1px solid oklch(0.25 0.01 65 / 50%)',
                color: 'oklch(0.92 0.01 80)',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
              style={{ color: 'oklch(0.45 0.02 60)' }}
              tabIndex={-1}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!password || isLoading}
            className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: 'linear-gradient(135deg, oklch(0.65 0.08 75), oklch(0.72 0.08 75))', color: 'oklch(0.1 0.005 60)' }}
          >
            {isLoading ? <RefreshCw size={14} className="animate-spin" /> : <Lock size={14} />}
            {isLoading ? '驗證中...' : '進入系統'}
          </button>
        </div>

        <p className="mt-4 text-xs text-center" style={{ color: 'oklch(0.45 0.02 60)' }}>
          蹦闆精品內部系統 · 僅授權人員使用
        </p>
      </div>
    </div>
  )
}

// ─── 主儀表板 ─────────────────────────────────────────────────────────────────

function PurchaseDashboard({ onLogout }: { onLogout: () => void }) {
  const dropzone = useDropzone()
  const { results, isRecognizing, progress, totalCostLog, recognize, updateResult, clearResults } = useRecognize()

  const handleRecognize = async () => {
    if (dropzone.files.length === 0) { toast.error('請先上傳照片'); return }
    await recognize(dropzone.files.map(f => ({ id: f.id, file: f.file })))
  }

  const handleReset = () => {
    dropzone.clearFiles()
    clearResults()
  }

  const handleSave = () => {
    if (results.length === 0) { toast.error('沒有辨識結果可儲存'); return }
    // 輸出 CSV 格式（每行：品牌,型號,顏色,尺寸,序號,特徵,價格,商品名稱,信心度）
    const header = '品牌,型號,顏色,尺寸,序號,特徵,價格(NT$),商品名稱,信心度\n'
    const rows = results.map(r =>
      [r.brand, r.model, r.color, r.size ?? '', r.serial ?? '', r.features.join('/'),
       r.price ?? '', r.formattedName, `${Math.round(r.confidence * 100)}%`].join(',')
    ).join('\n')
    const blob = new Blob(['﻿' + header + rows], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `採購辨識_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`已下載 ${results.length} 件辨識結果`)
  }

  const hasResults = results.length > 0
  const lowConfCount = results.filter(r => r.confidence < 0.7).length

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
              <ShoppingBag size={14} style={{ color: 'oklch(0.1 0.005 60)' }} />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none" style={{ color: 'oklch(0.92 0.01 80)' }}>採購辨識助手</h1>
              <p className="text-[10px]" style={{ color: 'oklch(0.45 0.02 60)' }}>蹦闆精品 · Abby 專用</p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all"
            style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.6 0.02 60)' }}
          >
            <LogOut size={13} />
            <span className="hidden sm:inline">登出</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* 上傳區 */}
        <section
          className="p-5 rounded-xl space-y-4"
          style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'oklch(0.92 0.01 80)' }}>
              <ScanLine size={15} style={{ color: 'oklch(0.72 0.08 75)' }} />
              上傳照片
            </h2>
            {dropzone.count > 0 && !isRecognizing && (
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-red-400 transition-all"
                style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)' }}
              >
                <Trash2 size={12} />
                全部清除
              </button>
            )}
          </div>

          <DropZone {...dropzone} disabled={isRecognizing} />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              onClick={handleRecognize}
              disabled={dropzone.count === 0 || isRecognizing}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 transition-all"
              style={{ background: 'linear-gradient(135deg, oklch(0.65 0.08 75), oklch(0.72 0.08 75))', color: 'oklch(0.1 0.005 60)' }}
            >
              {isRecognizing ? (
                <RefreshCw size={15} className="animate-spin" />
              ) : (
                <ScanLine size={15} />
              )}
              {isRecognizing ? '辨識中...' : '開始辨識'}
            </button>

            {hasResults && !isRecognizing && (
              <button
                onClick={handleRecognize}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs transition-all"
                style={{ background: 'oklch(0.18 0.005 60)', border: '1px solid oklch(0.25 0.01 65 / 50%)', color: 'oklch(0.6 0.02 60)' }}
              >
                <RefreshCw size={13} />
                全部重新辨識
              </button>
            )}
          </div>
        </section>

        {/* 進度條 */}
        {isRecognizing && (
          <PurchaseProgressBar done={progress.done} total={progress.total} />
        )}

        {/* 辨識結果 */}
        {hasResults && !isRecognizing && (
          <section
            className="p-5 rounded-xl space-y-4"
            style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 15%)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <h2 className="text-sm font-semibold" style={{ color: 'oklch(0.92 0.01 80)' }}>
                  辨識結果
                  <span className="ml-2 font-normal" style={{ color: 'oklch(0.72 0.08 75)' }}>{results.length} 件</span>
                </h2>
                {lowConfCount > 0 && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.4)', color: '#fb923c' }}
                  >
                    {lowConfCount} 件需確認
                  </span>
                )}
              </div>

              {totalCostLog && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>
                  <DollarSign size={12} style={{ color: 'oklch(0.72 0.08 75)' }} />
                  <span>{totalCostLog}</span>
                </div>
              )}
            </div>

            {/* 信心度警示 */}
            {lowConfCount > 0 && (
              <div
                className="rounded-lg px-3 py-2 text-xs text-orange-400"
                style={{ border: '1px solid rgba(249,115,22,0.3)', background: 'rgba(249,115,22,0.05)' }}
              >
                信心度低於 70% 的商品（橘色標線）請 Abby 手動確認品牌和型號
              </div>
            )}

            <PurchaseResultTable
              results={results}
              dropFiles={dropzone.files}
              onUpdate={updateResult}
            />

            {/* 下方操作 */}
            <div
              className="flex flex-wrap items-center justify-between gap-3 pt-2"
              style={{ borderTop: '1px solid oklch(0.25 0.01 65 / 50%)' }}
            >
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{ background: 'linear-gradient(135deg, oklch(0.65 0.08 75), oklch(0.72 0.08 75))', color: 'oklch(0.1 0.005 60)' }}
                >
                  <Save size={14} />
                  下載 CSV
                </button>
              </div>

              {totalCostLog && (
                <p className="text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>{totalCostLog}</p>
              )}
            </div>
          </section>
        )}

        {/* 空狀態 */}
        {!hasResults && !isRecognizing && dropzone.count === 0 && (
          <div
            className="p-10 rounded-xl flex flex-col items-center justify-center gap-3 text-center"
            style={{ background: 'oklch(0.14 0.005 60)', border: '1px solid oklch(0.72 0.08 75 / 10%)' }}
          >
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ background: 'oklch(0.18 0.005 60)' }}
            >
              <ScanLine size={24} style={{ color: 'oklch(0.72 0.08 75 / 50%)' }} />
            </div>
            <p className="text-sm" style={{ color: 'oklch(0.6 0.02 60)' }}>上傳精品包照片，AI 自動辨識品牌、型號、顏色</p>
            <p className="text-xs" style={{ color: 'oklch(0.45 0.02 60)' }}>支援香奈兒 / LV / 愛馬仕 / DIOR / GUCCI / YSL / BV / GOYARD</p>
          </div>
        )}
      </main>
    </div>
  )
}
