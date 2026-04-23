'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer,
} from 'recharts'
import type { AggByFab } from '@/types/sac'
import { fmt } from '@/lib/formatters'

interface Props {
  data: AggByFab[]
  showProduto: boolean
  showEnvio: boolean
  showColeta: boolean
}

const toK = (v: number) => `R$${(v / 1000).toFixed(0)}K`

export default function BarFabricante({ data, showProduto, showEnvio, showColeta }: Props) {
  const chartData = data.map(d => ({
    name: d.fabricante,
    Produto: showProduto ? d.custoProduto : 0,
    Envio:   showEnvio   ? d.custoEnvio   : 0,
    Coleta:  showColeta  ? d.custoColeta  : 0,
  }))

  return (
    <ResponsiveContainer width="100%" height={Math.max(220, data.length * 44 + 60)}>
      <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(128,128,128,0.1)" horizontal={false} />
        <XAxis type="number" tickFormatter={toK} tick={{ fontSize: 10, fill: '#6b7280' }} />
        <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11, fill: '#374151' }} />
        <Tooltip
          formatter={(value, name) => [fmt(value as number), String(name)]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
        <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
        {showProduto && <Bar dataKey="Produto" stackId="a" fill="#1E3A5F" />}
        {showEnvio   && <Bar dataKey="Envio"   stackId="a" fill="#F5C400" />}
        {showColeta  && <Bar dataKey="Coleta"  stackId="a" fill="#378ADD" radius={[0, 3, 3, 0]} />}
      </BarChart>
    </ResponsiveContainer>
  )
}
