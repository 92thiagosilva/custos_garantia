import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import type { SacRecord } from '@/types/sac'

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
    orderBy: [{ trimestreAno: 'asc' }, { sacId: 'asc' }],
  })

  const serialized = records.map(r => ({
    ...r,
    custoProduto: Number(r.custoProduto),
    custoEnvio:   Number(r.custoEnvio),
    custoColeta:  Number(r.custoColeta),
    custoTotal:   Number(r.custoTotal),
  }))

  return Response.json(serialized)
}

export async function POST(request: NextRequest) {
  const body = await request.json() as { records: SacRecord[] }
  const { records } = body

  if (!Array.isArray(records) || records.length === 0) {
    return Response.json({ error: 'records array is required' }, { status: 400 })
  }

  const data = records.map(r => ({
    trimestreAno: r.trimestreAno,
    sacId:        r.sacId,
    fabricante:   r.fabricante,
    tipo:         r.tipo,
    custoProduto: r.custoProduto,
    custoEnvio:   r.custoEnvio,
    custoColeta:  r.custoColeta,
    custoTotal:   r.custoTotal,
    mes:          r.mes,
  }))

  // Apaga todos os registros dos trimestres presentes no import antes de reinserir.
  const trimestresNoImport = [...new Set(data.map(r => r.trimestreAno))]
  await prisma.sacRecord.deleteMany({
    where: { trimestreAno: { in: trimestresNoImport } },
  })

  const result = await prisma.sacRecord.createMany({ data })

  return Response.json({ inserted: result.count, replaced: trimestresNoImport })
}

// DELETE — apaga todos os registros (ou por trimestre se ?trimestre= fornecido)
export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const trimestreParam = searchParams.get('trimestre')
  const trimestres = trimestreParam ? trimestreParam.split(',').filter(Boolean) : []

  const result = await prisma.sacRecord.deleteMany({
    where: trimestres.length ? { trimestreAno: { in: trimestres } } : {},
  })

  return Response.json({ deleted: result.count })
}
