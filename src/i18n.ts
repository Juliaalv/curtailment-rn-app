import { useSyncExternalStore } from 'react'

export type Idioma = 'pt' | 'en'

const CHAVE = 'idioma'

function inicial(): Idioma {
  const salvo = typeof localStorage !== 'undefined' ? localStorage.getItem(CHAVE) : null
  if (salvo === 'pt' || salvo === 'en') return salvo
  return typeof navigator !== 'undefined' && !navigator.language.toLowerCase().startsWith('pt') ? 'en' : 'pt'
}

let atual: Idioma = inicial()
const ouvintes = new Set<() => void>()

/** Idioma corrente, para funções fora de componentes (como a formatação de números). */
export const idiomaAtual = () => atual

export function setIdioma(i: Idioma) {
  if (i === atual) return
  atual = i
  localStorage.setItem(CHAVE, i)
  document.documentElement.lang = i === 'pt' ? 'pt-BR' : 'en'
  document.title = TEXTOS[i].tituloPagina
  ouvintes.forEach((f) => f())
}

const ouvir = (f: () => void) => {
  ouvintes.add(f)
  return () => ouvintes.delete(f)
}

/** Idioma e textos da interface; o componente re-renderiza quando o idioma muda. */
export function useIdioma() {
  const idioma = useSyncExternalStore(ouvir, idiomaAtual)
  return { idioma, t: TEXTOS[idioma] }
}

