import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { n1, titulo } from './formato'
import { GraficoCurvaBess, GraficoDespacho, GraficoDiaTipico, Legenda } from './Graficos'
import { aproveitamento, cenario, desempenhoReal, despachoDiaTipico } from './lib/cenarios'
import { type ClusterResumo, type Malhas, MapaBrasil, MapaEstado, type Tipo } from './Mapa'
import { SERIES_DESPACHO, SERIES_FONTE } from './series'

interface Cluster extends ClusterResumo {
  dia_tipico_solar: number[]
  dia_tipico_eolico: number[]
  serie: number[]
}

const NOME_TIPO: Record<Tipo, string> = { hibrido: 'Solar + eólico', solar: 'Solar', eolico: 'Eólico' }
const N_NIVEIS = 8

interface TileProps {
  rotulo: string
  valor: string
  unidade?: string
  nota?: string
  /** Valor de energia cortada: leva o acento âmbar. */
  corte?: boolean
}

function Tile({ rotulo, valor, unidade, nota, corte }: TileProps) {
  return (
    <div className="tile" data-corte={corte}>
      <div className="rotulo">{rotulo}</div>
      <div className="valor">
        {valor}
        {unidade && <small>{unidade}</small>}
      </div>
      {nota && <div className="nota">{nota}</div>}
    </div>
  )
}

