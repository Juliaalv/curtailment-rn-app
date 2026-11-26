import type { KeyboardEvent } from 'react'
import { n1, titulo } from './formato'
import { useIdioma } from './i18n'
import { NOME_UF, UF_DISPONIVEL } from './ufs'

type Anel = [number, number][]

export interface Malhas {
  /** Código IBGE da UF → anéis exteriores em (lon, lat). */
  ufs: Record<string, Anel[]>
  rn: Anel[]
}

export type Tipo = 'hibrido' | 'solar' | 'eolico'

export interface ClusterResumo {
  id: string
  subestacao: string
  tipo: Tipo
  n_solar: number
  n_eolico: number
  corte_anual_gwh: number
  lon: number
  lat: number
  usinas_solar: [number, number][]
  usinas_eolico: [number, number][]
}

/** Projeção equirretangular ajustada à latitude média: basta para um país ou um estado. */
function projecao(aneis: Anel[], largura: number, margem: number) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity
  for (const anel of aneis)
    for (const [x, y] of anel) {
      x0 = Math.min(x0, x); x1 = Math.max(x1, x)
      y0 = Math.min(y0, y); y1 = Math.max(y1, y)
    }
  const kx = Math.cos((((y0 + y1) / 2) * Math.PI) / 180)
  const k = (largura - 2 * margem) / ((x1 - x0) * kx)
  const p = (lon: number, lat: number): [number, number] => [margem + (lon - x0) * kx * k, margem + (y1 - lat) * k]
  const d = (as: Anel[]) =>
    as.map((a) => 'M' + a.map(([x, y]) => p(x, y).map((v) => v.toFixed(1)).join(',')).join('L') + 'Z').join('')
  return { altura: (y1 - y0) * k + 2 * margem, p, d }
}

const aoTeclar = (acao: () => void) => (e: KeyboardEvent) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    acao()
  }
}

interface MapaBrasilProps {
  malhas: Malhas
  /** Rótulo acessível e anotação de cada UF com dados: código IBGE → texto. */
  resumo: Record<string, { aria: string; anotacao: string }>
  destaque?: string
  onDestaque: (cod?: string) => void
  onEscolher: (rota: string) => void
}

export function MapaBrasil({ malhas, resumo, destaque, onDestaque, onEscolher }: MapaBrasilProps) {
  const { t } = useIdioma()
  const L = 560
  const todos = Object.values(malhas.ufs).flat()
  const { altura, p, d } = projecao(todos, L, 4)
  const [rx, ry] = p(-35.2, -5.6)
  const ordem = Object.keys(malhas.ufs).sort((a, b) => Number(a in UF_DISPONIVEL) - Number(b in UF_DISPONIVEL))

  return (
    <svg className="mapa" viewBox={`0 0 ${L + 200} ${altura}`} role="group" aria-label={t.mapaBrasil}>
      <defs>
        <pattern id="hachura" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill="var(--land)" />
          <line x1="0" y1="0" x2="0" y2="6" stroke="var(--land-line)" strokeWidth="1.5" />
        </pattern>
      </defs>
      {ordem.map((cod) => {
        const rota = UF_DISPONIVEL[cod]
        return rota ? (
          <path
            key={cod}
            className="uf com-dados"
            data-ativo={cod === destaque}
            d={d(malhas.ufs[cod])}
            role="button"
            tabIndex={0}
            aria-label={resumo[cod]?.aria ?? NOME_UF[cod]}
            onClick={() => onEscolher(rota)}
            onKeyDown={aoTeclar(() => onEscolher(rota))}
            onMouseEnter={() => onDestaque(cod)}
            onMouseLeave={() => onDestaque()}
            onFocus={() => onDestaque(cod)}
            onBlur={() => onDestaque()}
          />
        ) : (
          <path key={cod} className="uf sem-dados" d={d(malhas.ufs[cod])}>
            <title>{NOME_UF[cod]} — {t.semDadosUf}</title>
          </path>
        )
      })}
      <g className="chamada" aria-hidden="true" onClick={() => onEscolher('rn')}>
        <line className="guia" x1={rx} y1={ry} x2={rx + 34} y2={ry - 22} />
        <text x={rx + 40} y={ry - 38}>
          <tspan>{NOME_UF[24]}</tspan>
          {resumo[24] && (
            <tspan className="valor" x={rx + 40} dy="1.25em">
              {resumo[24].anotacao}
            </tspan>
          )}
        </text>
      </g>
    </svg>
  )
}

