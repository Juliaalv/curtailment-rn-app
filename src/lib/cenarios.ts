// Cálculo dos cenários de carga e BESS — mesma lógica do notebook 06_carga_hibrida_simplificada.
// O dia típico (24 valores, MWh por hora) dimensiona; a série do ano (8.760 valores) só mede.

export const DURACAO_H = 4 // BESS comercial: a energia é 4 × a potência
export const DOD = 0.8 // profundidade de descarga padrão: só 80% da capacidade nominal é útil

const soma = (v: number[]) => v.reduce((a, b) => a + b, 0)

/** Carga flat (MW) que consome alvoPct do corte do dia típico. */
export const carga = (corte: number[], alvoPct: number) => (alvoPct / 100) * (soma(corte) / 24)

/** Quanto (%) do corte do dia típico uma carga flat de p MW consome. */
export const aproveitamento = (corte: number[], p: number) => {
  const total = soma(corte)
  return total > 0 ? (100 * 24 * p) / total : 0
}

/** Energia mínima (MWh) do BESS: maior déficit líquido de uma janela contígua no dia cíclico. */
export function capacidade(corte: number[], p: number) {
  let melhor = 0
  for (let i = 0; i < 24; i++) {
    let acumulado = 0
    for (let j = i; j < i + 24; j++) {
      acumulado += p - corte[j % 24]
      if (acumulado > melhor) melhor = acumulado
    }
  }
  return melhor
}

/** Maior falta de uma hora (MW): a potência que o BESS precisa entregar no pico. */
export const piorDeficit = (corte: number[], p: number) => Math.max(0, ...corte.map((e) => p - e))

/** BESS de 4 h (capacidade nominal) que sustenta a carga de p MW: vale o mais exigente entre
 *  potência e energia. A energia útil, dod × 4 × potência, tem que cobrir a energia mínima. */
export function bess4h(corte: number[], p: number, dod = DOD) {
  const potencia = Math.max(piorDeficit(corte, p), capacidade(corte, p) / (dod * DURACAO_H))
  return { energia: DURACAO_H * potencia, potencia }
}

/** Aproveitamento (%) do corte do ano com a carga de p MW e um BESS de cap MWh úteis, SOC contínuo. */
export function desempenhoReal(serie: number[], p: number, cap: number) {
  let soc = 0
  let entregue = 0
  let total = 0
  for (const e of serie) {
    total += e
    entregue += Math.min(e, p)
    const sobra = e - p
    if (sobra >= 0) {
      soc = Math.min(soc + sobra, cap)
    } else {
      const devolve = Math.min(-sobra, soc)
      soc -= devolve
      entregue += devolve
    }
  }
  return total > 0 ? (100 * entregue) / total : 0
}

export interface Despacho {
  direto: number[] // corte consumido direto pela carga
  descarrega: number[] // devolvido pelo BESS
  carrega: number[] // excedente que carrega o BESS
  sobra: number[] // continua sendo cortado
  soc: number[] // energia útil armazenada no fim de cada hora (MWh)
}

/** Opera o BESS (cap MWh úteis) hora a hora no dia típico cíclico, começando na hora em que o banco está vazio. */
export function despachoDiaTipico(corte: number[], p: number, cap: number): Despacho {
  const net = corte.map((e) => e - p)
  let acumulado = 0
  let minimo = Infinity
  let inicio = 0
  net.forEach((v, h) => {
    acumulado += v
    if (acumulado < minimo) {
      minimo = acumulado
      inicio = (h + 1) % 24
    }
  })

  const zeros = () => new Array<number>(24).fill(0)
  const d: Despacho = { direto: corte.map((e) => Math.min(e, p)), descarrega: zeros(), carrega: zeros(), sobra: zeros(), soc: zeros() }
  let soc = 0
  for (let k = 0; k < 24; k++) {
    const h = (inicio + k) % 24
    if (net[h] >= 0) {
      d.carrega[h] = Math.min(net[h], cap - soc)
      d.sobra[h] = net[h] - d.carrega[h]
      soc += d.carrega[h]
    } else {
      d.descarrega[h] = Math.min(-net[h], soc)
      soc -= d.descarrega[h]
    }
    d.soc[h] = soc
  }
  return d
}

export interface Cenario {
  alvoPct: number
  cargaMw: number
  bessMwh: number
  bessMw: number
  aproveitamentoRealPct: number
}

/** Carga, BESS de 4 h e aproveitamento no ano real para um alvo de aproveitamento do dia típico.
 *  dod é a profundidade de descarga (0–1): a fração da capacidade nominal que é útil. */
export function cenario(corte: number[], serie: number[], alvoPct: number, dod = DOD): Cenario {
  const p = carga(corte, alvoPct)
  const { energia, potencia } = bess4h(corte, p, dod)
  return {
    alvoPct,
    cargaMw: p,
    bessMwh: energia,
    bessMw: potencia,
    aproveitamentoRealPct: desempenhoReal(serie, p, dod * energia),
  }
}
