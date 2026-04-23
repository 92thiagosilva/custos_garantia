'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { fmt } from '@/lib/formatters'

interface Props {
  custoProduto: number
  custoEnvio: number
  custoColeta: number
}

const COLORS = ['#1E3A5F', '#F5C400', '#378ADD']
const LABELS = ['Produto', 'Envio', 'Coleta']

export default function DonutDistribuicao({ custoProduto, custoEnvio, custoColeta }: Props) {
  const total = custoProduto + custoEnvio + custoColeta
  const data = [
    { name: 'Produto', value: custoProduto },
    { name: 'Envio',   value: custoEnvio   },
    { name: 'Coleta',  value: custoColeta  },
  ].filter(d => d.value > 0)

  return (
    <div className="flex flex-col gap-3">
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={56}
            outerRadius={80}
            dataKey="value"
            paddingAngle={2}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip
            formatter={(v, name) => [
              `${fmt(v as number)} (${total > 0 ? (((v as number) / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1.5 px-2">
        {LABELS.map((label, i) => {
          const val = [custoProduto, custoEnvio, custoColeta][i]
          const pct = total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'
          return (
            <div key={label} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: COLORS[i] }} />
                <span className="text-muted-foreground">{label}</span>
              </div>
              <span className="font-mono font-medium text-foreground">{pct}%</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
