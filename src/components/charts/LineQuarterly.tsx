'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { AggByTrimestre } from '@/types/sac'
import { fmt } from '@/lib/formatters'

const toK = (v: number) => `R$${(v / 1000).toFixed(0)}K`

interface Props {
  data: AggByTrimestre[]
  showProduto: boolean
  showEnvio: boolean
  showColeta: boolean
}

export default function LineQuarterly({ data, showProduto, showEnvio, showColeta }: Props) {
  const chartData = data.map(d => ({
    name:    d.trimestreAno,
    Produto: showProduto ? d.custoProduto : undefined,
    Envio:   showEnvio   ? d.custoEnvio   : undefined,
    Coleta:  showColeta  ? d.custoColeta  : undefined,
  }))

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-sm text-muted-foreground">
        Importe dados de mais de um trimestre para visualizar a evolução.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={chartData} margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#6b7280' }} />
        <YAxis tickFormatter={toK} tick={{ fontSize: 10, fill: '#6b7280' }} width={56} />
        <Tooltip
          formatter={(v, name) => [fmt(v as number), String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
        {showProduto && <Line type="monotone" dataKey="Produto" stroke="#1D9E75" dot={{ r: 5 }} strokeWidth={2.5} connectNulls />}
        {showEnvio   && <Line type="monotone" dataKey="Envio"   stroke="#1E3A5F" dot={{ r: 5 }} strokeWidth={2.5} connectNulls />}
        {showColeta  && <Line type="monotone" dataKey="Coleta"  stroke="#F5C400" dot={{ r: 5 }} strokeWidth={2.5} connectNulls />}
      </LineChart>
    </ResponsiveContainer>
  )
}
