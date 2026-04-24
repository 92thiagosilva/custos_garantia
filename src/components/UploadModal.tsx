'use client'

import { useState, useRef, DragEvent } from 'react'
import { parseGarantiaXlsx } from '@/lib/excel-parser'
import type { ParseDebug } from '@/lib/excel-parser'
import type { SacRecord } from '@/types/sac'

interface Props {
  onClose: () => void
  onSuccess: () => void
}

function fmt(n: number) {
  return n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
}

export default function UploadModal({ onClose, onSuccess }: Props) {
  const [file, setFile]       = useState<File | null>(null)
  const [trimestre, setTrimestre] = useState('')
  const [records, setRecords] = useState<SacRecord[]>([])
  const [debug, setDebug]     = useState<ParseDebug | null>(null)
  const [status, setStatus]   = useState<'idle' | 'parsing' | 'ready' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError]     = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const TRIMESTRE_RE = /^\dT\d{2}$/

  const doParse = async (f: File, tri: string) => {
    setStatus('parsing')
    setError('')
    try {
      const result = await parseGarantiaXlsx(f, tri)
      setRecords(result.records)
      setDebug(result.debug)
      setStatus('ready')
    } catch (e) {
      setError(String(e))
      setStatus('error')
    }
  }

  const handleFile = async (f: File) => {
    setFile(f)
    setDebug(null)
    setRecords([])
    setStatus('idle')
    if (trimestre && TRIMESTRE_RE.test(trimestre)) {
      await doParse(f, trimestre)
    }
  }

  const handleTrimestreChange = async (val: string) => {
    setTrimestre(val)
    if (file && TRIMESTRE_RE.test(val)) await doParse(file, val)
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
      setTimeout(() => { onSuccess(); onClose() }, 1200)
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

  const fabs = debug ? [...new Set(records.map(r => r.fabricante))].sort() : []

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-surface rounded-2xl w-full max-w-xl shadow-2xl border border-border overflow-y-auto" style={{ maxHeight: '90vh' }}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2 className="font-semibold text-foreground">Importar Planilha de Garantia</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors text-xl leading-none cursor-pointer">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {/* Trimestre */}
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
              <p className="text-[11px] text-red-500 mt-1">Formato esperado: 1T26</p>
            )}
          </div>

          {/* Drop zone */}
          <div
            onClick={() => inputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={e => e.preventDefault()}
            className="border-2 border-dashed border-border rounded-xl p-7 text-center cursor-pointer hover:border-fotus-blue transition-colors"
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
                <p className="text-sm text-muted">Arraste o <strong>.xlsx</strong> ou clique para selecionar</p>
              </div>
            )}
          </div>

          {/* Status parsing */}
          {status === 'parsing' && (
            <p className="text-[12px] text-muted text-center">Lendo planilha…</p>
          )}

          {/* Debug + Preview */}
          {debug && status === 'ready' && (
            <div className="space-y-3">
              {/* Abas */}
              <div className="bg-surface2 rounded-lg px-4 py-3 text-[11px] space-y-1">
                <p className="font-semibold text-foreground text-[12px]">Abas encontradas ({debug.sheets.length})</p>
                <p className="text-muted font-mono">{debug.sheets.join('  ·  ')}</p>
              </div>

              {/* Colunas detectadas */}
              <div className="bg-surface2 rounded-lg px-4 py-3 text-[11px] space-y-2">
                <p className="font-semibold text-foreground text-[12px]">Colunas detectadas</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Produtos', sac: debug.sacColProd, custo: debug.custoColProd, cols: debug.colsProd },
                    { label: 'Envio',    sac: debug.sacColEnvio,  custo: debug.custoColEnvio,  cols: debug.colsEnvio },
                    { label: 'Coleta',  sac: debug.sacColColeta, custo: debug.custoColColeta, cols: debug.colsColeta },
                  ].map(({ label, sac, custo, cols }) => (
                    <div key={label} className="space-y-0.5">
                      <p className="font-medium text-muted uppercase tracking-wider text-[10px]">{label}</p>
                      <p className="text-foreground">SAC: <span className="font-mono text-fotus-sky">{sac || '—'}</span></p>
                      <p className="text-foreground">Custo: <span className="font-mono text-fotus-teal">{custo || '—'}</span></p>
                      {cols.length > 0 && (
                        <p className="text-dim text-[10px] leading-relaxed">
                          {cols.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totais */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Custo Produto', value: debug.totals.prod,   ok: debug.totals.prod   > 0, color: '#1E3A5F' },
                  { label: 'Custo Envio',   value: debug.totals.envio,  ok: debug.totals.envio  > 0, color: '#F5C400' },
                  { label: 'Custo Coleta',  value: debug.totals.coleta, ok: debug.totals.coleta > 0, color: '#378ADD' },
                ].map(({ label, value, ok, color }) => (
                  <div key={label} className="bg-surface2 rounded-lg px-3 py-2 text-center border" style={{ borderColor: ok ? color : 'rgba(220,38,38,0.4)' }}>
                    <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
                    <p className="font-mono text-sm font-bold mt-0.5" style={{ color: ok ? color : '#dc2626' }}>
                      {fmt(value)}
                    </p>
                    {!ok && <p className="text-[10px] text-red-500 mt-0.5">Coluna não encontrada</p>}
                  </div>
                ))}
              </div>

              {/* Fabricantes + meses */}
              <div className="bg-surface2 rounded-lg px-4 py-3 text-[11px] space-y-1.5">
                <p className="font-semibold text-foreground text-[12px]">{records.length} registros · {fabs.length} fabricantes</p>
                <p className="text-muted leading-relaxed">{fabs.join(', ')}</p>
                {debug.allMonths.length > 0 && (
                  <p className="text-dim text-[10px]">
                    Meses encontrados (Envio/Coleta):{' '}
                    {debug.allMonths.map(m => ['', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'][m] ?? m).join(', ')}
                  </p>
                )}
                {(debug.fabColEnvio || debug.fabColColeta) && (
                  <p className="text-dim text-[10px]">
                    Col. Fabricante → Envio: <span className="font-mono text-fotus-sky">{debug.fabColEnvio || '—'}</span>{' '}
                    · Coleta: <span className="font-mono text-fotus-sky">{debug.fabColColeta || '—'}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {status === 'done' && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-700">
              Dados importados com sucesso!
            </div>
          )}

          {status === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700 font-mono break-all">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-muted hover:text-foreground border border-border transition-colors cursor-pointer bg-transparent"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={status !== 'ready'}
            className="px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            style={{ background: '#1E3A5F' }}
          >
            {status === 'saving' ? 'Salvando…' : 'Salvar no Banco'}
          </button>
        </div>
      </div>
    </div>
  )
}
