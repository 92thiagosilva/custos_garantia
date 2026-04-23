'use client'

import React from 'react'
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
      label:    'Custo de Produto',
      value:    fmts(custoProduto),
      sub:      `${sacs} SACs · R$${sacs > 0 ? Math.round(custoProduto / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct:      total > 0 ? Math.round((custoProduto / total) * 100) + '%' : '—',
      style:    { background: '#1E3A5F', color: 'white' } as React.CSSProperties,
      pctColor: 'rgba(255,255,255,0.35)',
    },
    {
      label:    'Frete de Envio',
      value:    fmts(custoEnvio),
      sub:      `${pctEnvio}% do total · R$${sacs > 0 ? Math.round(custoEnvio / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct:      pctEnvio + '%',
      style:    { background: '#F5C400', color: '#1E3A5F' } as React.CSSProperties,
      pctColor: 'rgba(30,58,95,0.30)',
    },
    {
      label:    'Frete de Coleta',
      value:    fmts(custoColeta),
      sub:      `${pctColeta}% do total · R$${sacs > 0 ? Math.round(custoColeta / sacs).toLocaleString('pt-BR') : 0}/SAC`,
      pct:      pctColeta + '%',
      style:    { background: '#378ADD', color: 'white' } as React.CSSProperties,
      pctColor: 'rgba(255,255,255,0.35)',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
      {cards.map(card => (
        <div key={card.label} className="relative rounded-xl px-5 py-4 overflow-hidden" style={card.style}>
          <p className="text-[10px] font-semibold uppercase tracking-wider opacity-60">{card.label}</p>
          <p className="font-mono text-[28px] font-bold leading-none mt-1.5 tracking-tight">{card.value}</p>
          <p className="text-[11px] opacity-55 mt-1.5">{card.sub}</p>
          <span
            className="absolute top-3 right-5 font-mono text-[28px] font-black leading-none"
            style={{ color: card.pctColor }}
          >
            {card.pct}
          </span>
        </div>
      ))}
    </div>
  )
}