const pt = {
  tituloPagina: 'Curtailment — cenários de carga e BESS',
  // Tipos e séries
  tipo: { hibrido: 'Solar + eólico', solar: 'Solar', eolico: 'Eólico' },
  serieEolico: 'Corte eólico',
  serieSolar: 'Corte solar',
  serieDireto: 'Corte consumido direto pela carga',
  serieDescarrega: 'Devolvido pelo BESS',
  serieCarrega: 'Carregando o BESS',
  serieSobra: 'Continua sendo cortado',
  // Moldura
  secoes: 'Seções',
  dados: 'Dados',
  idiomaRotulo: 'Idioma',
  fonte: 'Fonte:',
  fonteTexto: 'ONS — Dados de Restrição de Operação por Constrained-off de Usinas Eólicas e Fotovoltaicas (',
  portal: 'Portal de Dados Abertos',
  fonteFim: '), apuração 2025. Elaboração própria.',
  // Navegação
  brasil: 'Brasil',
  voceEsta: 'Você está em',
  carregando: 'Carregando',
  // Início
  ariaRN: (n: number, gwh: string) => `Rio Grande do Norte, ${n} clusters, ${gwh} GWh cortados`,
  tituloInicio: 'Curtailment de energia renovável',
  ledeInicio: 'Cenários de carga e BESS para aproveitar a energia cortada, por cluster de usinas. Escolha um estado.',
  bignumNota: (n: number) => `cortados em 2025 no Rio Grande do Norte · ${n} clusters`,
  estado: 'Estado',
  gwhCortados: 'GWh cortados',
  outrosEstados: (n: number) => `Outros ${n} estados`,
  semDadosNota: 'Os demais estados ainda não têm dados processados.',
  comDados: 'Com dados',
  semDados: 'Sem dados processados',
  mapaBrasil: 'Mapa do Brasil por estado',
  semDadosUf: 'sem dados processados',
  // Estado
  ledeEstado: (n: number) => ` cortados em 2025 em ${n} clusters de usinas. Selecione um cluster no mapa ou na tabela.`,
  legendaArea: 'Área do círculo: energia cortada em 2025 · pontos: usinas',
  mapaEstado: 'Clusters no mapa do Rio Grande do Norte',
  // Painel
  eolicas: (n: number) => `${n} eólicas`,
  solares: (n: number) => `${n} solares`,
  e: ' e ',
  energiaCortada: 'Energia cortada em 2025',
  corteDiaTipico: 'Corte no dia típico',
  corteMedio: 'Corte médio',
  maiorHora: 'Maior hora do dia típico',
  c1Titulo: 'Cenário 1 — carga fixa, sem bateria',
  c1Desc:
    'A carga é igual à menor barra de energia cortada do dia típico. Nenhuma hora do dia típico fica em déficit, então não é preciso armazenamento.',
  cargaFixa: 'Carga fixa',
  aprovTipico: 'Aproveitamento no dia típico',
  tetoMetodo: 'teto do método',
  aprovReal: 'Aproveitamento no ano real',
  serieHoraria: 'série horária de 2025',
  c1Aviso:
    'Neste cluster há horas do dia típico praticamente sem corte, então a menor barra é zero: sem bateria não existe carga fixa que possa ser atendida só com a energia cortada.',
  graficoTipico: 'Energia cortada no dia típico',
  graficoTipicoSub: 'MWh por hora, média dos 365 dias de 2025',
  cargaC1: 'Carga do Cenário 1',
  c2Titulo: 'Cenário 2 — carga maior com BESS de 4 h',
  c2Desc: (dod: string) =>
    `A carga sobe acima do Cenário 1 e a bateria cobre as horas em que o corte não basta. O banco é sempre de 4 h: a potência é a maior entre o pior déficit de uma hora e a energia mínima dividida por 4 × DoD. A capacidade mostrada é a nominal; com profundidade de descarga de ${dod}%, só ${dod}% dela é útil.`,
  alvoRotulo: 'Alvo de aproveitamento do corte do dia típico',
  cenario1: 'Cenário 1',
  dodRotulo: 'Profundidade de descarga (DoD) do BESS',
  cargaFlat: 'Carga flat',
  energiaBess: 'Energia do BESS',
  potenciaBess: 'Potência do BESS',
  alvoNota: (v: string) => `alvo no dia típico: ${v}%`,
  graficoDespacho: 'Para onde vai cada MWh cortado no dia típico',
  graficoDespachoSub: 'MWh por hora, com a carga e o BESS do alvo escolhido',
  niveis: 'Níveis do Cenário 2',
  niveisSub: 'Do Cenário 1 a 100%; clique em uma linha para usar o alvo',
  colAlvo: 'Alvo no dia típico (%)',
  colCarga: 'Carga flat (MW)',
  colAnoReal: 'Ano real (%)',
  usarAlvo: (v: string) => `Usar alvo de ${v}%`,
  c2Aviso:
    'O dia típico é a média dos dias do ano e serve para dimensionar. O aproveitamento que ele indica é um teto: a coluna do ano real mede o que a mesma carga e a mesma bateria entregam na série horária de 2025, com bateria ideal e a carga parando quando falta energia.',
}

export type Textos = typeof pt

