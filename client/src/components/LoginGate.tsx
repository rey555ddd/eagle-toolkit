/**
 * LoginGate — 蹦闆精品通用登入守門元件
 * 共用 cookie：eagle_abby_auth=Abby888
 * 呼叫 /api/abby-login、/api/abby-check、/api/abby-logout
 */
import { useState } from 'react'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, RefreshCw, ShoppingBag } from 'lucide-react'

interface LoginGateProps {
  /** 登入成功 callback */
  onLogin: () => void
  /** 頁面標題（不同工具顯示不同名稱） */
  title?: string
  /** 副標題 */
  subtitle?: string
}

export default function LoginGate({ onLogin, title = '蹦闆精品', subtitle = '蹦闆精品 · Abby 專用' }: LoginGateProps) {
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isComposing, setIsComposing] = useState(false)

  const handleSubmit = async () => {
    if (!password.trim()) { toast.error('請輸入密碼'); return }
    setIsLoading(true)
    try {
      const res = await fetch('/api/abby-login', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      })
      if (res.ok) {
        toast.success('登入成功')
        onLogin()
      } else {
        const data = await res.json().catch(() => ({})) as { error?: string }
        toast.error(data.error || '密碼錯誤')
        setPassword('')
      }
    } catch {
      toast.error('網路錯誤，請稍後再試')
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
            {title}
          </h1>
          <p className="text-xs mt-1" style={{ color: 'oklch(0.45 0.02 60)' }}>{subtitle}</p>
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
