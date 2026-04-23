export interface SacRecord {
  id?: number
  trimestreAno: string
  sacId: number
  fabricante: string
  tipo: string
  custoProduto: number
  custoEnvio: number
  custoColeta: number
  custoTotal: number
  mes: number
}

export interface FilterState {
  trimestres: string[]
  fabricantes: string[]
  tipos: string[]
  meses: number[]
  tiposCusto: { produto: boolean; envio: boolean; coleta: boolean }
}

export interface AggByFab {
  fabricante: string
  tipos: string[]
  sacs: number
  custoProduto: number
  custoEnvio: number
  custoColeta: number
  custoTotal: number
}

export interface AggByTrimestre {
  trimestreAno: string
  custoProduto: number
  custoEnvio: number
  custoColeta: number
  custoTotal: number
}
