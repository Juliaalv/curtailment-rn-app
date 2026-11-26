import { idiomaAtual } from './i18n'

/** Número no formato do idioma corrente (pt-BR ou en-US), com casas decimais fixas (padrão: 1). */
export const n1 = (v: number, casas = 1) =>
  v.toLocaleString(idiomaAtual() === 'pt' ? 'pt-BR' : 'en-US', { minimumFractionDigits: casas, maximumFractionDigits: casas })

/** "SERRA DO MEL 2" → "Serra do Mel 2"; "ACU III" → "Acu III". */
export const titulo = (s: string) =>
  s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/(^|\s)(\S)/g, (_, e, l) => e + l.toUpperCase())
    .replace(/ (Do|Da|De|Dos|Das) /g, (m) => m.toLowerCase())
    .replace(/ (Ii|Iii|Iv|Vi|Vii)$/, (m) => m.toUpperCase())
