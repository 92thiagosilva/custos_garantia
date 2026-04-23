import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import ExcelJS from 'exceljs'

// ─── Estilos ─────────────────────────────────────────────────────────────────

const BLUE   = '1E3A5F'
const YELLOW = 'F5C400'
const TEAL   = '1D9E75'
const WHITE  = 'FFFFFFFF'
const ALT    = 'FFE8EEF6'

const HDR_BLUE: ExcelJS.Fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + BLUE } }
const HDR_TEAL: ExcelJS.Fill   = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + TEAL } }
const ROW_ALT: ExcelJS.Fill    = { type: 'pattern', pattern: 'solid', fgColor: { argb: ALT } }
const TOTAL_FILL: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + YELLOW } }

const FONT_HDR  = (): Partial<ExcelJS.Font> => ({ color: { argb: WHITE }, bold: true, size: 10 })
const FONT_MONO = (bold = false): Partial<ExcelJS.Font> => ({ name: 'Consolas', size: 10, bold })
const BRL = '"R$"#,##0.00'
const PCT = '0.0%'

const BORDER_THIN: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: 'FFD1D5DB' } },
  bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
  left:   { style: 'thin', color: { argb: 'FFD1D5DB' } },
  right:  { style: 'thin', color: { argb: 'FFD1D5DB' } },
}

const MESES_LABEL: Record<number, string> = {
  1:'Janeiro', 2:'Fevereiro', 3:'Março', 4:'Abril',
  5:'Maio', 6:'Junho', 7:'Julho', 8:'Agosto',
  9:'Setembro', 10:'Outubro', 11:'Novembro', 12:'Dezembro',
}

function styleHeader(row: ExcelJS.Row, fill: ExcelJS.Fill) {
  row.eachCell(cell => {
    cell.fill      = fill
    cell.font      = FONT_HDR()
    cell.border    = BORDER_THIN
    cell.alignment = { vertical: 'middle', horizontal: 'center' }
  })
  row.height = 20
}

