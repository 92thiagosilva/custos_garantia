'use client'

import { fmt, fmts, fmtPct } from '@/lib/formatters'

interface Props {
  total: number
  sacs: number
  custoProduto: number
  custoEnvio: number
  custoColeta: number
  totalSacs: number
}

export default function KpiRow({ total, sacs, custoProduto, custoEnvio, custoColeta, totalSacs }: Props) {
  const mediaSac = sacs > 0 ? total / sacs : 0
  const pctLogistico = total > 0 ? ((custoEnvio + custoColeta) / total) * 100 : 0

  const cards = [
    {
      label: 'Custo Total',
      value: fmts(total),
      sub: 'Produto + Envio + Coleta',
      accent: '#F5C400',
    },
    {
      label: 'SACs Filtrados',
      value: sacs.toLocaleString('pt-BR'),
      sub: sacs === totalSacs ? `total de SACs` : `de ${totalSacs} SACs`,
      accent: '#1E3A5F',
    },
    {
      label: 'Custo Médio / SAC',
      value: fmt(mediaSac),
      sub: 'Custo total por atendimento',
      accent: '#1D9E75',
    },
    {
      label: '% Logístico',
      value: fmtPct(pctLogistico),
      sub: `${fmts(custoEnvio + custoColeta)} em envio e coleta`,
      accent: '#E24B4A',
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map(card => (
        <div key={card.label} className="relative bg-surface border border-border rounded-xl px-4 py-3.5 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: card.accent }} />
          <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-1.5">{card.label}</p>
          <p className="font-mono text-xl font-semibold text-foreground leading-none">{card.value}</p>
          <p className="text-[10px] text-dim mt-1">{card.sub}</p>
        </div>
      ))}
    </div>
  )
}