function Marca({ x, y, r, tipo }: { x: number; y: number; r: number; tipo: Tipo }) {
  if (tipo !== 'hibrido')
    return <circle cx={x} cy={y} r={r} fill={tipo === 'solar' ? 'var(--c-solar)' : 'var(--c-eolico)'} />
  return (
    <>
      <path d={`M${x},${y - r}A${r},${r} 0 0 0 ${x},${y + r}Z`} fill="var(--c-eolico)" />
      <path d={`M${x},${y - r}A${r},${r} 0 0 1 ${x},${y + r}Z`} fill="var(--c-solar)" />
    </>
  )
}

/** Quantos dos maiores clusters ficam rotulados no mapa mesmo sem hover. */
const N_ROTULOS_FIXOS = 5

interface MapaEstadoProps {
  malhas: Malhas
  clusters: ClusterResumo[]
  destaque?: string
  onDestaque: (id?: string) => void
  onEscolher: (id: string) => void
}

/** Contorno do RN com as usinas (pontos pequenos) e um círculo por cluster, de área proporcional ao corte. */
export function MapaEstado({ malhas, clusters, destaque, onDestaque, onEscolher }: MapaEstadoProps) {
  const { t } = useIdioma()
  const L = 900
  const { altura, p, d } = projecao(malhas.rn, L, 14)
  const maior = Math.max(...clusters.map((c) => c.corte_anual_gwh))
  const raio = (c: ClusterResumo) => 4 + 13 * Math.sqrt(c.corte_anual_gwh / maior)
  // Os maiores primeiro, para os pequenos ficarem por cima e continuarem clicáveis.
  const ordenados = [...clusters].sort((a, b) => b.corte_anual_gwh - a.corte_anual_gwh)
  // Os maiores sempre rotulados (só o nome); o destacado leva também o valor e vai por último, por cima.
  const fixos = ordenados.slice(0, N_ROTULOS_FIXOS).filter((c) => c.id !== destaque)
  const ativo = ordenados.find((c) => c.id === destaque)
  const rotulados = ativo ? [...fixos, ativo] : fixos

  return (
    <svg className="mapa" viewBox={`0 0 ${L} ${altura}`} role="group" aria-label={t.mapaEstado}>
      <path className="estado" d={d(malhas.rn)} />
      <g className="usinas">
        {clusters.flatMap((c) => [
          ...c.usinas_eolico.map(([lon, lat], i) => {
            const [x, y] = p(lon, lat)
            return <circle key={`${c.id}e${i}`} cx={x} cy={y} r={1.6} fill="var(--c-eolico)" />
          }),
          ...c.usinas_solar.map(([lon, lat], i) => {
            const [x, y] = p(lon, lat)
            return <circle key={`${c.id}s${i}`} cx={x} cy={y} r={1.6} fill="var(--c-solar)" />
          }),
        ])}
      </g>
      {ordenados.map((c) => {
        const [x, y] = p(c.lon, c.lat)
        const r = raio(c)
        return (
          <g
            key={c.id}
            className="cluster"
            role="link"
            tabIndex={0}
            aria-label={`${titulo(c.subestacao)}, ${n1(c.corte_anual_gwh, 0)} GWh`}
            data-ativo={c.id === destaque}
            onClick={() => onEscolher(c.id)}
            onKeyDown={aoTeclar(() => onEscolher(c.id))}
            onMouseEnter={() => onDestaque(c.id)}
            onMouseLeave={() => onDestaque()}
            onFocus={() => onDestaque(c.id)}
            onBlur={() => onDestaque()}
          >
            <Marca x={x} y={y} r={r} tipo={c.tipo} />
            <circle className="aro" cx={x} cy={y} r={r} />
          </g>
        )
      })}
      {rotulados.map((c) => {
        const [x, y] = p(c.lon, c.lat)
        const r = raio(c)
        const esquerda = x > L * 0.72
        return (
          <text
            key={c.id}
            className="rotulo-mapa"
            data-ativo={c === ativo}
            x={esquerda ? x - r - 6 : x + r + 6}
            y={y + 4}
            textAnchor={esquerda ? 'end' : 'start'}
          >
            {titulo(c.subestacao)}
            {c === ativo && ` · ${n1(c.corte_anual_gwh, 0)} GWh`}
          </text>
        )
      })}
    </svg>
  )
}
