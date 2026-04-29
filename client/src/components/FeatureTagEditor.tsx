/**
 * 特徵標籤編輯器 — eagle-toolkit 版
 */
import { useState, KeyboardEvent, useRef } from 'react'
import { Plus, X } from 'lucide-react'

interface FeatureTagEditorProps {
  value: string[]
  onChange: (next: string[]) => void
}

export function FeatureTagEditor({ value, onChange }: FeatureTagEditorProps) {
  const [inputVal, setInputVal] = useState('')
  const isComposing = useRef(false)

  const add = () => {
    const v = inputVal.trim()
    if (!v || value.includes(v)) { setInputVal(''); return }
    onChange([...value, v])
    setInputVal('')
  }

  const remove = (tag: string) => {
    onChange(value.filter(t => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (isComposing.current) return
    if (e.key === 'Enter') { e.preventDefault(); add() }
    if (e.key === 'Backspace' && !inputVal && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1 items-center min-h-[30px]">
      {value.map(tag => (
        <span
          key={tag}
          className="flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded"
          style={{ background: 'oklch(0.72 0.08 75 / 15%)', border: '1px solid oklch(0.72 0.08 75 / 30%)', color: 'oklch(0.72 0.08 75)' }}
        >
          {tag}
          <button
            onClick={() => remove(tag)}
            className="hover:text-red-400 transition-colors ml-0.5"
          >
            <X size={10} />
          </button>
        </span>
      ))}
      <div className="flex items-center gap-0.5">
        <input
          type="text"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onKeyDown={handleKeyDown}
          onCompositionStart={() => { isComposing.current = true }}
          onCompositionEnd={() => { isComposing.current = false }}
          placeholder={value.length === 0 ? '輸入特徵...' : '+'}
          className="bg-transparent text-xs outline-none w-16"
          style={{ color: 'oklch(0.92 0.01 80)' }}
        />
        {inputVal && (
          <button onClick={add} style={{ color: 'oklch(0.72 0.08 75)' }}>
            <Plus size={12} />
          </button>
        )}
      </div>
    </div>
  )
}
