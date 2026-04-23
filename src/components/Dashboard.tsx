'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import type { SacRecord, FilterState, AggByFab, AggByTrimestre } from '@/types/sac'
import FilterSidebar from './FilterSidebar'
import KpiRow from './KpiRow'
import CostStrip from './CostStrip'
import DetailsTable from './DetailsTable'
import ExportButton from './ExportButton'
import UploadModal from './UploadModal'
import BarFabricante from './charts/BarFabricante'
import DonutDistribuicao from './charts/DonutDistribuicao'
import LineMensal from './charts/LineMensal'
import LineQuarterly from './charts/LineQuarterly'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <p className="text-[10px] uppercase tracking-wider text-muted font-medium mb-3">{title}</p>
      {children}
    </div>
  )
}

export default function Dashboard() {
  const [allRecords, setAllRecords] = useState<SacRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showUpload, setShowUpload] = useState(false)

  const [filters, setFilters] = useState<FilterState>({
    trimestres: [],
    fabricantes: [],
    tipos: [],
    meses: [],
    tiposCusto: { produto: true, envio: true, coleta: true },
  })

  const fetchRecords = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/records')
      const data: SacRecord[] = await res.json()
      setAllRecords(data)

      const trimestres = [...new Set(data.map(d => d.trimestreAno))].sort()
      const fabricantes = [...new Set(data.map(d => d.fabricante))].sort()
      const tipos       = [...new Set(data.map(d => d.tipo))].sort()
      const meses       = [...new Set(data.map(d => d.mes))].sort((a, b) => a - b)
      setFilters(prev => ({ ...prev, trimestres, fabricantes, tipos, meses }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchRecords() }, [fetchRecords])

  const allFabricantes = useMemo(() => [...new Set(allRecords.map(d => d.fabricante))].sort(), [allRecords])
  const allTipos       = useMemo(() => [...new Set(allRecords.map(d => d.tipo))].sort(), [allRecords])
  const allTrimestres  = useMemo(() => [...new Set(allRecords.map(d => d.trimestreAno))].sort(), [allRecords])
  const allMeses       = useMemo(() => [...new Set(allRecords.map(d => d.mes))].sort((a, b) => a - b), [allRecords])

  const filtered = useMemo(() => {
    return allRecords.filter(r =>
      filters.trimestres.includes(r.trimestreAno) &&
      filters.fabricantes.includes(r.fabricante) &&
      filters.tipos.includes(r.tipo) &&
      filters.meses.includes(r.mes)
    )
  }, [allRecords, filters])

  const aggByFab = useMemo((): AggByFab[] => {
    const m = new Map<string, AggByFab>()
    for (const r of filtered) {
      if (!m.has(r.fabricante)) {
        m.set(r.fabricante, { fabricante: r.fabricante, tipos: [], sacs: 0, custoProduto: 0, custoEnvio: 0, custoColeta: 0, custoTotal: 0 })
      }
      const e = m.get(r.fabricante)!
      if (!e.tipos.includes(r.tipo)) e.tipos.push(r.tipo)
      e.sacs++
      e.custoProduto += r.custoProduto
      e.custoEnvio   += r.custoEnvio
      e.custoColeta  += r.custoColeta
      e.custoTotal   += r.custoTotal
    }
    return [...m.values()].sort((a, b) => b.custoTotal - a.custoTotal)
  }, [filtered])

  const aggByTrimestre = useMemo((): AggByTrimestre[] => {
    const m = new Map<string, AggByTrimestre>()
    for (const r of allRecords) {
      if (!filters.fabricantes.includes(r.fabricante) || !filters.tipos.includes(r.tipo)) continue
      if (!m.has(r.trimestreAno)) {
        m.set(r.trimestreAno, { trimestreAno: r.trimestreAno, custoProduto: 0, custoEnvio: 0, custoColeta: 0, custoTotal: 0 })
      }
      const e = m.get(r.trimestreAno)!
      e.custoProduto += r.custoProduto
      e.custoEnvio   += r.custoEnvio
      e.custoColeta  += r.custoColeta
      e.custoTotal   += r.custoTotal
    }
    return [...m.values()].sort((a, b) => a.trimestreAno.localeCompare(b.trimestreAno))
  }, [allRecords, filters.fabricantes, filters.tipos])

  const totals = useMemo(() => ({
    prod:  filtered.reduce((s, r) => s + r.custoProduto, 0),
    envio: filtered.reduce((s, r) => s + r.custoEnvio,   0),
    col:   filtered.reduce((s, r) => s + r.custoColeta,  0),
    total: filtered.reduce((s, r) => s + r.custoTotal,   0),
  }), [filtered])

  const { tiposCusto } = filters

  const clearFilters = () => {
    setFilters(prev => ({
      ...prev,
      trimestres: allTrimestres,
      fabricantes: allFabricantes,
      tipos: allTipos,
      meses: allMeses,
      tiposCusto: { produto: true, envio: true, coleta: true },
    }))
  }

  if (loading) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }} className="text-muted text-sm">
        Carregando dados…
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>
      {/* Left sidebar */}
      <FilterSidebar
        allFabricantes={allFabricantes}
        allTipos={allTipos}
        allTrimestres={allTrimestres}
        allMeses={allMeses}
        fabricantes={filters.fabricantes}
        tipos={filters.tipos}
        trimestres={filters.trimestres}
        meses={filters.meses}
        tiposCusto={tiposCusto}
        onFabricante={v => setFilters(prev => ({ ...prev, fabricantes: v }))}
        onTipo={v       => setFilters(prev => ({ ...prev, tipos: v }))}
        onTrimestre={v  => setFilters(prev => ({ ...prev, trimestres: v }))}
        onMes={v        => setFilters(prev => ({ ...prev, meses: v }))}
        onTiposCusto={v => setFilters(prev => ({ ...prev, tiposCusto: v }))}
        onClear={clearFilters}
        filteredSacs={filtered.length}
        totalSacs={allRecords.length}
      />

      {/* Main scrollable content */}
      <div style={{ flex: 1, overflowY: 'auto' }} className="px-5 pb-10 pt-5 space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-dim">
            {allTrimestres.length > 0
              ? `${allTrimestres.join(', ')} · ${allRecords.length} SACs`
              : 'Nenhum dado importado'}
          </p>
          <div className="flex items-center gap-2">
            <ExportButton
              trimestres={filters.trimestres}
              fabricantes={filters.fabricantes.length === allFabricantes.length ? [] : filters.fabricantes}
              tipos={filters.tipos.length === allTipos.length ? [] : filters.tipos}
            />
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white hover:opacity-90 transition-all cursor-pointer"
              style={{ background: '#1E3A5F' }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 9V1M4 4l3-3 3 3M2 11h10" />
              </svg>
              Importar Planilha
            </button>
          </div>
        </div>

        {allRecords.length === 0 ? (
          <div className="bg-surface border border-dashed border-border rounded-xl p-16 text-center">
            <p className="text-muted text-sm mb-3">Nenhum dado importado ainda.</p>
            <button
              onClick={() => setShowUpload(true)}
              className="px-5 py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-all cursor-pointer"
              style={{ background: '#1E3A5F' }}
            >
              Importar primeira planilha
            </button>
          </div>
        ) : (
          <>
            <KpiRow
              total={totals.total}
              sacs={filtered.length}
              custoProduto={totals.prod}
              custoEnvio={totals.envio}
              custoColeta={totals.col}
              totalSacs={allRecords.length}
            />

            <CostStrip
              custoProduto={tiposCusto.produto ? totals.prod : 0}
              custoEnvio={tiposCusto.envio ? totals.envio : 0}
              custoColeta={tiposCusto.coleta ? totals.col : 0}
              sacs={filtered.length}
              total={totals.total}
            />

            <div className="grid grid-cols-1 lg:grid-cols-[58%_1fr] gap-3">
              <Card title="Custo Total por Fabricante">
                <BarFabricante
                  data={aggByFab}
                  showProduto={tiposCusto.produto}
                  showEnvio={tiposCusto.envio}
                  showColeta={tiposCusto.coleta}
                />
              </Card>
              <Card title="Distribuição de Custos">
                <DonutDistribuicao
                  custoProduto={tiposCusto.produto ? totals.prod : 0}
                  custoEnvio={tiposCusto.envio ? totals.envio : 0}
                  custoColeta={tiposCusto.coleta ? totals.col : 0}
                />
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <Card title={`Evolução Mensal — ${filters.trimestres.join(', ') || 'todos'}`}>
                <LineMensal
                  records={filtered}
                  showProduto={tiposCusto.produto}
                  showEnvio={tiposCusto.envio}
                  showColeta={tiposCusto.coleta}
                />
              </Card>
              <Card title="Evolução Trimestral">
                <LineQuarterly
                  data={aggByTrimestre}
                  showProduto={tiposCusto.produto}
                  showEnvio={tiposCusto.envio}
                  showColeta={tiposCusto.coleta}
                />
              </Card>
            </div>

            <Card title="Detalhamento por Fabricante">
              <DetailsTable
                data={aggByFab}
                showProduto={tiposCusto.produto}
                showEnvio={tiposCusto.envio}
                showColeta={tiposCusto.coleta}
              />
            </Card>
          </>
        )}

        {showUpload && (
          <UploadModal onClose={() => setShowUpload(false)} onSuccess={fetchRecords} />
        )}
      </div>
    </div>
  )
}
