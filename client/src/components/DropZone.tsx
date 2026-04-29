/**
 * 拖拉上傳區元件 — eagle-toolkit 版
 * 使用 eagle-toolkit oklch 色調（精品暗金風）
 */
import { Upload, Image as ImageIcon, X, AlertTriangle } from 'lucide-react'
import type { DropFile, useDropzone } from '@/hooks/useDropzone'

type DropzoneProps = ReturnType<typeof useDropzone> & {
  disabled?: boolean
}

export function DropZone({
  files,
  isDragging,
  inputRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  onInputChange,
  openPicker,
  removeFile,
  totalSizeMB,
  isFull,
  count,
  disabled,
}: DropzoneProps) {
  const sizeWarning = totalSizeMB > 7

  return (
    <div className="space-y-3">
      {/* 拖拉區 */}
      {!isFull && (
        <div
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={disabled ? undefined : openPicker}
          className="relative rounded-xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center gap-3 p-8 text-center"
          style={{
            borderColor: isDragging ? 'oklch(0.72 0.08 75)' : 'oklch(0.25 0.01 65 / 50%)',
            background: isDragging ? 'oklch(0.72 0.08 75 / 5%)' : 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: isDragging ? 'oklch(0.72 0.08 75 / 20%)' : 'oklch(0.18 0.005 60)' }}
          >
            <Upload size={22} style={{ color: isDragging ? 'oklch(0.72 0.08 75)' : 'oklch(0.6 0.02 60)' }} />
          </div>
          <div>
            <p className="text-sm font-medium" style={{ color: 'oklch(0.92 0.01 80)' }}>
              {isDragging ? '放開以上傳' : '拖拉照片到這裡，或點擊選擇'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'oklch(0.55 0.02 60)' }}>
              支援 JPG / PNG / WEBP · 最多 {60 - count} 張（已選 {count} 張）
            </p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={onInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* 已滿提示 */}
      {isFull && (
        <div className="rounded-xl px-4 py-3 flex items-center gap-2" style={{ border: '1px solid oklch(0.72 0.08 75 / 40%)', background: 'oklch(0.72 0.08 75 / 5%)' }}>
          <AlertTriangle size={16} style={{ color: 'oklch(0.72 0.08 75)' }} className="shrink-0" />
          <p className="text-sm" style={{ color: 'oklch(0.72 0.08 75)' }}>單批最多 60 張，已達上限</p>
        </div>
      )}

      {/* 大小警告 */}
      {sizeWarning && (
        <div className="rounded-lg px-3 py-2 flex items-center gap-2" style={{ border: '1px solid rgba(249,115,22,0.4)', background: 'rgba(249,115,22,0.05)' }}>
          <AlertTriangle size={14} className="text-orange-400 shrink-0" />
          <p className="text-xs text-orange-400">
            總大小 {totalSizeMB.toFixed(1)} MB，建議不超過 8 MB 以免傳送過慢
          </p>
        </div>
      )}

      {/* 縮圖 Grid */}
      {files.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {files.map((f: DropFile) => (
            <div key={f.id} className="relative group aspect-square">
              <img
                src={f.previewUrl}
                alt={f.file.name}
                className="w-full h-full object-cover rounded-lg"
                style={{ border: '1px solid oklch(0.25 0.01 65 / 50%)' }}
              />
              <button
                onClick={e => { e.stopPropagation(); removeFile(f.id) }}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                <X size={10} />
              </button>
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 rounded-b-lg px-1 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-[9px] text-white truncate">{f.sizeKB}KB</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 統計列 */}
      {files.length > 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'oklch(0.55 0.02 60)' }}>
          <ImageIcon size={12} />
          <span>{count} 張 · {totalSizeMB.toFixed(1)} MB 總大小</span>
        </div>
      )}
    </div>
  )
}
