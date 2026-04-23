'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { SacRecord } from '@/types/sac'
import { fmt } from '@/lib/formatters'

const MESES: Record<number, string> = { 1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez' }
const toK = (v: number) => `R$${(v / 1000).toFixed(0)}K`

interface Props {
  records: SacRecord[]
  showProduto: boolean
  showEnvio: boolean
  showColeta: boolean
}

export default function LineMensal({ records, showProduto, showEnvio, showColeta }: Props) {
  const byMes = new Map<number, { prod: number; envio: number; col: number }>()
  for (const r of records) {
    if (!byMes.has(r.mes)) byMes.set(r.mes, { prod: 0, envio: 0, col: 0 })
    const e = byMes.get(r.mes)!
    e.prod  += r.custoProduto
    e.envio += r.custoEnvio
    e.col   += r.custoColeta
  }

  const data = [...byMes.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([mes, e]) => ({
      name:    MESES[mes] ?? `Mês ${mes}`,
      Produto: showProduto ? e.prod  : undefined,
      Envio:   showEnvio   ? e.envio : undefined,
      Coleta:  showColeta  ? e.col   : undefined,
    }))

  return (
    <ResponsiveContainer width="100%" height={230}>
      <LineChart data={data} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis tickFormatter={toK} tick={{ fontSize: 10, fill: '#6b7280' }} width={52} />
        <Tooltip
          formatter={(v, name) => [fmt(v as number), String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {showProduto && <Line type="monotone" dataKey="Produto" stroke="#1D9E75" dot={{ r: 4 }} strokeWidth={2} connectNulls />}
        {showEnvio   && <Line type="monotone" dataKey="Envio"   stroke="#1E3A5F" dot={{ r: 4 }} strokeWidth={2} connectNulls />}
        {showColeta  && <Line type="monotone" dataKey="Coleta"  stroke="#F5C400" dot={{ r: 4 }} strokeWidth={2} connectNulls />}
      </LineChart>
    </ResponsiveContainer>
  )
}
