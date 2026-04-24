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
  dateColProd:    string   // Data de Criação_x — fonte do mês do SAC
  fabColProd:     string
  allMonths:      number[]
  totals: { prod: number; envio: number; coleta: number }
}

export interface ParseResult {
  records:   SacRecord[]
  debug:     ParseDebug
  allMonths: number[]   // todos os meses encontrados na aba Produtos
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

const SAC_CANDIDATES = ['SAC', 'Nº SAC', 'N° SAC', 'N SAC', 'N.SAC', 'NUMERO SAC', 'OS', 'ID']
const FAB_CANDIDATES = ['Fabricante', 'FABRICANTE', 'Marca', 'MARCA']
const PRODUTO_CANDIDATES = ['Produto', 'PRODUTO', 'Descrição', 'DESCRICAO', 'Descrição do Produto', 'Item']

// Data de criação do SAC — inclui "_x" que vem de merge pandas
const DATE_PROD_CANDIDATES = [
  'Data de Criação_x', 'Data de Criação', 'Data Criação', 'Data do SAC',
  'Data', 'DATA', 'Criação', 'Abertura',
]

const CUSTO_PROD_CANDIDATES = [
  'Custo do Produto', 'Custo Produto', 'CUSTO PRODUTO', 'CUSTO DO PRODUTO',
  'Custo de Produto', 'Custo', 'CUSTO', 'Valor', 'VALOR', 'Total',
]
const CUSTO_FRETE_CANDIDATES = [
  'Valor_Frete', 'Valor Frete', 'VALOR_FRETE', 'VALOR FRETE',
  'Custo de Envio', 'Custo Envio', 'Custo de Coleta', 'Custo Coleta',
  'Frete', 'FRETE', 'Custo', 'CUSTO', 'Valor', 'VALOR',
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
    // Excel serial date (dias desde 1900-01-01)
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    if (!isNaN(d.getTime()) && d.getFullYear() > 1970) return d.getMonth() + 1
  }
  return null
}

// ─── Parser principal ─────────────────────────────────────────────────────────
//
// Metodologia:
//   1. Custo de Produtos → acumula custoProduto por SAC; mês vem de "Data de Criação_x"
//   2. Custo de Envio    → soma Valor_Frete por SAC (cross-ref direto pelo número de SAC)
//   3. Custo de Coleta   → idem
//   4. Cada SAC recebe seu frete exato (sem distribuição proporcional)
//   5. Datas de Envio/Coleta NÃO são usadas — só o SAC de Produtos define o mês
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
      const found = sheetNames.find(s =>
        s.toUpperCase().includes(cu) || cu.includes(s.toUpperCase().trim())
      )
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

  const fabColProd = findKey(firstProd, FAB_CANDIDATES) ?? ''
  const produtoCol = findKey(firstProd, PRODUTO_CANDIDATES) ?? ''

  // Coluna de data em Custo de Produtos — "Data de Criação_x"
  const dateColProd = findKey(firstProd, DATE_PROD_CANDIDATES) ?? ''

  const quarterMonths = getQuarterMonths(trimestreAno)

  // ── PASSO 1: Custo de Produtos → acumula por SAC ────────────────────────────
  // Mês do SAC vem de "Data de Criação_x" (col B).
  // Se não encontrado, usa o primeiro mês do trimestre como fallback.
  const byId = new Map<number, SacRecord>()

  for (const row of rowsProd) {
    const sacId = Number(sacColProd ? row[sacColProd] : 0)
    if (!sacId) continue

    const custo = Number(custoColProd ? row[custoColProd] : 0)
    const fab   = String(fabColProd ? (row[fabColProd] ?? '') : '').trim()
    const prod  = String(produtoCol ? (row[produtoCol] ?? '') : '').trim()

    // Mês vem da data de criação do SAC (coluna B — "Data de Criação_x")
    const mesFromDate = dateColProd
      ? extractMonth(row[dateColProd])
      : null
    const mes = mesFromDate ?? quarterMonths[0]

    if (byId.has(sacId)) {
      // Mesmo SAC pode ter vários produtos (múltiplas linhas) — acumula custo
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
        mes,
      })
    }
  }

  // ── PASSO 2: Custo de Envio → cross-ref direto por SAC ──────────────────────
  // Cada linha de Envio tem um número de SAC.
  // Somamos o Valor_Frete diretamente no SAC correspondente de Produtos.
  // As datas de Envio NÃO são usadas para nada.
  for (const row of rowsEnvio) {
    const sacId = Number(sacColEnvio ? row[sacColEnvio] : 0)
    if (!sacId) continue

    const rec = byId.get(sacId)
    if (!rec) continue   // SAC não existe em Produtos → ignorar

    const custo = Number(custoColEnvio ? (row[custoColEnvio] ?? 0) : 0)
    rec.custoEnvio += custo
  }

  // ── PASSO 3: Custo de Coleta → cross-ref direto por SAC ─────────────────────
  for (const row of rowsColeta) {
    const sacId = Number(sacColColeta ? row[sacColColeta] : 0)
    if (!sacId) continue

    const rec = byId.get(sacId)
    if (!rec) continue

    const custo = Number(custoColColeta ? (row[custoColColeta] ?? 0) : 0)
    rec.custoColeta += custo
  }

  // ── PASSO 4: Calcular custoTotal e montar resultado ──────────────────────────
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

  // allMonths = meses únicos encontrados na data de criação dos SACs
  const allMonthsSet = new Set<number>(records.map(r => r.mes))
  // Garante que os meses do trimestre sempre aparecem no filtro
  for (const m of quarterMonths) allMonthsSet.add(m)
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
      dateColProd,
      fabColProd,
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
