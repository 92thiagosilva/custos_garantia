'use client'

import { useState } from 'react'

interface FilterSidebarProps {
  allFabricantes: string[]
  allTipos: string[]
  allTrimestres: string[]
  allMeses: number[]
  fabricantes: string[]
  tipos: string[]
  trimestres: string[]
  meses: number[]
  tiposCusto: { produto: boolean; envio: boolean; coleta: boolean }
  onFabricante: (v: string[]) => void
  onTipo:       (v: string[]) => void
  onTrimestre:  (v: string[]) => void
  onMes:        (v: number[]) => void
  onTiposCusto: (v: { produto: boolean; envio: boolean; coleta: boolean }) => void
  onClear:      () => void
  filteredSacs: number
  totalSacs:    number
}

const MESES_LABEL: Record<number, string> = {
  1:'Janeiro', 2:'Fevereiro', 3:'Março', 4:'Abril',
  5:'Maio', 6:'Junho', 7:'Julho', 8:'Agosto',
  9:'Setembro', 10:'Outubro', 11:'Novembro', 12:'Dezembro',
}

const FAB_INVERSORES = ['DEYE', 'SOLPLANET', 'TSUNESS', 'AUXSOL', 'GOODWE', 'TECHPOWER', 'VEIKONG']
const FAB_BATERIAS   = ['UNIPOWER']
// Tudo que não for inversor nem bateria é tratado como módulo

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-white/10">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 text-left cursor-pointer bg-transparent border-none"
      >
        <span className="text-[11px] font-semibold uppercase tracking-widest text-white/50">{title}</span>
        <svg
          width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor"
          strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
          className="text-white/30 transition-transform duration-200"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <path d="M3 5l4 4 4-4" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function Checkbox({ label, checked, onChange, color }: { label: string; checked: boolean; onChange: () => void; color?: string }) {
  return (
    <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
      <div
        onClick={onChange}
        className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 cursor-pointer"
        style={{
          background: checked ? (color ?? '#378ADD') : 'transparent',
          borderColor: checked ? (color ?? '#378ADD') : 'rgba(255,255,255,0.2)',
        }}
      >
        {checked && (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 2.5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-[12px] text-white/70 group-hover:text-white transition-colors select-none" onClick={onChange}>
        {label}
      </span>
    </label>
  )
}

function FabGroup({ title, fabricantes, allFabs, selected, onToggle, color }: {
  title: string
  fabricantes: string[]
  allFabs: string[]
  selected: string[]
  onToggle: (f: string) => void
  color: string
}) {
  if (fabricantes.length === 0) return null
  const allSelected = fabricantes.every(f => selected.includes(f))

  const toggleAll = () => {
    if (allSelected) {
      // deselect all in this group
      onToggle('__DESELECT_GROUP__' + fabricantes.join(','))
    } else {
      onToggle('__SELECT_GROUP__' + fabricantes.join(','))
    }
  }

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-medium uppercase tracking-wider" style={{ color }}>{title}</span>
        <button
          onClick={toggleAll}
          className="text-[10px] text-white/30 hover:text-white/60 transition-colors cursor-pointer bg-transparent border-none"
        >
          {allSelected ? 'Limpar' : 'Todos'}
        </button>
      </div>
      {fabricantes.map(f => (
        <Checkbox
          key={f}
          label={f}
          checked={selected.includes(f)}
          onChange={() => onToggle(f)}
          color={color}
        />
      ))}
    </div>
  )
}

export default function FilterSidebar(props: FilterSidebarProps) {
  const {
    allFabricantes, allTipos, allTrimestres, allMeses,
    fabricantes, tipos, trimestres, meses, tiposCusto,
    onFabricante, onTipo, onTrimestre, onMes, onTiposCusto, onClear,
    filteredSacs, totalSacs,
  } = props

  const fabInversores = allFabricantes.filter(f => FAB_INVERSORES.some(k => f.toUpperCase().includes(k)))
  const fabBaterias   = allFabricantes.filter(f => FAB_BATERIAS.some(k => f.toUpperCase().includes(k)))
  const fabModulos    = allFabricantes.filter(f =>
    !FAB_INVERSORES.some(k => f.toUpperCase().includes(k)) &&
    !FAB_BATERIAS.some(k => f.toUpperCase().includes(k))
  )

  const toggleFab = (cmd: string) => {
    if (cmd.startsWith('__DESELECT_GROUP__')) {
      const group = cmd.replace('__DESELECT_GROUP__', '').split(',')
      onFabricante(fabricantes.filter(f => !group.includes(f)))
    } else if (cmd.startsWith('__SELECT_GROUP__')) {
      const group = cmd.replace('__SELECT_GROUP__', '').split(',')
      const next = [...new Set([...fabricantes, ...group])]
      onFabricante(next)
    } else {
      onFabricante(fabricantes.includes(cmd)
        ? fabricantes.filter(f => f !== cmd)
        : [...fabricantes, cmd])
    }
  }

  const hasActiveFilters =
    fabricantes.length < allFabricantes.length ||
    tipos.length < allTipos.length ||
    meses.length < allMeses.length ||
    trimestres.length < allTrimestres.length ||
    !tiposCusto.produto || !tiposCusto.envio || !tiposCusto.coleta

  return (
    <aside
      className="flex-shrink-0 flex flex-col overflow-y-auto"
      style={{
        width: 260,
        background: '#111827',
        borderRight: '1px solid rgba(255,255,255,0.07)',
        minHeight: '100%',
      }}
    >
      {/* Header */}
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">Filtros</p>
        <div className="flex items-center justify-between mt-1">
          <span className="text-[12px] text-white/60">
            <strong className="text-white font-mono">{filteredSacs}</strong>
            <span className="text-white/30"> / {totalSacs} SACs</span>
          </span>
          {hasActiveFilters && (
            <button
              onClick={onClear}
              className="text-[10px] text-red-400 hover:text-red-300 transition-colors cursor-pointer bg-transparent border-none"
            >
              Limpar tudo
            </button>
          )}
        </div>
      </div>

      {/* Trimestre */}
      {allTrimestres.length > 1 && (
        <Section title="Período" defaultOpen>
          {allTrimestres.map(t => (
            <Checkbox
              key={t}
              label={t}
              checked={trimestres.includes(t)}
              onChange={() => onTrimestre(trimestres.includes(t) ? trimestres.filter(x => x !== t) : [...trimestres, t])}
              color="#1D9E75"
            />
          ))}
        </Section>
      )}

      {/* Mês */}
      {allMeses.length > 1 && (
        <Section title="Mês" defaultOpen>
          {allMeses.map(m => (
            <Checkbox
              key={m}
              label={MESES_LABEL[m] ?? `Mês ${m}`}
              checked={meses.includes(m)}
              onChange={() => onMes(meses.includes(m) ? meses.filter(x => x !== m) : [...meses, m])}
              color="#B08900"
            />
          ))}
        </Section>
      )}

      {/* Fabricante — agrupado por tipo */}
      <Section title="Fabricante" defaultOpen>
        <div className="flex gap-2 mb-3">
          <button
            onClick={() => onFabricante(allFabricantes)}
            className="text-[10px] px-2 py-1 rounded border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors cursor-pointer bg-transparent"
          >
            Todos
          </button>
          <button
            onClick={() => onFabricante([])}
            className="text-[10px] px-2 py-1 rounded border border-white/20 text-white/50 hover:text-white hover:border-white/40 transition-colors cursor-pointer bg-transparent"
          >
            Limpar
          </button>
        </div>

        {fabInversores.length > 0 && (
          <FabGroup
            title="Inversores"
            fabricantes={fabInversores}
            allFabs={allFabricantes}
            selected={fabricantes}
            onToggle={toggleFab}
            color="#378ADD"
          />
        )}
        {fabModulos.length > 0 && (
          <FabGroup
            title="Módulos"
            fabricantes={fabModulos}
            allFabs={allFabricantes}
            selected={fabricantes}
            onToggle={toggleFab}
            color="#1D9E75"
          />
        )}
        {fabBaterias.length > 0 && (
          <FabGroup
            title="Baterias"
            fabricantes={fabBaterias}
            allFabs={allFabricantes}
            selected={fabricantes}
            onToggle={toggleFab}
            color="#F5C400"
          />
        )}
      </Section>

      {/* Tipo de Produto */}
      <Section title="Tipo de Produto" defaultOpen>
        {allTipos.map(t => {
          const colors: Record<string, string> = { Inversor: '#378ADD', Módulo: '#1D9E75', Bateria: '#F5C400' }
          return (
            <Checkbox
              key={t}
              label={t}
              checked={tipos.includes(t)}
              onChange={() => onTipo(tipos.includes(t) ? tipos.filter(x => x !== t) : [...tipos, t])}
              color={colors[t] ?? '#9CA3AF'}
            />
          )
        })}
      </Section>

      {/* Tipo de Custo */}
      <Section title="Tipo de Custo" defaultOpen>
        <Checkbox label="Custo de Produto"  checked={tiposCusto.produto} onChange={() => onTiposCusto({ ...tiposCusto, produto: !tiposCusto.produto })} color="#1E3A5F" />
        <Checkbox label="Frete de Envio"    checked={tiposCusto.envio}   onChange={() => onTiposCusto({ ...tiposCusto, envio:   !tiposCusto.envio   })} color="#F5C400" />
        <Checkbox label="Frete de Coleta"   checked={tiposCusto.coleta}  onChange={() => onTiposCusto({ ...tiposCusto, coleta:  !tiposCusto.coleta  })} color="#378ADD" />
      </Section>
    </aside>
  )
}
