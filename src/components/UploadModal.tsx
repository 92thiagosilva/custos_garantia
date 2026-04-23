'use client'

import { useState, useRef, DragEvent } from 'react'
import { parseGarantiaXlsx, getSheetNames } from '@/lib/excel-parser'
import type { SacRecord } from '@/types/sac'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [file, setFile] = useState<File | null>(null)
  const [trimestre, setTrimestre] = useState('')
  const [preview, setPreview] = useState<{ count: number; fabricantes: string[] } | null>(null)
  const [sheetNames, setSheetNames] = useState<string[]>([])
  const [records, setRecords] = useState<SacRecord[]>([])
  const [status, setStatus] = useState<'idle' | 'parsing' | 'ready' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const TRIMESTRE_RE = /^\dT\d{2}$/  // ex: 1T26

  const handleFile = async (f: File) => {
    setFile(f)
    setStatus('parsing')
    setError('')
    try {
      const names = await getSheetNames(f)
      setSheetNames(names)

      if (!trimestre || !TRIMESTRE_RE.test(trimestre)) {
        setStatus('idle')
        return
      }
      await doParse(f, trimestre)
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const doParse = async (f: File, tri: string) => {
    setStatus('parsing')
    try {
      const parsed = await parseGarantiaXlsx(f, tri)
      setRecords(parsed)
      const fabs = [...new Set(parsed.map(r => r.fabricante))].sort()
      setPreview({ count: parsed.length, fabricantes: fabs })
      setStatus('ready')
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const handleTrimestreChange = async (val: string) => {
    setTrimestre(val)
    if (file && TRIMESTRE_RE.test(val)) {
      await doParse(file, val)
    }
  }

  const handleSave = async () => {
    if (!records.length) return
    setStatus('saving')
    try {
      const res = await fetch('/api/records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records }),
      })
      if (!res.ok) throw new Error(await res.text())
      setStatus('done')
      setTimeout(() => { onSuccess(); onClose() }, 1000)
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-lg shadow-2xl border border-border">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Importar Planilha de Garantia</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none cursor-pointer">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Trimestre input */}
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-muted font-medium mb-1.5">
              Identificador do Trimestre
            </label>
            <input
              type="text"
              placeholder="ex: 1T26, 2T26, 3T25"
              value={trimestre}
              onChange={e => handleTrimestreChange(e.target.value.toUpperCase())}
              className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-surface text-foreground placeholder-dim focus:outline-none focus:border-fotus-blue transition-colors"
            />
            {trimestre && !TRIMESTRE_RE.test(trimestre) && (
              <p className="text-[11px] text-red-500 mt-1">Formato esperado: 1T26 (trimestre + T + 2 dígitos do ano)</p>
            )}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-fotus-blue transition-colors"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
            />
            {file ? (
              <div>
                <p className="font-medium text-foreground text-sm">{file.name}</p>
                <p className="text-dim text-xs mt-1">{(file.size / 1024).toFixed(0)} KB</p>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted">Arraste o arquivo <strong>.xlsx</strong> ou clique para selecionar</p>
                <p className="text-[11px] text-dim mt-1">Abas: Custo de Produtos, Custo de Envio, Custo de Coleta</p>
              </div>
            )}
          </div>

          {/* Sheet names debug */}
          {sheetNames.length > 0 && (
            <p className="text-[11px] text-dim">
              Abas encontradas: {sheetNames.join(', ')}
            </p>
          )}

          {/* Preview */}
          {status === 'ready' && preview && (
            <div className="bg-surface2 rounded-lg px-4 py-3 text-sm">
              <p className="font-medium text-foreground">{preview.count} registros encontrados</p>
              <p className="text-muted text-xs mt-0.5">Fabricantes: {preview.fabricantes.join(', ')}</p>
            </div>
          )}

          {status === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Dados importados com sucesso!
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground border border-border hover:border-border/80 transition-colors cursor-pointer bg-transparent"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={status !== 'ready'}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white bg-fotus-blue hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
          >
            {status === 'saving' ? 'Salvando…' : 'Salvar no Banco'}
          </button>
        </div>
      </div>
    </div>
  )
}
