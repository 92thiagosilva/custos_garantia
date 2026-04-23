'use client'

import type { SacRecord } from '@/types/sac'

// Client-side Excel parser — runs in the browser to avoid Vercel serverless timeouts.
// SheetJS is dynamically imported to avoid SSR issues.
export async function parseGarantiaXlsx(
  file: File,
  trimestreAno: string
): Promise<SacRecord[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })

  // Helper to safely read a sheet
  const toJson = (name: string): Record<string, unknown>[] => {
    const sheet = wb.Sheets[name]
    if (!sheet) return []
    return XLSX.utils.sheet_to_json(sheet, { defval: 0 }) as Record<string, unknown>[]
  }

  const rowsProd   = toJson('Custo de Produtos')
  const rowsEnvio  = toJson('Custo de Envio')
  const rowsColeta = toJson('Custo de Coleta')

  // Index by SAC number
  const byId = new Map<number, SacRecord>()

  for (const row of rowsProd) {
    const sacId = Number(row['SAC'] ?? row['Nº SAC'] ?? row['N SAC'] ?? 0)
    if (!sacId) continue
    byId.set(sacId, {
      trimestreAno,
      sacId,
      fabricante: String(row['Fabricante'] ?? row['FABRICANTE'] ?? ''),
      tipo:       String(row['Tipo'] ?? row['TIPO'] ?? row['Tipo de Produto'] ?? ''),
      custoProduto: Number(row['Custo do Produto'] ?? row['Custo Produto'] ?? row['CUSTO PRODUTO'] ?? 0),
      custoEnvio:   0,
      custoColeta:  0,
      custoTotal:   0,
      mes: Number(row['Mês'] ?? row['Mes'] ?? row['MÊS'] ?? row['MES'] ?? 1),
    })
  }

  for (const row of rowsEnvio) {
    const sacId = Number(row['SAC'] ?? row['Nº SAC'] ?? row['N SAC'] ?? 0)
    if (!sacId || !byId.has(sacId)) continue
    const rec = byId.get(sacId)!
    rec.custoEnvio = Number(row['Custo'] ?? row['CUSTO'] ?? row['Custo de Envio'] ?? row['Valor'] ?? 0)
  }

  for (const row of rowsColeta) {
    const sacId = Number(row['SAC'] ?? row['Nº SAC'] ?? row['N SAC'] ?? 0)
    if (!sacId || !byId.has(sacId)) continue
    const rec = byId.get(sacId)!
    rec.custoColeta = Number(row['Custo'] ?? row['CUSTO'] ?? row['Custo de Coleta'] ?? row['Valor'] ?? 0)
  }

  return [...byId.values()].map(r => ({
    ...r,
    custoTotal: r.custoProduto + r.custoEnvio + r.custoColeta,
  }))
}

// Returns the list of sheet names found in the file (for debugging on first import)
export async function getSheetNames(file: File): Promise<string[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames
}
