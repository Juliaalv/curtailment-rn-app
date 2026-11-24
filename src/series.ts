export interface Serie {
  chave: string
  nome: string
  cor: string
}

export const SERIES_FONTE: Serie[] = [
  { chave: 'eolico', nome: 'Corte eólico', cor: 'var(--c-eolico)' },
  { chave: 'solar', nome: 'Corte solar', cor: 'var(--c-solar)' },
]

export const SERIES_DESPACHO: Serie[] = [
  { chave: 'direto', nome: 'Corte consumido direto pela carga', cor: 'var(--c-direto)' },
  { chave: 'descarrega', nome: 'Devolvido pelo BESS', cor: 'var(--c-descarga)' },
  { chave: 'carrega', nome: 'Carregando o BESS', cor: 'var(--c-carrega)' },
  { chave: 'sobra', nome: 'Continua sendo cortado', cor: 'var(--c-sobra)' },
]
