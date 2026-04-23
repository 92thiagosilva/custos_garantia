import Dashboard from '@/components/Dashboard'

export default function Page() {
  return (
    <main className="max-w-[1300px] mx-auto px-5 pb-16 pt-5 space-y-3">
      <header className="bg-fotus-blue text-white px-6 py-4 rounded-2xl flex items-center gap-3.5">
        <div className="w-9 h-9 bg-fotus-yellow rounded-lg flex items-center justify-center flex-shrink-0">
          <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
            <circle cx="11" cy="11" r="4" fill="#1E3A5F" />
            <line x1="11" y1="1" x2="11" y2="5" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="17" x2="11" y2="21" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="1" y1="11" x2="5" y2="11" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="17" y1="11" x2="21" y2="11" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="3.9" y1="3.9" x2="6.7" y2="6.7" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="15.3" y1="15.3" x2="18.1" y2="18.1" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="18.1" y1="3.9" x2="15.3" y2="6.7" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
            <line x1="6.7" y1="15.3" x2="3.9" y2="18.1" stroke="#1E3A5F" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <p className="font-semibold text-[15px] tracking-tight">Custos de Garantia — Fotus Distribuidora Solar</p>
          <p className="text-[11px] opacity-50 mt-0.5">SAC · Módulos, Inversores e Baterias</p>
        </div>
      </header>
      <Dashboard />
    </main>
  )
}
