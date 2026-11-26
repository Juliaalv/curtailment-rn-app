import {
  Bar,
  CartesianGrid,
  ComposedChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Despacho } from './lib/cenarios'
import { n1 } from './formato'
import { useIdioma } from './i18n'
import { seriesDespacho, seriesSoc, type Serie } from './series'

const eixo = { fontSize: 12, fill: 'var(--muted)' }

export function Legenda({ series, linha }: { series: Serie[]; linha?: string }) {
  return (
    <div className="legenda">
      {series.map((s) => (
        <span key={s.chave}>
          <i style={{ background: s.cor }} />
          {s.nome}
        </span>
      ))}
      {linha && (
        <span>
          <i className="linha" />
          {linha}
        </span>
      )}
    </div>
  )
}

interface DicaProps {
  active?: boolean
  label?: string | number
  payload?: { dataKey?: string | number; value?: number }[]
  series: Serie[]
  titulo: (rotulo: string | number) => string
  unidade: string
}

function Dica({ active, label, payload, series, titulo, unidade }: DicaProps) {
  if (!active || !payload?.length || label === undefined) return null
  return (
    <div className="tooltip">
      <b>{titulo(label)}</b>
      {series.map((s) => {
        const v = payload.find((p) => p.dataKey === s.chave)?.value
        return v === undefined ? null : (
          <div key={s.chave}>
            <i style={{ background: s.cor }} />
            {s.nome}
            <span>
              {n1(v)} {unidade}
            </span>
          </div>
        )
      })}
    </div>
  )
}

interface Barras24hProps {
  dados: object[]
  series: Serie[]
  /** Altura da linha tracejada: a carga, ou a capacidade nominal no gráfico de SOC. */
  linha: number
  /** Topo do eixo y; sem ele o eixo se ajusta às barras. */
  yMax?: number
}

/** Barras empilhadas das 24 h do dia típico, com uma linha tracejada de referência. */
function Barras24h({ dados, series, linha, yMax }: Barras24hProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={dados} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis
          dataKey="hora"
          tick={eixo}
          tickLine={false}
          axisLine={{ stroke: 'var(--axis)' }}
          interval={1}
          tickFormatter={(h) => `${h}h`}
        />
        <YAxis
          tick={eixo}
          tickLine={false}
          axisLine={false}
          width={48}
          domain={yMax ? [0, yMax] : undefined}
          tickFormatter={(v) => n1(v, 0)}
        />
        <Tooltip
          cursor={{ fill: 'var(--accent-wash)' }}
          content={<Dica series={series} titulo={(h) => `${h}h – ${Number(h) + 1}h`} unidade="MWh" />}
        />
        {series.map((s) => (
          <Bar
            key={s.chave}
            dataKey={s.chave}
            stackId="a"
            fill={s.cor}
            stroke="var(--surface)"
            strokeWidth={1}
            maxBarSize={24}
            isAnimationActive={false}
          />
        ))}
        {linha > 0 && <ReferenceLine y={linha} stroke="var(--ink)" strokeDasharray="5 4" strokeWidth={1.5} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function GraficoDiaTipico(props: { solar: number[]; eolico: number[]; series: Serie[]; cargaMw: number }) {
  const dados = props.solar.map((s, hora) => ({ hora, solar: s, eolico: props.eolico[hora] }))
  return <Barras24h dados={dados} series={props.series} linha={props.cargaMw} />
}

export function GraficoDespacho({ despacho, cargaMw }: { despacho: Despacho; cargaMw: number }) {
  const { t } = useIdioma()
  const dados = despacho.direto.map((direto, hora) => ({
    hora,
    direto,
    descarrega: despacho.descarrega[hora],
    carrega: despacho.carrega[hora],
    sobra: despacho.sobra[hora],
  }))
  return <Barras24h dados={dados} series={seriesDespacho(t)} linha={cargaMw} />
}

/** Energia no banco hora a hora, sobre a capacidade nominal: a faixa de baixo é a reserva
 *  (1 − DoD) que nunca é descarregada; o que fica acima dela é a energia útil. */
export function GraficoSoc({ soc, energiaNominal, dod }: { soc: number[]; energiaNominal: number; dod: number }) {
  const { t } = useIdioma()
  const reserva = (1 - dod) * energiaNominal
  const dados = soc.map((util, hora) => ({ hora, reserva, util }))
  return <Barras24h dados={dados} series={seriesSoc(t)} linha={energiaNominal} yMax={energiaNominal} />
}
