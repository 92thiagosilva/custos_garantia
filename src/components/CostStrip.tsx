'use client'

import { fmts } from '@/lib/formatters'

interface Props {
  custoProduto: number
  custoEnvio: number
  custoColeta: number
  sacs: number
  total: number
}

export default function CostStrip({ custoProduto, custoEnvio, custoColeta, sacs, total }: Props) {
  const pctEnvio  = total > 0 ? ((custoEnvio / total) * 100).toFixed(1) : '0.0'
  const pctColeta = total > 0 ? ((custoColeta / total) * 100).toFixed(1) : '0.0'

  const cards = [
    {
      label: 'Custo de Produto',
      value: fmts(custoProduto),
      sub: `${sacs} SACs · R$${sacs > 0 ? Math.round(custoProduto / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct: total > 0 ? Math.round((custoProduto / total) * 100) + '%' : '—',
      bg: 'bg-fotus-blue text-white',
    },
    {
      label: 'Frete de Envio',
      value: fmts(custoEnvio),
      sub: `${pctEnvio}% do total · R$${sacs > 0 ? Math.round(custoEnvio / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct: pctEnvio + '%',
      bg: 'bg-fotus-yellow text-fotus-blue',
    },
    {
      label: 'Frete de Coleta',
      value: fmts(custoColeta),
      sub: `${pctColeta}% do total · R$${sacs > 0 ? Math.round(custoColeta / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct: pctColeta + '%',
      bg: 'bg-fotus-sky text-white',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
      {cards.map(card => (
        <div key={card.label} className={`relative rounded-xl px-5 py-4 overflow-hidden ${card.bg}`}>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{card.label}</p>
          <p className="font-mono text-[28px] font-bold leading-none mt-1.5 tracking-tight">{card.value}</p>
          <p className="text-[11px] opacity-55 mt-1.5">{card.sub}</p>
          <span className="absolute top-4 right-5 font-mono text-[22px] font-bold opacity-10">{card.pct}</span>
        </div>
      ))}
    </div>
  )
}
