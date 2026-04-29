/**
 * 批次辨識 hook
 * - 呼叫 tRPC purchase.batchRecognize
 * - 10 張一批防止單次 payload 過大
 */
import { useState, useCallback } from 'react'
import { trpc } from '@/lib/trpc'

export interface RecognizeResult {
  imageIndex: number
  brand: string
  model: string
  color: string
  size: string | null
  serial: string | null
  features: string[]
  confidence: number
  formattedName: string
  price: number | null
  costLog: string
  error?: string
}

export interface EditableResult extends RecognizeResult {
  id: string  // 對應 DropFile.id
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('讀取檔案失敗'))
    reader.readAsDataURL(file)
  })
}

const BATCH_SIZE = 10

export function useRecognize() {
  const [results, setResults] = useState<EditableResult[]>([])
  const [isRecognizing, setIsRecognizing] = useState(false)
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [totalCostLog, setTotalCostLog] = useState<string>('')

  const batchRecognizeMutation = trpc.purchase.batchRecognize.useMutation()

  const recognize = useCallback(async (files: { id: string; file: File }[]) => {
    if (files.length === 0) return
    setIsRecognizing(true)
    setProgress({ done: 0, total: files.length })
    setResults([])
    setTotalCostLog('')

    const allResults: EditableResult[] = []
    let totalCost = 0

    for (let start = 0; start < files.length; start += BATCH_SIZE) {
      const batch = files.slice(start, Math.min(start + BATCH_SIZE, files.length))
      const dataURLs = await Promise.all(batch.map(f => readFileAsDataURL(f.file)))

      let batchResult: { results: RecognizeResult[]; totalCostLog: string; imageCount: number }
      try {
        batchResult = await batchRecognizeMutation.mutateAsync({ images: dataURLs })
      } catch (err) {
        const errMsg = String(err)
        batch.forEach((f, localIdx) => {
          allResults.push({
            id: f.id,
            imageIndex: start + localIdx,
            brand: '辨識失敗',
            model: '',
            color: '',
            size: null,
            serial: null,
            features: [],
            confidence: 0,
            formattedName: `${start + localIdx + 1}.辨識失敗`,
            price: null,
            costLog: '',
            error: errMsg,
          })
        })
        setProgress(p => ({ ...p, done: p.done + batch.length }))
        continue
      }

      batchResult.results.forEach((r, localIdx) => {
        allResults.push({
          ...r,
          id: batch[localIdx]!.id,
          imageIndex: start + localIdx,
        })
      })

      const costMatch = batchResult.totalCostLog.match(/NT\$([0-9.]+)/)
      if (costMatch?.[1]) totalCost += parseFloat(costMatch[1])
      setProgress(p => ({ ...p, done: p.done + batch.length }))
    }

    setResults(allResults)
    setTotalCostLog(`[費用小計] ${files.length} 張照片 ≈ NT$${totalCost.toFixed(2)}`)
    setIsRecognizing(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const updateResult = useCallback((id: string, patch: Partial<EditableResult>) => {
    setResults(prev => prev.map(r => {
      if (r.id !== id) return r
      const updated = { ...r, ...patch }
      if (!('formattedName' in patch)) {
        updated.formattedName = buildFormattedName(
          updated.imageIndex + 1,
          updated.brand,
          updated.model,
          updated.color,
          updated.size,
          updated.serial,
          updated.features,
        )
      }
      return updated
    }))
  }, [])

  const clearResults = useCallback(() => {
    setResults([])
    setTotalCostLog('')
    setProgress({ done: 0, total: 0 })
  }, [])

  return { results, isRecognizing, progress, totalCostLog, recognize, updateResult, clearResults }
}

function buildFormattedName(
  seq: number, brand: string, model: string, color: string,
  size: string | null, serial: string | null, features: string[],
): string {
  const f = features.join('')
  switch (brand) {
    case 'LV': return `${seq}.LV${model}/${color}${serial ? ` ${serial}` : ''}`.trim()
    case '愛馬仕': return `${seq}.愛馬仕${model}${size ? ` ${size}` : ''}${color ? `/${color}` : ''}${features.length > 0 ? `/${features.join('/')}` : ''}`.trim()
    case '香奈兒': return `${seq}.香奈兒 ${model}/${color}${size ? ` ${size}` : ''}${f ? ` ${f}` : ''}`.trim()
    case 'DIOR': return `${seq}.DIOR ${model}${color ? `/${color}` : ''}${features.length > 0 ? `/${features.join('')}` : ''}`.trim()
    case 'GUCCI': return `${seq}.GUCCI${model}${color ? `/${color}` : ''}`.trim()
    case 'YSL': return `${seq}.YSL ${model}${color ? `/${color}` : ''}${features.length > 0 ? `/${features.join('')}` : ''}`.trim()
    case 'BV': return `${seq}.BV${model}${color ? `/${color}` : ''}`.trim()
    case 'GOYARD': return `${seq}.GOYARD${model}${color ? `/${color}` : ''}`.trim()
    default: return `${seq}.${brand}${model}${color ? `/${color}` : ''}${size ? `/${size}` : ''}`.trim()
  }
}