function styleDataRow(row: ExcelJS.Row, currCols: string[], pctCols: string[], isAlt: boolean, isBold = false) {
  row.eachCell(cell => {
    if (isAlt) cell.fill = ROW_ALT
    cell.border    = BORDER_THIN
    cell.alignment = { vertical: 'middle' }
    if (isBold) cell.font = { bold: true, size: 10 }
  })
  currCols.forEach(col => {
    const c = row.getCell(col)
    c.numFmt    = BRL
    c.font      = FONT_MONO(isBold)
    c.alignment = { horizontal: 'right', vertical: 'middle' }
  })
  pctCols.forEach(col => {
    const c = row.getCell(col)
    c.numFmt    = PCT
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  row.height = 17
}

function styleTotalRow(row: ExcelJS.Row, currCols: string[], pctCols: string[]) {
  row.eachCell(cell => {
    cell.fill   = TOTAL_FILL
    cell.border = BORDER_THIN
    cell.font   = { bold: true, size: 10, color: { argb: 'FF' + BLUE } }
  })
  currCols.forEach(col => {
    const c = row.getCell(col)
    c.numFmt    = BRL
    c.font      = FONT_MONO(true)
    c.alignment = { horizontal: 'right', vertical: 'middle' }
    c.font      = { ...FONT_MONO(true), color: { argb: 'FF' + BLUE } }
  })
  pctCols.forEach(col => {
    const c = row.getCell(col)
    c.numFmt    = PCT
    c.alignment = { horizontal: 'center', vertical: 'middle' }
  })
  row.height = 20
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const trimestres  = searchParams.get('trimestre')?.split(',').filter(Boolean) ?? []
  const fabricantes = searchParams.get('fabricante')?.split(',').filter(Boolean) ?? []
  const tipos       = searchParams.get('tipo')?.split(',').filter(Boolean)       ?? []
  const meses       = searchParams.get('mes')?.split(',').map(Number).filter(Boolean) ?? []

  const records = await prisma.sacRecord.findMany({
    where: {
      ...(trimestres.length  && { trimestreAno: { in: trimestres } }),
      ...(fabricantes.length && { fabricante:   { in: fabricantes } }),
      ...(tipos.length       && { tipo:         { in: tipos } }),
      ...(meses.length       && { mes:          { in: meses } }),
    },
    orderBy: [{ trimestreAno: 'asc' }, { fabricante: 'asc' }, { sacId: 'asc' }],
  })

  // Totais globais
  let totalProd = 0, totalEnvio = 0, totalColeta = 0, totalGeral = 0
  for (const r of records) {
    totalProd   += Number(r.custoProduto)
    totalEnvio  += Number(r.custoEnvio)
    totalColeta += Number(r.custoColeta)
    totalGeral  += Number(r.custoTotal)
  }

  const wb = new ExcelJS.Workbook()
  wb.creator  = 'Fotus Distribuidora Solar'
  wb.created  = new Date()
  wb.modified = new Date()

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 1 — Detalhamento de SACs
  // ══════════════════════════════════════════════════════════════════════════
  const wsSac = wb.addWorksheet('Detalhamento SACs', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  wsSac.columns = [
    { key: 'trimestre',    width: 11 },
    { key: 'sac',          width: 10 },
    { key: 'fabricante',   width: 22 },
    { key: 'tipo',         width: 13 },
    { key: 'mes',          width: 14 },
    { key: 'custoProduto', width: 18 },
    { key: 'custoEnvio',   width: 16 },
    { key: 'custoColeta',  width: 16 },
    { key: 'custoTotal',   width: 16 },
  ]

  // Título
  wsSac.addRow(['Relatório de Custos de Garantia — Fotus Distribuidora Solar'])
  wsSac.mergeCells('A1:I1')
  const t1 = wsSac.getRow(1)
  t1.getCell('A').font      = { bold: true, size: 13, color: { argb: 'FF' + BLUE } }
  t1.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' }
  t1.height = 28

  // Cabeçalho
  const sacHdr = wsSac.addRow(['Trimestre', 'SAC', 'Fabricante', 'Tipo', 'Mês', 'Custo Produto', 'Frete Envio', 'Frete Coleta', 'Custo Total'])
  styleHeader(sacHdr, HDR_TEAL)

  // Dados
  records.forEach((r, idx) => {
    const row = wsSac.addRow([
      r.trimestreAno,
      r.sacId,
      r.fabricante,
      r.tipo,
      MESES_LABEL[r.mes] ?? `Mês ${r.mes}`,
      Number(r.custoProduto),
      Number(r.custoEnvio),
      Number(r.custoColeta),
      Number(r.custoTotal),
    ])
    styleDataRow(row, ['F', 'G', 'H', 'I'], [], idx % 2 === 1)
    row.getCell('A').alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell('B').font      = FONT_MONO()
    row.getCell('D').alignment = { horizontal: 'center', vertical: 'middle' }
    row.getCell('E').alignment = { horizontal: 'center', vertical: 'middle' }
  })

  // Linha de total
  const sacTotRow = wsSac.addRow(['', `${records.length} SACs`, '', '', 'TOTAL GERAL', totalProd, totalEnvio, totalColeta, totalGeral])
  styleTotalRow(sacTotRow, ['F', 'G', 'H', 'I'], [])
  sacTotRow.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' }
  sacTotRow.getCell('E').alignment = { horizontal: 'center', vertical: 'middle' }

  wsSac.autoFilter = { from: 'A2', to: 'I2' }

  // ══════════════════════════════════════════════════════════════════════════
  // ABA 2 — Resumo por Fabricante
  // ══════════════════════════════════════════════════════════════════════════
  const wsFab = wb.addWorksheet('Resumo por Fabricante', {
    views: [{ state: 'frozen', ySplit: 2 }],
  })

  wsFab.columns = [
    { key: 'fabricante',   width: 22 },
    { key: 'tipo',         width: 14 },
    { key: 'sacs',         width: 8 },
    { key: 'custoProduto', width: 18 },
    { key: 'custoEnvio',   width: 16 },
    { key: 'custoColeta',  width: 16 },
    { key: 'custoTotal',   width: 16 },
    { key: 'pctLog',       width: 14 },
    { key: 'mediaSac',     width: 16 },
  ]

  wsFab.addRow(['Resumo por Fabricante'])
  wsFab.mergeCells('A1:I1')
  const t2 = wsFab.getRow(1)
  t2.getCell('A').font      = { bold: true, size: 13, color: { argb: 'FF' + BLUE } }
  t2.getCell('A').alignment = { horizontal: 'left', vertical: 'middle' }
  t2.height = 28

  const fabHdr = wsFab.addRow(['Fabricante', 'Tipo(s)', 'SACs', 'Custo Produto', 'Frete Envio', 'Frete Coleta', 'Custo Total', '% Logístico', 'Média/SAC'])
  styleHeader(fabHdr, HDR_BLUE)

  const fabMap = new Map<string, { tipos: Set<string>; sacs: number; prod: number; envio: number; col: number }>()
  for (const r of records) {
    if (!fabMap.has(r.fabricante)) fabMap.set(r.fabricante, { tipos: new Set(), sacs: 0, prod: 0, envio: 0, col: 0 })
    const e = fabMap.get(r.fabricante)!
    e.tipos.add(r.tipo)
    e.sacs++
    e.prod  += Number(r.custoProduto)
    e.envio += Number(r.custoEnvio)
    e.col   += Number(r.custoColeta)
  }

  const sorted = [...fabMap.entries()].sort((a, b) => (b[1].prod + b[1].envio + b[1].col) - (a[1].prod + a[1].envio + a[1].col))

  sorted.forEach(([fabricante, e], idx) => {
    const total = e.prod + e.envio + e.col
    const row = wsFab.addRow([
      fabricante,
      [...e.tipos].join(', '),
      e.sacs,
      e.prod,
      e.envio,
      e.col,
      total,
      total > 0 ? (e.envio + e.col) / total : 0,
      e.sacs > 0 ? total / e.sacs : 0,
    ])
    styleDataRow(row, ['D', 'E', 'F', 'G', 'I'], ['H'], idx % 2 === 1)
    row.getCell('C').alignment = { horizontal: 'center', vertical: 'middle' }
  })

  const fabTotRow = wsFab.addRow([
    `${sorted.length} fabricantes`, '', records.length,
    totalProd, totalEnvio, totalColeta, totalGeral,
    totalGeral > 0 ? (totalEnvio + totalColeta) / totalGeral : 0,
    records.length > 0 ? totalGeral / records.length : 0,
  ])
  styleTotalRow(fabTotRow, ['D', 'E', 'F', 'G', 'I'], ['H'])
  fabTotRow.getCell('C').alignment = { horizontal: 'center', vertical: 'middle' }

  wsFab.autoFilter = { from: 'A2', to: 'I2' }

  // ─── Output ───────────────────────────────────────────────────────────────
  const buffer   = await wb.xlsx.writeBuffer()
  const trimLabel = trimestres.join('-') || 'todos'
  const dateStr   = new Date().toISOString().slice(0, 10)

  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="garantia-fotus-${trimLabel}-${dateStr}.xlsx"`,
    },
  })
}