function Painel({ cluster }: { cluster: Cluster }) {
  const corte = useMemo(
    () => cluster.dia_tipico_solar.map((s, h) => s + cluster.dia_tipico_eolico[h]),
    [cluster],
  )
  const corteDia = corte.reduce((a, b) => a + b, 0)

  // Cenário 1: carga na menor barra do dia típico, sem BESS.
  const c1 = useMemo(() => {
    const p = Math.min(...corte)
    return { p, tipico: aproveitamento(corte, p), real: desempenhoReal(cluster.serie, p, 0) }
  }, [corte, cluster])

  // Cenário 2: o alvo vai do Cenário 1 a 100% do corte do dia típico.
  const alvoMin = Math.ceil(c1.tipico * 10) / 10
  const [alvo, setAlvo] = useState(() => Math.round((alvoMin + 100) / 2))
  const c2 = useMemo(() => cenario(corte, cluster.serie, alvo), [corte, cluster, alvo])
  const despacho = useMemo(() => despachoDiaTipico(corte, c2.cargaMw, c2.bessMwh), [corte, c2])
  const niveis = useMemo(
    () =>
      Array.from({ length: N_NIVEIS }, (_, i) =>
        cenario(corte, cluster.serie, c1.tipico + ((100 - c1.tipico) * i) / (N_NIVEIS - 1)),
      ),
    [corte, cluster, c1],
  )
  const curva = useMemo(
    () => Array.from({ length: 41 }, (_, i) => cenario(corte, [], c1.tipico + ((100 - c1.tipico) * i) / 40)),
    [corte, c1],
  )

  const series = SERIES_FONTE.filter((s) => (s.chave === 'solar' ? cluster.n_solar : cluster.n_eolico) > 0)
  const usinas = [
    cluster.n_eolico > 0 && `${cluster.n_eolico} eólicas`,
    cluster.n_solar > 0 && `${cluster.n_solar} solares`,
  ].filter(Boolean)

  return (
    <article className="painel">
      <header className="cabecalho">
        <p className="eyebrow">Cluster · RN · 2025</p>
        <h2>{titulo(cluster.subestacao)}</h2>
        <p className="lede">
          Cluster {cluster.id} · {NOME_TIPO[cluster.tipo]} · {usinas.join(' e ')}
        </p>
      </header>

      <div className="tiles">
        <Tile rotulo="Energia cortada em 2025" valor={n1(cluster.corte_anual_gwh)} unidade="GWh" corte />
        <Tile rotulo="Corte no dia típico" valor={n1(corteDia, 0)} unidade="MWh/dia" />
        <Tile rotulo="Corte médio" valor={n1(corteDia / 24)} unidade="MW" />
        <Tile rotulo="Maior hora do dia típico" valor={n1(Math.max(...corte))} unidade="MW" />
      </div>

      <section className="secao">
        <h3>Cenário 1 — carga fixa, sem bateria</h3>
        <p className="descricao">
          A carga é igual à menor barra de energia cortada do dia típico. Nenhuma hora do dia típico fica em
          déficit, então não é preciso armazenamento.
        </p>
        <div className="tiles">
          <Tile rotulo="Carga fixa" valor={n1(c1.p)} unidade="MW" />
          <Tile rotulo="Aproveitamento no dia típico" valor={n1(c1.tipico)} unidade="%" nota="teto do método" />
          <Tile rotulo="Aproveitamento no ano real" valor={n1(c1.real)} unidade="%" nota="série horária de 2025" />
        </div>
        {c1.p < 0.05 && (
          <p className="aviso">
            Neste cluster há horas do dia típico praticamente sem corte, então a menor barra é zero: sem bateria
            não existe carga fixa que possa ser atendida só com a energia cortada.
          </p>
        )}
        <div className="cartao">
          <h4>Energia cortada no dia típico</h4>
          <p className="subtitulo">MWh por hora, média dos 365 dias de 2025</p>
          <Legenda series={series.length > 1 ? series : []} linha={c1.p >= 0.05 ? 'Carga do Cenário 1' : undefined} />
          <GraficoDiaTipico
            solar={cluster.dia_tipico_solar}
            eolico={cluster.dia_tipico_eolico}
            series={series}
            cargaMw={c1.p}
          />
        </div>
      </section>

      <section className="secao">
        <h3>Cenário 2 — carga maior com BESS de 4 h</h3>
        <p className="descricao">
          A carga sobe acima do Cenário 1 e a bateria cobre as horas em que o corte não basta. O banco é sempre
          de 4 h: a potência é a maior entre o pior déficit de uma hora e a energia mínima dividida por 4.
        </p>

        <div className="alvo">
          <label htmlFor="alvo">Alvo de aproveitamento do corte do dia típico</label>
          <output htmlFor="alvo">{n1(alvo)}%</output>
          <input
            id="alvo"
            type="range"
            min={alvoMin}
            max={100}
            step={0.1}
            value={alvo}
            onChange={(e) => setAlvo(Number(e.target.value))}
          />
          <div className="escala">
            <span>Cenário 1 ({n1(alvoMin)}%)</span>
            <span>100%</span>
          </div>
        </div>

        <div className="tiles">
          <Tile rotulo="Carga flat" valor={n1(c2.cargaMw)} unidade="MW" />
          <Tile rotulo="Energia do BESS" valor={n1(c2.bessMwh)} unidade="MWh" />
          <Tile rotulo="Potência do BESS" valor={n1(c2.bessMw)} unidade="MW" />
          <Tile
            rotulo="Aproveitamento no ano real"
            valor={n1(c2.aproveitamentoRealPct)}
            unidade="%"
            nota={`alvo no dia típico: ${n1(alvo)}%`}
          />
        </div>

        <div className="cartao">
          <h4>Para onde vai cada MWh cortado no dia típico</h4>
          <p className="subtitulo">MWh por hora, com a carga e o BESS do alvo escolhido</p>
          <Legenda series={SERIES_DESPACHO} linha="Carga flat" />
          <GraficoDespacho despacho={despacho} cargaMw={c2.cargaMw} />
        </div>

        <div className="cartao">
          <h4>Capacidade do BESS conforme o alvo</h4>
          <p className="subtitulo">MWh de um banco de 4 h; o ponto marca o alvo escolhido</p>
          <GraficoCurvaBess curva={curva} atual={c2} />
        </div>

        <div className="cartao">
          <h4>Níveis do Cenário 2</h4>
          <p className="subtitulo">Do Cenário 1 a 100%; clique em uma linha para usar o alvo</p>
          <table>
            <thead>
              <tr>
                <th>Alvo no dia típico (%)</th>
                <th>Carga flat (MW)</th>
                <th>BESS (MWh)</th>
                <th>BESS (MW)</th>
                <th>Ano real (%)</th>
              </tr>
            </thead>
            <tbody>
              {niveis.map((n) => (
                <tr key={n.alvoPct} onClick={() => setAlvo(Math.max(alvoMin, Math.round(n.alvoPct * 10) / 10))}>
                  <td>{n1(n.alvoPct)}</td>
                  <td>{n1(n.cargaMw)}</td>
                  <td>{n1(n.bessMwh)}</td>
                  <td>{n1(n.bessMw)}</td>
                  <td>{n1(n.aproveitamentoRealPct)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="aviso">
          O dia típico é a média dos dias do ano e serve para dimensionar. O aproveitamento que ele indica é um
          teto: a coluna do ano real mede o que a mesma carga e a mesma bateria entregam na série horária de
          2025, com bateria ideal e a carga parando quando falta energia.
        </p>
      </section>
    </article>
  )
}

const ouvirHash = (f: () => void) => {
  window.addEventListener('hashchange', f)
  return () => window.removeEventListener('hashchange', f)
}

/** Rota no hash: "" (Brasil), "#/rn" (estado) ou "#/rn/RNSDM_0" (cluster). */
function useRota() {
  const hash = useSyncExternalStore(ouvirHash, () => window.location.hash)
  const [estado, cluster] = hash.replace(/^#\/?/, '').split('/')
  return { estado: estado || undefined, cluster: cluster || undefined }
}

const ir = (rota: string) => {
  window.location.hash = rota
}

const FONTE_ONS = 'https://dados.ons.org.br/dataset/restricao_coff_eolica_detail'

/** Cabeçalho e rodapé comuns: quem fala e de onde vêm os dados. */
function Moldura({ children }: { children: ReactNode }) {
  return (
    <>
      <header className="site-header">
        <nav aria-label="Seções">
          <a href={FONTE_ONS} target="_blank" rel="noreferrer">
            Dados
          </a>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="site-footer-in">
          <p>
            <b>Fonte:</b> ONS — Dados de Restrição de Operação por Constrained-off de Usinas Eólicas e Fotovoltaicas (
            <a href={FONTE_ONS} target="_blank" rel="noreferrer">
              Portal de Dados Abertos
            </a>
            ), apuração 2025. Elaboração própria.
          </p>
        </div>
      </footer>
    </>
  )
}

function Inicio({ malhas, clusters }: { malhas: Malhas; clusters: ClusterResumo[] }) {
  const [destaque, setDestaque] = useState<string>()
  const total = clusters.reduce((a, c) => a + c.corte_anual_gwh, 0)
  const resumo = {
    24: {
      aria: `Rio Grande do Norte, ${clusters.length} clusters, ${n1(total, 0)} GWh cortados`,
      anotacao: `${n1(total, 0)} GWh`,
    },
  }

  return (
    <main className="wrap">
      <div className="intro">
        <p className="eyebrow">Curtailment · SIN · 2025</p>
        <h1>Curtailment de energia renovável</h1>
        <p className="lede">
          Cenários de carga e BESS para aproveitar a energia cortada, por cluster de usinas. Escolha um estado.
        </p>

      </div>

      <div className="map">
        <MapaBrasil
          malhas={malhas}
          resumo={resumo}
          destaque={destaque}
          onDestaque={setDestaque}
          onEscolher={(rota) => ir(`/${rota}`)}
        />
        <div className="legenda">
          <span>
            <i style={{ background: 'var(--primary)' }} />
            Com dados
          </span>
          <span>
            <i className="hachura" />
            Sem dados processados
          </span>
        </div>
      </div>
    </main>
  )
}

function Estado({ malhas, clusters }: { malhas: Malhas; clusters: ClusterResumo[] }) {
  const [destaque, setDestaque] = useState<string>()
  const total = clusters.reduce((a, c) => a + c.corte_anual_gwh, 0)

  const escolher = (c: string) => ir(`/rn/${c}`)

  return (
    <main className="wrap">
      <header className="intro-largo">
        <a className="voltar" href="#/">
          ← Brasil
        </a>
        <p className="eyebrow">Curtailment · RN · 2025</p>
        <h1>Rio Grande do Norte</h1>
        <p className="lede">
          <b className="corte">{n1(total, 0)} GWh</b> cortados em 2025 em {clusters.length} clusters de usinas.
          Selecione um cluster no mapa ou na tabela.
        </p>
      </header>

      <div className="map-estado">
        <MapaEstado
          malhas={malhas}
          clusters={clusters}
          destaque={destaque}
          onDestaque={setDestaque}
          onEscolher={escolher}
        />
        <div className="legenda">
          <span>
            <i className="bola" style={{ background: 'var(--c-eolico)' }} />
            Eólico
          </span>
          <span>
            <i className="bola" style={{ background: 'var(--c-solar)' }} />
            Solar
          </span>
          <span>
            <i
              className="bola"
              style={{ background: 'linear-gradient(90deg, var(--c-eolico) 50%, var(--c-solar) 50%)' }}
            />
            Solar + eólico
          </span>
          <span>Área do círculo: energia cortada em 2025 · pontos: usinas</span>
        </div>
      </div>

      <div className="lista-estado">
        <div className="lista-cab" aria-hidden="true">
          <span>Cluster</span>
          <span>GWh cortados</span>
        </div>
        <ul className="lista">
          {clusters.map((c) => (
            <li key={c.id}>
              <button
                className="item"
                data-destaque={c.id === destaque}
                onClick={() => escolher(c.id)}
                onMouseEnter={() => setDestaque(c.id)}
                onMouseLeave={() => setDestaque(undefined)}
                onFocus={() => setDestaque(c.id)}
                onBlur={() => setDestaque(undefined)}
              >
                <span className="nome">{titulo(c.subestacao)}</span>
                <span className="tipo">{NOME_TIPO[c.tipo]}</span>
                <span className="gwh">{n1(c.corte_anual_gwh, 0)}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}

/** Página só do cluster: as informações, com a volta para o mapa do estado. */
function PaginaCluster({ id }: { id: string }) {
  const [cluster, setCluster] = useState<Cluster>()

  useEffect(() => {
    window.scrollTo(0, 0)
    let atual = true
    fetch(`/data/${id}.json`)
      .then((r) => r.json())
      .then((c: Cluster) => atual && setCluster(c))
    return () => {
      atual = false
    }
  }, [id])

  return (
    <main className="pagina">
      <a className="voltar" href="#/rn">
        ← Rio Grande do Norte
      </a>
      {cluster?.id === id && <Painel key={id} cluster={cluster} />}
    </main>
  )
}

export default function App() {
  const [clusters, setClusters] = useState<ClusterResumo[]>()
  const [malhas, setMalhas] = useState<Malhas>()
  const rota = useRota()

  useEffect(() => {
    fetch('/data/clusters.json')
      .then((r) => r.json())
      .then((lista: ClusterResumo[]) => setClusters(lista.sort((a, b) => b.corte_anual_gwh - a.corte_anual_gwh)))
    fetch('/data/mapa.json')
      .then((r) => r.json())
      .then(setMalhas)
  }, [])

  if (!clusters || !malhas) return null
  let pagina
  if (rota.estado !== 'rn') pagina = <Inicio malhas={malhas} clusters={clusters} />
  else if (rota.cluster && clusters.some((c) => c.id === rota.cluster)) pagina = <PaginaCluster id={rota.cluster} />
  else pagina = <Estado malhas={malhas} clusters={clusters} />
  return <Moldura>{pagina}</Moldura>
}
