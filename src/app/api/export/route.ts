import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import ExcelJS from 'exceljs'

const HEADER_FILL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF1E3A5F' },
}
const HEADER_FONT: Partial<ExcelJS.Font> = { color: { argb: 'FFFFFFFF' }, bold: true }

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const trimestreParam = searchParams.get('trimestre')
  const fabricanteParam = searchParams.get('fabricante')
  const tipoParam = searchParams.get('tipo')

  const trimestres = trimestreParam ? trimestreParam.split(',').filter(Boolean) : []
  const fabricantes = fabricanteParam ? fabricanteParam.split(',').filter(Boolean) : []
  const tipos = tipoParam ? tipoParam.split(',').filter(Boolean) : []

  const records = await prisma.sacRecord.findMany({
    where: {
      ...(trimestres.length && { trimestreAno: { in: trimestres } }),
      ...(fabricantes.length && { fabricante: { in: fabricantes } }),
      ...(tipos.length && { tipo: { in: tipos } }),
    },
    orderBy: [{ trimestreAno: 'asc' }, { fabricante: 'asc' }, { sacId: 'asc' }],
  })

  const wb = new ExcelJS.Workbook()
  wb.creator = 'Fotus Distribuidora Solar'
  wb.created = new Date()

  // === Aba 1: Resumo por Fabricante ===
  const wsFab = wb.addWorksheet('Resumo por Fabricante')
  wsFab.columns = [
    { header: 'Fabricante',     key: 'fabricante',   width: 18 },
    { header: 'Tipo(s)',        key: 'tipos',        width: 20 },
    { header: 'SACs',           key: 'sacs',         width: 8 },
    { header: 'Custo Produto',  key: 'custoProduto', width: 18 },
    { header: 'Custo Envio',    key: 'custoEnvio',   width: 16 },
    { header: 'Custo Coleta',   key: 'custoColeta',  width: 16 },
    { header: 'Custo Total',    key: 'custoTotal',   width: 16 },
    { header: '% Logístico',    key: 'pctLog',       width: 14 },
  ]

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

  for (const [fabricante, e] of fabMap) {
    const total = e.prod + e.envio + e.col
    wsFab.addRow({
      fabricante,
      tipos:        [...e.tipos].join(', '),
      sacs:         e.sacs,
      custoProduto: e.prod,
      custoEnvio:   e.envio,
      custoColeta:  e.col,
      custoTotal:   total,
      pctLog:       total > 0 ? ((e.envio + e.col) / total) : 0,
    })
  }

  // Style header row
  const fabHeader = wsFab.getRow(1)
  fabHeader.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
  })

  // Format currency and percentage columns
  for (let i = 2; i <= wsFab.rowCount; i++) {
    const row = wsFab.getRow(i);
    ['D', 'E', 'F', 'G'].forEach(col => {
      row.getCell(col).numFmt = '"R$"#,##0.00'
    })
    row.getCell('H').numFmt = '0.0%'
  }

  // === Aba 2: Detalhamento SACs ===
  const wsSac = wb.addWorksheet('Detalhamento SACs')
  wsSac.columns = [
    { header: 'Trimestre',      key: 'trimestreAno', width: 12 },
    { header: 'SAC',            key: 'sacId',        width: 10 },
    { header: 'Fabricante',     key: 'fabricante',   width: 18 },
    { header: 'Tipo',           key: 'tipo',         width: 12 },
    { header: 'Mês',            key: 'mes',          width: 6  },
    { header: 'Custo Produto',  key: 'custoProduto', width: 18 },
    { header: 'Custo Envio',    key: 'custoEnvio',   width: 16 },
    { header: 'Custo Coleta',   key: 'custoColeta',  width: 16 },
    { header: 'Custo Total',    key: 'custoTotal',   width: 16 },
  ]

  for (const r of records) {
    wsSac.addRow({
      trimestreAno: r.trimestreAno,
      sacId:        r.sacId,
      fabricante:   r.fabricante,
      tipo:         r.tipo,
      mes:          r.mes,
      custoProduto: Number(r.custoProduto),
      custoEnvio:   Number(r.custoEnvio),
      custoColeta:  Number(r.custoColeta),
      custoTotal:   Number(r.custoTotal),
    })
  }

  const sacHeader = wsSac.getRow(1)
  sacHeader.eachCell(cell => {
    cell.fill = HEADER_FILL
    cell.font = HEADER_FONT
  })

  for (let i = 2; i <= wsSac.rowCount; i++) {
    const row = wsSac.getRow(i);
    ['F', 'G', 'H', 'I'].forEach(col => {
      row.getCell(col).numFmt = '"R$"#,##0.00'
    })
  }

  const buffer = await wb.xlsx.writeBuffer()

  const trimLabel = trimestres.join('-') || 'todos'
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="relatorio-garantia-${trimLabel}.xlsx"`,
    },
  })
}
