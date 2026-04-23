'use client'

interface FilterPanelProps {
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
  totalSacs:    number
  filteredSacs: number
  totalValue:   number
}

const MESES: Record<number, string> = {1:'Jan',2:'Fev',3:'Mar',4:'Abr',5:'Mai',6:'Jun',7:'Jul',8:'Ago',9:'Set',10:'Out',11:'Nov',12:'Dez'}

function toggle<T>(arr: T[], val: T): T[] {
  return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]
}

function Chip({ label, active, onClick, color }: { label: string; active: boolean; onClick: () => void; color?: string }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-[11px] font-medium border transition-all duration-150 cursor-pointer
        ${active
          ? `text-white border-transparent`
          : 'bg-transparent border-border text-muted hover:border-fotus-blue hover:text-fotus-blue'
        }`}
      style={active ? { background: color ?? '#1E3A5F', borderColor: color ?? '#1E3A5F' } : undefined}
    >
      {label}
    </button>
  )
}

const TIPO_COLORS: Record<string, string> = {
  Inversor: '#1E3A5F',
  Módulo:   '#1D9E75',
  Bateria:  '#378ADD',
}

export default function FilterPanel(props: FilterPanelProps) {
  const {
    allFabricantes, allTipos, allTrimestres, allMeses,
    fabricantes, tipos, trimestres, meses, tiposCusto,
    onFabricante, onTipo, onTrimestre, onMes, onTiposCusto, onClear,
    totalSacs, filteredSacs, totalValue,
  } = props

  const isAllSelected =
    fabricantes.length === allFabricantes.length &&
    tipos.length === allTipos.length &&
    meses.length === allMeses.length &&
    trimestres.length === allTrimestres.length &&
    tiposCusto.produto && tiposCusto.envio && tiposCusto.coleta

  return (
    <div className="bg-surface border border-border rounded-xl px-5 py-4 flex flex-wrap gap-5 items-start">
      {allTrimestres.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Trimestre</span>
          <div className="flex flex-wrap gap-1.5">
            {allTrimestres.map(t => (
              <Chip key={t} label={t} active={trimestres.includes(t)} onClick={() => onTrimestre(toggle(trimestres, t))} color="#1E3A5F" />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Fabricante</span>
        <div className="flex flex-wrap gap-1.5">
          {allFabricantes.map(f => (
            <Chip key={f} label={f} active={fabricantes.includes(f)} onClick={() => onFabricante(toggle(fabricantes, f))} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Tipo de Produto</span>
        <div className="flex flex-wrap gap-1.5">
          {allTipos.map(t => (
            <Chip key={t} label={t} active={tipos.includes(t)} onClick={() => onTipo(toggle(tipos, t))} color={TIPO_COLORS[t]} />
          ))}
        </div>
      </div>

      {allMeses.length > 1 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Mês</span>
          <div className="flex flex-wrap gap-1.5">
            {allMeses.map(m => (
              <Chip key={m} label={MESES[m] ?? `M${m}`} active={meses.includes(m)} onClick={() => onMes(toggle(meses, m))} color="#B08900" />
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-widest text-muted font-medium">Tipo de Custo</span>
        <div className="flex flex-wrap gap-1.5">
          <Chip label="Produto" active={tiposCusto.produto} onClick={() => onTiposCusto({ ...tiposCusto, produto: !tiposCusto.produto })} color="#1E3A5F" />
          <Chip label="Envio"   active={tiposCusto.envio}   onClick={() => onTiposCusto({ ...tiposCusto, envio:   !tiposCusto.envio   })} color="#B08900" />
          <Chip label="Coleta"  active={tiposCusto.coleta}  onClick={() => onTiposCusto({ ...tiposCusto, coleta:  !tiposCusto.coleta  })} color="#378ADD" />
        </div>
      </div>

      <div className="flex flex-col justify-end gap-1.5 ml-auto">
        <span className="text-[11px] text-dim">
          <strong className="text-muted font-medium">{filteredSacs}</strong> SACs ·{' '}
          <strong className="text-muted font-medium">R${(totalValue / 1000).toFixed(0)}K</strong>
        </span>
        {!isAllSelected && (
          <button
            onClick={onClear}
            className="px-3 py-1 rounded-full border border-border text-[11px] text-muted hover:border-red-400 hover:text-red-500 transition-all duration-150 cursor-pointer bg-transparent font-medium"
          >
            Limpar filtros
          </button>
        )}
      </div>
    </div>
  )
}
