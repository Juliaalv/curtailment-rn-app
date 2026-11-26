import type { Textos } from './i18n'

export interface Serie {
  chave: string
  nome: string
  cor: string
}

export const seriesFonte = (t: Textos): Serie[] => [
  { chave: 'eolico', nome: t.serieEolico, cor: 'var(--c-eolico)' },
  { chave: 'solar', nome: t.serieSolar, cor: 'var(--c-solar)' },
]

export const seriesDespacho = (t: Textos): Serie[] => [
  { chave: 'direto', nome: t.serieDireto, cor: 'var(--c-direto)' },
  { chave: 'descarrega', nome: t.serieDescarrega, cor: 'var(--c-descarga)' },
  { chave: 'carrega', nome: t.serieCarrega, cor: 'var(--c-carrega)' },
  { chave: 'sobra', nome: t.serieSobra, cor: 'var(--c-sobra)' },
]
