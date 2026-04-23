'use client'

interface Props {
  trimestres: string[]
  fabricantes: string[]
  tipos: string[]
  meses: number[]
  allMeses: number[]
}

export default function ExportButton({ trimestres, fabricantes, tipos, meses, allMeses }: Props) {
  const handleExport = () => {
    const params = new URLSearchParams()
    if (trimestres.length)  params.set('trimestre',  trimestres.join(','))
    if (fabricantes.length) params.set('fabricante', fabricantes.join(','))
    if (tipos.length)       params.set('tipo',       tipos.join(','))
    // só envia meses se for um subconjunto (filtragem ativa)
    if (meses.length && meses.length < allMeses.length) params.set('mes', meses.join(','))
    window.location.href = `/api/export?${params.toString()}`
  }

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-muted hover:border-fotus-blue hover:text-fotus-blue transition-all duration-150 cursor-pointer"
    >
      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 1v8M4 6l3 3 3-3M2 11h10" />
      </svg>
      Exportar Relatório
    </button>
  )
}
