// Confere a biblioteca contra os valores publicados no notebook 06 (dados do ONS de 2025).
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { DOD, aproveitamento, bess4h, capacidade, carga, cenario, desempenhoReal, despachoDiaTipico } from './cenarios'

function ler(id: string) {
  const d = JSON.parse(readFileSync(`public/data/${id}.json`, 'utf-8'))
  const corte = (d.dia_tipico_solar as number[]).map((s, h) => s + d.dia_tipico_eolico[h])
  return { corte, serie: d.serie as number[] }
}

describe('Cenário 1 — carga na menor barra do dia típico', () => {
  // subestação: [carga MW, aproveitamento dia típico %, aproveitamento ano real %]
  const esperado: Record<string, [number, number, number]> = {
    RNABR_0: [10.6, 33.4, 26.5],
    RNMTV_0: [37.15, 42.5, 29.3],
    RNSDM2_0: [44.58, 58.5, 40.2],
    RNSDM_0: [83.47, 54.2, 39.4],
  }
  for (const [id, [p, tipico, real]] of Object.entries(esperado)) {
    it(id, () => {
      const { corte, serie } = ler(id)
      const min = Math.min(...corte)
      expect(min).toBeCloseTo(p, 1)
      expect(aproveitamento(corte, min)).toBeCloseTo(tipico, 1)
      expect(desempenhoReal(serie, min, 0)).toBeCloseTo(real, 0)
      expect(capacidade(corte, min)).toBe(0)
    })
  }
})

describe('Cenário 2 — carga + BESS de 4 h', () => {
  it('Serra do Mel 2 a 95,6% entrega 60,7% do corte do ano', () => {
    const { corte, serie } = ler('RNSDM2_0')
    const p = carga(corte, 95.6)
    expect(p).toBeCloseTo(72.87, 1)
    expect(capacidade(corte, p)).toBeCloseTo(113.2, 0)
    expect(desempenhoReal(serie, p, capacidade(corte, p))).toBeCloseTo(60.7, 0)
  })

  it('Serra do Mel a 100%: 454,4 MWh / 113,6 MW nominais e 65,8% no ano real', () => {
    const { corte, serie } = ler('RNSDM_0')
    const c = cenario(corte, serie, 100)
    expect(c.cargaMw).toBeCloseTo(154.03, 1)
    expect(c.bessMwh).toBeCloseTo(454.4, 0)
    expect(c.bessMw).toBeCloseTo(113.61, 1)
    expect(c.aproveitamentoRealPct).toBeCloseTo(65.8, 0)
  })

  it('Serra do Mel 2 a 100%: 216,5 MWh / 54,1 MW nominais e 63,9% no ano real', () => {
    const { corte, serie } = ler('RNSDM2_0')
    const c = cenario(corte, serie, 100)
    expect(c.cargaMw).toBeCloseTo(76.21, 1)
    expect(c.bessMwh).toBeCloseTo(216.5, 0)
    expect(c.bessMw).toBeCloseTo(54.13, 1)
    expect(c.aproveitamentoRealPct).toBeCloseTo(63.9, 0)
  })

  it('acima do limiar a energia dimensiona: a parte útil (DoD) cobre exatamente C', () => {
    const { corte } = ler('RNSDM2_0')
    const p = carga(corte, 100)
    expect(DOD * bess4h(corte, p).energia).toBeCloseTo(capacidade(corte, p), 6)
  })

  it('o DoD escolhido escala a energia nominal quando a energia dimensiona', () => {
    const { corte, serie } = ler('RNSDM2_0')
    const p = carga(corte, 100)
    expect(0.9 * bess4h(corte, p, 0.9).energia).toBeCloseTo(capacidade(corte, p), 6)
    expect(cenario(corte, serie, 100, 1).bessMwh).toBeCloseTo(capacidade(corte, p), 6)
    expect(cenario(corte, serie, 100).bessMwh).toBeCloseTo(cenario(corte, serie, 100, DOD).bessMwh, 9)
  })

  it('abaixo do limiar a potência dimensiona: energia = 4 × pior déficit', () => {
    const { corte } = ler('RNSDM_0')
    const p = carga(corte, 80.4)
    const b = bess4h(corte, p)
    expect(b.potencia).toBeCloseTo(p - Math.min(...corte), 6)
    expect(b.energia).toBeCloseTo(4 * b.potencia, 6)
    expect(DOD * b.energia).toBeGreaterThan(capacidade(corte, p))
  })

  it('o despacho do dia típico atende a carga nas 24 h e fecha o balanço', () => {
    const { corte } = ler('RNMTV_0')
    const p = carga(corte, 80)
    const d = despachoDiaTipico(corte, p, DOD * bess4h(corte, p).energia)
    for (let h = 0; h < 24; h++) {
      expect(d.direto[h] + d.descarrega[h]).toBeCloseTo(p, 6)
      expect(d.direto[h] + d.carrega[h] + d.sobra[h]).toBeCloseTo(corte[h], 6)
    }
  })

  it('o SOC do despacho fica entre 0 e a energia útil, e a reserva cresce quando o DoD cai', () => {
    const { corte } = ler('RNMTV_0')
    const p = carga(corte, 80)
    for (const dod of [0.6, 0.8, 1]) {
      const { energia } = bess4h(corte, p, dod)
      const d = despachoDiaTipico(corte, p, dod * energia)
      expect(Math.min(...d.soc)).toBeGreaterThanOrEqual(-1e-9)
      expect(Math.max(...d.soc)).toBeLessThanOrEqual(dod * energia + 1e-9)
    }
    const reserva = (dod: number) => (1 - dod) * bess4h(corte, p, dod).energia
    expect(reserva(0.6)).toBeGreaterThan(reserva(0.8))
  })
})

describe('casos de borda', () => {
  it('cluster só solar: a menor barra é zero e o Cenário 1 não tem carga', () => {
    const { corte } = ler('RNACT_0')
    expect(Math.min(...corte)).toBe(0)
    expect(aproveitamento(corte, 0)).toBe(0)
  })
})