const en: Textos = {
  tituloPagina: 'Curtailment — load and BESS scenarios',
  tipo: { hibrido: 'Solar + wind', solar: 'Solar', eolico: 'Wind' },
  serieEolico: 'Wind curtailment',
  serieSolar: 'Solar curtailment',
  serieDireto: 'Curtailment used directly by the load',
  serieDescarrega: 'Discharged by the BESS',
  serieCarrega: 'Charging the BESS',
  serieSobra: 'Still curtailed',
  secoes: 'Sections',
  dados: 'Data',
  idiomaRotulo: 'Language',
  fonte: 'Source:',
  fonteTexto: 'ONS — Constrained-off Operation Restriction Data for Wind and Solar PV Plants (',
  portal: 'Open Data Portal',
  fonteFim: '), 2025 records. Prepared by the author.',
  brasil: 'Brazil',
  voceEsta: 'Breadcrumb',
  carregando: 'Loading',
  ariaRN: (n, gwh) => `Rio Grande do Norte, ${n} clusters, ${gwh} GWh curtailed`,
  tituloInicio: 'Renewable energy curtailment',
  ledeInicio: 'Load and BESS scenarios to make use of curtailed energy, by cluster of plants. Choose a state.',
  bignumNota: (n) => `curtailed in 2025 in Rio Grande do Norte · ${n} clusters`,
  estado: 'State',
  gwhCortados: 'GWh curtailed',
  outrosEstados: (n) => `${n} other states`,
  semDadosNota: 'The other states do not have processed data yet.',
  comDados: 'With data',
  semDados: 'No processed data',
  mapaBrasil: 'Map of Brazil by state',
  semDadosUf: 'no processed data',
  ledeEstado: (n) => ` curtailed in 2025 across ${n} clusters of plants. Select a cluster on the map or in the table.`,
  legendaArea: 'Circle area: energy curtailed in 2025 · dots: plants',
  mapaEstado: 'Clusters on the map of Rio Grande do Norte',
  eolicas: (n) => `${n} wind ${n === 1 ? 'farm' : 'farms'}`,
  solares: (n) => `${n} solar ${n === 1 ? 'plant' : 'plants'}`,
  e: ' and ',
  energiaCortada: 'Energy curtailed in 2025',
  corteDiaTipico: 'Curtailment on the typical day',
  corteMedio: 'Average curtailment',
  maiorHora: 'Peak hour of the typical day',
  c1Titulo: 'Scenario 1 — fixed load, no battery',
  c1Desc:
    'The load equals the smallest bar of curtailed energy on the typical day. No hour of the typical day runs a deficit, so no storage is needed.',
  cargaFixa: 'Fixed load',
  aprovTipico: 'Utilization on the typical day',
  tetoMetodo: 'method ceiling',
  aprovReal: 'Utilization in the actual year',
  serieHoraria: '2025 hourly series',
  c1Aviso:
    'This cluster has hours of the typical day with practically no curtailment, so the smallest bar is zero: without a battery, no fixed load can be served by curtailed energy alone.',
  graficoTipico: 'Curtailed energy on the typical day',
  graficoTipicoSub: 'MWh per hour, average of the 365 days of 2025',
  cargaC1: 'Scenario 1 load',
  c2Titulo: 'Scenario 2 — larger load with a 4 h BESS',
  c2Desc: (dod) =>
    `The load rises above Scenario 1 and the battery covers the hours when curtailment is not enough. The bank is always 4 h: its power is the larger of the worst one-hour deficit and the minimum energy divided by 4 × DoD. The capacity shown is nominal; with a depth of discharge of ${dod}%, only ${dod}% of it is usable.`,
  alvoRotulo: 'Target utilization of typical-day curtailment',
  cenario1: 'Scenario 1',
  dodRotulo: 'BESS depth of discharge (DoD)',
  cargaFlat: 'Flat load',
  energiaBess: 'BESS energy',
  potenciaBess: 'BESS power',
  alvoNota: (v) => `typical-day target: ${v}%`,
  graficoDespacho: 'Where each curtailed MWh goes on the typical day',
  graficoDespachoSub: 'MWh per hour, with the load and BESS for the chosen target',
  niveis: 'Scenario 2 levels',
  niveisSub: 'From Scenario 1 to 100%; click a row to use that target',
  colAlvo: 'Typical-day target (%)',
  colCarga: 'Flat load (MW)',
  colAnoReal: 'Actual year (%)',
  usarAlvo: (v) => `Use target of ${v}%`,
  c2Aviso:
    'The typical day is the average of the days in the year and is used for sizing. The utilization it indicates is a ceiling: the actual-year column measures what the same load and battery deliver over the 2025 hourly series, with an ideal battery and the load stopping when energy runs out.',
}

export const TEXTOS: Record<Idioma, Textos> = { pt, en }

if (typeof document !== 'undefined') {
  document.documentElement.lang = atual === 'pt' ? 'pt-BR' : 'en'
  document.title = TEXTOS[atual].tituloPagina
}
