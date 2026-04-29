/**
 * 原生 HTML5 dropzone hook（不依賴第三方套件）
 * - 支援拖拉 + 點擊上傳
 * - 回傳 File[] + objectURL[]（縮圖用）
 * - 限制 60 張
 */
import { useState, useCallback, useRef, DragEvent, ChangeEvent } from 'react'

const MAX_FILES = 60

export interface DropFile {
  id: string           // 唯一識別，用 crypto.randomUUID()
  file: File
  previewUrl: string   // objectURL，記得 revokeObjectURL 清理
  sizeKB: number
}

export function useDropzone() {
  const [files, setFiles] = useState<DropFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const addFiles = useCallback((incoming: File[]) => {
    const imageFiles = incoming.filter(f => f.type.startsWith('image/'))
    setFiles(prev => {
      const remaining = MAX_FILES - prev.length
      if (remaining <= 0) return prev
      const toAdd = imageFiles.slice(0, remaining)
      const newDropFiles: DropFile[] = toAdd.map(f => ({
        id: crypto.randomUUID(),
        file: f,
        previewUrl: URL.createObjectURL(f),
        sizeKB: Math.round(f.size / 1024),
      }))
      return [...prev, ...newDropFiles]
    })
  }, [])

  const removeFile = useCallback((id: string) => {
    setFiles(prev => {
      const target = prev.find(f => f.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter(f => f.id !== id)
    })
  }, [])

  const clearFiles = useCallback(() => {
    setFiles(prev => {
      prev.forEach(f => URL.revokeObjectURL(f.previewUrl))
      return []
    })
    if (inputRef.current) inputRef.current.value = ''
  }, [])

  const onDragEnter = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(true)
  }, [])

  const onDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node | null)) {
      setIsDragging(false)
    }
  }, [])

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
  }, [])

  const onDrop = useCallback((e: DragEvent) => {
    e.preventDefault(); e.stopPropagation()
    setIsDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    addFiles(dropped)
  }, [addFiles])

  const onInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? [])
    addFiles(selected)
    e.target.value = ''
  }, [addFiles])

  const openPicker = useCallback(() => {
    inputRef.current?.click()
  }, [])

  const totalSizeMB = files.reduce((sum, f) => sum + f.sizeKB, 0) / 1024

  return {
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
    clearFiles,
    totalSizeMB,
    isFull: files.length >= MAX_FILES,
    count: files.length,
  }
}
