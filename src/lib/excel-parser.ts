'use client'

import type { SacRecord } from '@/types/sac'

export interface ParseDebug {
  sheets: string[]
  colsProd:    string[]
  colsEnvio:   string[]
  colsColeta:  string[]
  sacColProd:    string
  sacColEnvio:   string
  sacColColeta:  string
  custoColProd:  string
  custoColEnvio: string
  custoColColeta: string
  tipoColProd:   string
  dateColEnvio:  string
  totals: { prod: number; envio: number; coleta: number }
}

export interface ParseResult {
  records: SacRecord[]
  debug: ParseDebug
}

// ─── Helpers de detecção de coluna ────────────────────────────────────────────

function findKey(obj: Record<string, unknown>, candidates: string[]): string | undefined {
  const keys = Object.keys(obj)
  for (const c of candidates) {
    const cu = c.toUpperCase().trim()
    const found = keys.find(k => k.toUpperCase().trim() === cu)
    if (found !== undefined) return found
  }
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

// ─── Converter mês absoluto → relativo ao trimestre ──────────────────────────

function mesRelativo(absMonth: number, trimestreAno: string): number {
  const q = parseInt(trimestreAno[0], 10)   // 1, 2, 3 ou 4
  const startMonth = (q - 1) * 3 + 1        // 1, 4, 7 ou 10
  const rel = absMonth - startMonth + 1
  return rel >= 1 && rel <= 3 ? rel : 1
}

// ─── Parser principal ─────────────────────────────────────────────────────────

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

  // Detectar colunas reais
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

  const fabCol     = findKey(firstProd, FAB_CANDIDATES)      ?? ''
  const produtoCol = findKey(firstProd, PRODUTO_CANDIDATES)  ?? ''
  const dateColEnvio = findKey(firstEnvio, DATE_CANDIDATES)  ?? ''

  // ── Custo de Produtos: SOMAR por SAC (um SAC pode ter vários produtos) ──────
  const byId = new Map<number, SacRecord>()

  for (const row of rowsProd) {
    const sacId = Number(sacColProd ? row[sacColProd] : 0)
    if (!sacId) continue

    const custo = Number(custoColProd ? row[custoColProd] : 0)
    const fab   = String(fabCol     ? (row[fabCol]     ?? '') : '')
    const prod  = String(produtoCol ? (row[produtoCol] ?? '') : '')

    if (byId.has(sacId)) {
      // Acumula custo — mantém fabricante/tipo da primeira ocorrência
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
        mes:          1, // será atualizado pelo sheet de envio/coleta
      })
    }
  }

  // ── Custo de Envio: SOMAR por SAC (pode haver múltiplas NFs por SAC) ────────
  for (const row of rowsEnvio) {
    const sacId = Number(sacColEnvio ? row[sacColEnvio] : 0)
    if (!sacId || !byId.has(sacId)) continue
    const rec = byId.get(sacId)!
    rec.custoEnvio += Number(custoColEnvio ? (row[custoColEnvio] ?? 0) : 0)

    // Derivar mês do trimestre a partir da data de faturamento
    if (dateColEnvio && rec.mes === 1) {
      const raw = row[dateColEnvio]
      const d = raw instanceof Date ? raw : (typeof raw === 'string' || typeof raw === 'number' ? new Date(raw) : null)
      if (d && !isNaN(d.getTime())) {
        rec.mes = mesRelativo(d.getMonth() + 1, trimestreAno)
      }
    }
  }

  // ── Custo de Coleta: SOMAR por SAC ──────────────────────────────────────────
  for (const row of rowsColeta) {
    const sacId = Number(sacColColeta ? row[sacColColeta] : 0)
    if (!sacId || !byId.has(sacId)) continue
    byId.get(sacId)!.custoColeta += Number(custoColColeta ? (row[custoColColeta] ?? 0) : 0)
  }

  // ── Finalizar: calcular custoTotal ──────────────────────────────────────────
  const records = [...byId.values()].map(r => ({
    ...r,
    custoTotal: r.custoProduto + r.custoEnvio + r.custoColeta,
  }))

  const totals = records.reduce(
    (acc, r) => ({ prod: acc.prod + r.custoProduto, envio: acc.envio + r.custoEnvio, coleta: acc.coleta + r.custoColeta }),
    { prod: 0, envio: 0, coleta: 0 }
  )

  return {
    records,
    debug: {
      sheets:       sheetNames,
      colsProd:     Object.keys(firstProd),
      colsEnvio:    Object.keys(firstEnvio),
      colsColeta:   Object.keys(firstColeta),
      sacColProd, sacColEnvio, sacColColeta,
      custoColProd, custoColEnvio, custoColColeta,
      tipoColProd:  produtoCol,
      dateColEnvio,
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
