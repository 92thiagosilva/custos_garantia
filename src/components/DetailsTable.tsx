'use client'

import type { AggByFab } from '@/types/sac'
import { fmt } from '@/lib/formatters'

interface Props {
  data: AggByFab[]
  showProduto: boolean
  showEnvio: boolean
  showColeta: boolean
}

export default function DetailsTable({ data, showProduto, showEnvio, showColeta }: Props) {
  if (data.length === 0) {
    return <p className="py-10 text-center text-sm text-dim">Nenhum dado para os filtros selecionados.</p>
  }

  const totProd  = data.reduce((s, d) => s + d.custoProduto, 0)
  const totEnvio = data.reduce((s, d) => s + d.custoEnvio,   0)
  const totCol   = data.reduce((s, d) => s + d.custoColeta,  0)
  const totTotal = data.reduce((s, d) => s + d.custoTotal,   0)
  const totSacs  = data.reduce((s, d) => s + d.sacs, 0)

  const maxTotal = Math.max(...data.map(d => d.custoTotal), 1)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[580px] border-collapse">
        <thead>
          <tr>
            <th className="text-left py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Fabricante</th>
            <th className="text-left py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Tipo(s)</th>
            <th className="text-right py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">SACs</th>
            {showProduto && <th className="text-right py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Produto</th>}
            {showEnvio   && <th className="text-right py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Envio</th>}
            {showColeta  && <th className="text-right py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Coleta</th>}
            <th className="text-right py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]">Total</th>
            <th className="py-2 px-2.5 border-b border-border text-muted uppercase tracking-wider font-medium text-[10px]" style={{ width: 120 }}>%</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const pct = totTotal > 0 ? (row.custoTotal / totTotal) * 100 : 0
            return (
              <tr key={row.fabricante} className="hover:bg-surface2 transition-colors">
                <td className="py-2 px-2.5 border-b border-border font-medium text-foreground text-[12px]">{row.fabricante}</td>
                <td className="py-2 px-2.5 border-b border-border text-muted text-[11px]">{row.tipos.join(', ')}</td>
                <td className="py-2 px-2.5 border-b border-border text-right font-mono text-foreground">{row.sacs}</td>
                {showProduto && <td className="py-2 px-2.5 border-b border-border text-right font-mono font-medium text-fotus-blue">{fmt(row.custoProduto)}</td>}
                {showEnvio   && <td className="py-2 px-2.5 border-b border-border text-right font-mono font-medium text-amber-700">{fmt(row.custoEnvio)}</td>}
                {showColeta  && <td className="py-2 px-2.5 border-b border-border text-right font-mono font-medium text-sky-600">{fmt(row.custoColeta)}</td>}
                <td className="py-2 px-2.5 border-b border-border text-right font-mono font-bold text-foreground text-[12.5px]">{fmt(row.custoTotal)}</td>
                <td className="py-2 px-2.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[3px] bg-border rounded-full min-w-[30px]">
                      <div
                        className="h-full bg-fotus-blue rounded-full transition-all duration-500"
                        style={{ width: `${(row.custoTotal / maxTotal) * 100}%` }}
                      />
                    </div>
                    <span className="font-mono text-dim text-[10px] w-8 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface2">
            <td className="py-2 px-2.5 font-semibold text-foreground text-[12px]">Total</td>
            <td className="py-2 px-2.5" />
            <td className="py-2 px-2.5 text-right font-mono font-semibold">{totSacs}</td>
            {showProduto && <td className="py-2 px-2.5 text-right font-mono font-semibold text-fotus-blue">{fmt(totProd)}</td>}
            {showEnvio   && <td className="py-2 px-2.5 text-right font-mono font-semibold text-amber-700">{fmt(totEnvio)}</td>}
            {showColeta  && <td className="py-2 px-2.5 text-right font-mono font-semibold text-sky-600">{fmt(totCol)}</td>}
            <td className="py-2 px-2.5 text-right font-mono font-bold text-foreground">{fmt(totTotal)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
