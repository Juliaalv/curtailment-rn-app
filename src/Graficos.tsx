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
import { SERIES_DESPACHO, type Serie } from './series'

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

/** Barras empilhadas das 24 h do dia típico, com a linha tracejada da carga. */
function Barras24h({ dados, series, cargaMw }: { dados: object[]; series: Serie[]; cargaMw: number }) {
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
        <YAxis tick={eixo} tickLine={false} axisLine={false} width={48} tickFormatter={(v) => n1(v, 0)} />
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
        {cargaMw > 0 && <ReferenceLine y={cargaMw} stroke="var(--ink)" strokeDasharray="5 4" strokeWidth={1.5} />}
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export function GraficoDiaTipico(props: { solar: number[]; eolico: number[]; series: Serie[]; cargaMw: number }) {
  const dados = props.solar.map((s, hora) => ({ hora, solar: s, eolico: props.eolico[hora] }))
  return <Barras24h dados={dados} series={props.series} cargaMw={props.cargaMw} />
}

export function GraficoDespacho({ despacho, cargaMw }: { despacho: Despacho; cargaMw: number }) {
  const dados = despacho.direto.map((direto, hora) => ({
    hora,
    direto,
    descarrega: despacho.descarrega[hora],
    carrega: despacho.carrega[hora],
    sobra: despacho.sobra[hora],
  }))
  return <Barras24h dados={dados} series={SERIES_DESPACHO} cargaMw={cargaMw} />
}
