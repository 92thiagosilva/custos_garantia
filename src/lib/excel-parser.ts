'use client'

import type { SacRecord } from '@/types/sac'

export interface ParseDebug {
  sheets:         string[]
  colsProd:       string[]
  colsEnvio:      string[]
  colsColeta:     string[]
  sacColProd:     string
  sacColEnvio:    string
  sacColColeta:   string
  custoColProd:   string
  custoColEnvio:  string
  custoColColeta: string
  tipoColProd:    string
  dateColEnvio:   string
  dateColColeta:  string
  fabColEnvio:    string
  fabColColeta:   string
  allMonths:      number[]
  totals: { prod: number; envio: number; coleta: number }
}

export interface ParseResult {
  records:   SacRecord[]
  debug:     ParseDebug
  allMonths: number[]   // todos os meses encontrados (incluindo fora do trimestre)
}

// ─── Helpers de detecção de coluna ────────────────────────────────────────────

function findKey(obj: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(obj)
  // Exact match first
  for (const c of candidates) {
    const cu = c.toUpperCase().trim()
    const found = keys.find(k => k.toUpperCase().trim() === cu)
    if (found !== undefined) return found
  }
  // Substring match
  for (const c of candidates) {
    const cu = c.toUpperCase().trim()
    const found = keys.find(k => {
      const ku = k.toUpperCase().trim()
      return ku.includes(cu) || cu.includes(ku)
    })
    if (found !== undefined) return found
  }
  return undefined
}

function findCostKeyword(obj: Record<string, unknown>, keywords: string[]): string | undefined {
  return Object.keys(obj).find(k => {
    const ku = k.toUpperCase()
    return keywords.some(kw => ku.includes(kw.toUpperCase()))
  })
}

function findFirstNumericCol(obj: Record<string, unknown>, ...excludeKeys: string[]): string | undefined {
  return Object.keys(obj).find(k => !excludeKeys.includes(k) && typeof obj[k] === 'number')
}

// ─── Candidatos de nome de coluna ────────────────────────────────────────────

const SAC_CANDIDATES    = ['SAC', 'Nº SAC', 'N° SAC', 'N SAC', 'N.SAC', 'NUMERO SAC', 'OS', 'ID']
const FAB_CANDIDATES    = ['Fabricante', 'FABRICANTE', 'Marca', 'MARCA']
const PRODUTO_CANDIDATES = ['Produto', 'PRODUTO', 'Descrição', 'DESCRICAO', 'Descrição do Produto', 'Item']
const CUSTO_PROD_CANDIDATES = [
  'Custo do Produto', 'Custo Produto', 'CUSTO PRODUTO', 'CUSTO DO PRODUTO',
  'Custo de Produto', 'Custo', 'CUSTO', 'Valor', 'VALOR', 'Total',
]
const CUSTO_FRETE_CANDIDATES = [
  'Valor_Frete', 'Valor Frete', 'VALOR_FRETE', 'VALOR FRETE',
  'Custo de Envio', 'Custo Envio', 'Custo de Coleta', 'Custo Coleta',
  'Frete', 'FRETE', 'Custo', 'CUSTO', 'Valor', 'VALOR',
]
const DATE_CANDIDATES = [
  'Data do Faturamento', 'Data Faturamento', 'Data', 'DATA',
  'Data de Envio', 'Data de Coleta', 'Data do SAC',
]

const SHEET_PROD_NAMES   = ['Custo de Produtos', 'Custo Produtos', 'Produtos', 'Custo de Produto']
const SHEET_ENVIO_NAMES  = ['Custo de Envio', 'Custo Envio', 'Envio', 'Frete de Envio']
const SHEET_COLETA_NAMES = ['Custo de Coleta', 'Custo Coleta', 'Coleta', 'Frete de Coleta']

// ─── Derivar tipo do nome do produto ─────────────────────────────────────────

function deriveTipo(produto: string): string {
  const up = produto.toUpperCase()
  if (up.includes('INVERSOR') || up.includes('INVERTER')) return 'Inversor'
  if (
    up.includes('MODULO') || up.includes('MÓDULO') ||
    up.includes('PAINEL') || up.includes('MODULE') ||
    up.includes('PANEL')  || up.includes('SOLAR PANEL')
  ) return 'Módulo'
  if (
    up.includes('BATERIA') || up.includes('BATTERY') ||
    up.includes('BESS')    || up.includes('STORAGE') ||
    up.includes('ACUMULAD')
  ) return 'Bateria'
  return 'Outros'
}

// ─── Calcular meses do trimestre (meses absolutos) ───────────────────────────

function getQuarterMonths(trimestreAno: string): number[] {
  const q = parseInt(trimestreAno[0], 10)   // 1..4
  const start = (q - 1) * 3 + 1             // 1, 4, 7, 10
  return [start, start + 1, start + 2]
}

// ─── Extrair mês absoluto de um valor de data ────────────────────────────────

function extractMonth(raw: unknown): number | null {
  if (raw instanceof Date) {
    if (!isNaN(raw.getTime())) return raw.getMonth() + 1
  }
  if (typeof raw === 'string' && raw.trim()) {
    const d = new Date(raw)
    if (!isNaN(d.getTime())) return d.getMonth() + 1
  }
  if (typeof raw === 'number' && raw > 0) {
    // Excel serial date
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d.getMonth() + 1
  }
  return null
}

// ─── Parser principal ─────────────────────────────────────────────────────────
//
// Metodologia (idêntica à aba TOTAIS da planilha):
//   1. Custo de Produtos → acumula custoProduto por SAC (vários produtos por SAC)
//   2. Custo de Envio / Coleta → agrega por coluna Fabricante da própria aba,
//      filtrado aos meses do trimestre (Jan-Mar para 1T26)
//   3. Distribui frete proporcionalmente ao custoProduto de cada SAC do fabricante
//
export async function parseGarantiaXlsx(file: File, trimestreAno: string): Promise<ParseResult> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })

  const sheetNames = wb.SheetNames

  const findSheet = (candidates: string[]): string | undefined => {
    for (const c of candidates) {
      const found = sheetNames.find(s => s.toUpperCase().trim() === c.toUpperCase().trim())
      if (found) return found
    }
    for (const c of candidates) {
      const cu = c.toUpperCase()
      const found = sheetNames.find(s => s.toUpperCase().includes(cu) || cu.includes(s.toUpperCase().trim()))
      if (found) return found
    }
    return undefined
  }

  const toJson = (name: string | undefined): Record<string, unknown>[] => {
    if (!name) return []
    const sheet = wb.Sheets[name]
    if (!sheet) return []
    return XLSX.utils.sheet_to_json(sheet, { defval: 0 }) as Record<string, unknown>[]
  }

  const sheetProdName   = findSheet(SHEET_PROD_NAMES)
  const sheetEnvioName  = findSheet(SHEET_ENVIO_NAMES)
  const sheetColetaName = findSheet(SHEET_COLETA_NAMES)

  const rowsProd   = toJson(sheetProdName)
  const rowsEnvio  = toJson(sheetEnvioName)
  const rowsColeta = toJson(sheetColetaName)

  const firstProd   = rowsProd[0]   ?? {}
  const firstEnvio  = rowsEnvio[0]  ?? {}
  const firstColeta = rowsColeta[0] ?? {}

  // ── Detectar colunas ────────────────────────────────────────────────────────
  const sacColProd   = findKey(firstProd,   SAC_CANDIDATES) ?? ''
  const sacColEnvio  = findKey(firstEnvio,  SAC_CANDIDATES) ?? ''
  const sacColColeta = findKey(firstColeta, SAC_CANDIDATES) ?? ''

  const custoColProd = findKey(firstProd, CUSTO_PROD_CANDIDATES)
    ?? findCostKeyword(firstProd, ['CUSTO', 'VALOR', 'TOTAL'])
    ?? findFirstNumericCol(firstProd, sacColProd)
    ?? ''

  const custoColEnvio = findKey(firstEnvio, CUSTO_FRETE_CANDIDATES)
    ?? findCostKeyword(firstEnvio, ['FRETE', 'CUSTO', 'VALOR', 'ENVIO'])
    ?? findFirstNumericCol(firstEnvio, sacColEnvio)
    ?? ''

  const custoColColeta = findKey(firstColeta, CUSTO_FRETE_CANDIDATES)
    ?? findCostKeyword(firstColeta, ['FRETE', 'CUSTO', 'VALOR', 'COLETA'])
    ?? findFirstNumericCol(firstColeta, sacColColeta)
    ?? ''

  const fabColProd    = findKey(firstProd,   FAB_CANDIDATES) ?? ''
  const produtoCol    = findKey(firstProd,   PRODUTO_CANDIDATES) ?? ''
  const fabColEnvio   = findKey(firstEnvio,  FAB_CANDIDATES) ?? ''
  const fabColColeta  = findKey(firstColeta, FAB_CANDIDATES) ?? ''
  const dateColEnvio  = findKey(firstEnvio,  DATE_CANDIDATES) ?? ''
  const dateColColeta = findKey(firstColeta, DATE_CANDIDATES) ?? ''

  const quarterMonths = getQuarterMonths(trimestreAno)

  // ── PASSO 1: Custo de Produtos → acumula por SAC ────────────────────────────
  const byId = new Map<number, SacRecord>()

  for (const row of rowsProd) {
    const sacId = Number(sacColProd ? row[sacColProd] : 0)
    if (!sacId) continue

    const custo = Number(custoColProd ? row[custoColProd] : 0)
    const fab   = String(fabColProd     ? (row[fabColProd]   ?? '') : '').trim()
    const prod  = String(produtoCol     ? (row[produtoCol]   ?? '') : '').trim()

    if (byId.has(sacId)) {
      byId.get(sacId)!.custoProduto += custo
    } else {
      byId.set(sacId, {
        trimestreAno,
        sacId,
        fabricante:   fab,
        tipo:         deriveTipo(prod),
        custoProduto: custo,
        custoEnvio:   0,
        custoColeta:  0,
        custoTotal:   0,
        mes:          quarterMonths[0],
      })
    }
  }

  // ── PASSO 2: fabProdTotals — soma custoProduto por Fabricante (de Produtos) ─
  const fabProdTotals = new Map<string, number>()
  for (const rec of byId.values()) {
    fabProdTotals.set(rec.fabricante, (fabProdTotals.get(rec.fabricante) ?? 0) + rec.custoProduto)
  }

  // ── PASSO 3: Custo de Envio — agrega por Fabricante da aba Envio ────────────
  //   Apenas linhas cujo SAC existe na aba Produtos (cross-ref)
  //   Apenas meses do trimestre para os totais (Apr fica no allMonths mas não entra no total)
  const fabEnvioTotals = new Map<string, number>()
  const sacToMonth     = new Map<number, number>()
  const allMonthsSet   = new Set<number>()

  for (const row of rowsEnvio) {
    const sacId = Number(sacColEnvio ? row[sacColEnvio] : 0)
    if (!sacId || !byId.has(sacId)) continue   // cross-ref: SAC deve existir em Produtos

    const custo    = Number(custoColEnvio ? (row[custoColEnvio] ?? 0) : 0)
    const fabEnvio = String(fabColEnvio   ? (row[fabColEnvio]   ?? '') : '').trim()
    const absMonth = extractMonth(dateColEnvio ? row[dateColEnvio] : null) ?? quarterMonths[0]

    allMonthsSet.add(absMonth)
    if (!sacToMonth.has(sacId)) sacToMonth.set(sacId, absMonth)

    if (quarterMonths.includes(absMonth)) {
      fabEnvioTotals.set(fabEnvio, (fabEnvioTotals.get(fabEnvio) ?? 0) + custo)
    }
  }

  // ── PASSO 4: Custo de Coleta — mesmo padrão ──────────────────────────────────
  const fabColetaTotals = new Map<string, number>()

  for (const row of rowsColeta) {
    const sacId = Number(sacColColeta ? row[sacColColeta] : 0)
    if (!sacId || !byId.has(sacId)) continue

    const custo      = Number(custoColColeta ? (row[custoColColeta] ?? 0) : 0)
    const fabColeta  = String(fabColColeta   ? (row[fabColColeta]   ?? '') : '').trim()
    const absMonth   = extractMonth(dateColColeta ? row[dateColColeta] : null) ?? quarterMonths[0]

    allMonthsSet.add(absMonth)
    if (!sacToMonth.has(sacId)) sacToMonth.set(sacId, absMonth)

    if (quarterMonths.includes(absMonth)) {
      fabColetaTotals.set(fabColeta, (fabColetaTotals.get(fabColeta) ?? 0) + custo)
    }
  }

  // ── PASSO 5: Distribuir frete proporcionalmente ao custoProduto do SAC ───────
  //   custoEnvio_SAC = (envioTotal_Fab / prodTotal_Fab) × custoProduto_SAC
  for (const [sacId, rec] of byId) {
    const fab       = rec.fabricante
    const prodTotal = fabProdTotals.get(fab) ?? 0

    if (prodTotal > 0) {
      rec.custoEnvio  = ((fabEnvioTotals.get(fab)  ?? 0) / prodTotal) * rec.custoProduto
      rec.custoColeta = ((fabColetaTotals.get(fab) ?? 0) / prodTotal) * rec.custoProduto
    }

    // Mês absoluto do SAC (derivado da data de faturamento do envio/coleta)
    rec.mes = sacToMonth.get(sacId) ?? quarterMonths[0]
  }

  // ── PASSO 6: Calcular custoTotal e montar resultado ──────────────────────────
  const records = [...byId.values()].map(r => ({
    ...r,
    custoTotal: r.custoProduto + r.custoEnvio + r.custoColeta,
  }))

  const totals = records.reduce(
    (acc, r) => ({
      prod:   acc.prod   + r.custoProduto,
      envio:  acc.envio  + r.custoEnvio,
      coleta: acc.coleta + r.custoColeta,
    }),
    { prod: 0, envio: 0, coleta: 0 },
  )

  const allMonths = [...allMonthsSet].sort((a, b) => a - b)

  return {
    records,
    allMonths,
    debug: {
      sheets:       sheetNames,
      colsProd:     Object.keys(firstProd),
      colsEnvio:    Object.keys(firstEnvio),
      colsColeta:   Object.keys(firstColeta),
      sacColProd, sacColEnvio, sacColColeta,
      custoColProd, custoColEnvio, custoColColeta,
      tipoColProd:  produtoCol,
      dateColEnvio, dateColColeta,
      fabColEnvio,  fabColColeta,
      allMonths,
      totals,
    },
  }
}

export async function getSheetNames(file: File): Promise<string[]> {
  const XLSX = await import('xlsx')
  const buffer = await file.arrayBuffer()
  const wb = XLSX.read(buffer, { type: 'array' })
  return wb.SheetNames
}
