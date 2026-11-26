import { type CSSProperties, type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { n1, titulo } from './formato'
import { GraficoDespacho, GraficoDiaTipico, Legenda } from './Graficos'
import { DOD, aproveitamento, cenario, desempenhoReal, despachoDiaTipico } from './lib/cenarios'
import { type ClusterResumo, type Malhas, MapaBrasil, MapaEstado, type Tipo } from './Mapa'
import { SERIES_DESPACHO, SERIES_FONTE } from './series'
import { NOME_UF, UF_DISPONIVEL } from './ufs'

interface Cluster extends ClusterResumo {
  dia_tipico_solar: number[]
  dia_tipico_eolico: number[]
  serie: number[]
}

const NOME_TIPO: Record<Tipo, string> = { hibrido: 'Solar + eólico', solar: 'Solar', eolico: 'Eólico' }
const N_NIVEIS = 8
const DOD_MIN = 50
const DOD_MAX = 100

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
  /** Posição de um alvo no trilho do slider, de 0 a 1. */
  const fracao = (v: number) => Math.min(1, Math.max(0, (v - alvoMin) / Math.max(100 - alvoMin, 0.1)))
  // Profundidade de descarga (%): quanto da capacidade nominal do BESS é útil.
  const [dodPct, setDodPct] = useState(DOD * 100)
  const dod = dodPct / 100
  const fracaoDod = (v: number) => (v - DOD_MIN) / (DOD_MAX - DOD_MIN)
  const c2 = useMemo(() => cenario(corte, cluster.serie, alvo, dod), [corte, cluster, alvo, dod])
  const despacho = useMemo(() => despachoDiaTipico(corte, c2.cargaMw, dod * c2.bessMwh), [corte, c2, dod])
  const niveis = useMemo(
    () =>
      Array.from({ length: N_NIVEIS }, (_, i) =>
        cenario(corte, cluster.serie, c1.tipico + ((100 - c1.tipico) * i) / (N_NIVEIS - 1), dod),
      ),
    [corte, cluster, c1, dod],
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
          de 4 h: a potência é a maior entre o pior déficit de uma hora e a energia mínima dividida por 4 × DoD.
          A capacidade mostrada é a nominal; com profundidade de descarga de {n1(dodPct, 0)}%, só{' '}
          {n1(dodPct, 0)}% dela é útil.
        </p>

        <div className="alvo">
          <label htmlFor="alvo">Alvo de aproveitamento do corte do dia típico</label>
          <output htmlFor="alvo">{n1(alvo)}%</output>
          <div className="trilho" style={{ '--pct': fracao(alvo) } as CSSProperties}>
            <div className="marcas" aria-hidden="true">
              {niveis.map((n) => (
                <i
                  key={n.alvoPct}
                  data-passou={n.alvoPct <= alvo}
                  style={{ '--pct': fracao(n.alvoPct) } as CSSProperties}
                />
              ))}
            </div>
            <input
              id="alvo"
              type="range"
              min={alvoMin}
              max={100}
              step={0.1}
              value={alvo}
              onChange={(e) => setAlvo(Number(e.target.value))}
            />
          </div>
          <div className="escala">
            <span>Cenário 1 ({n1(alvoMin)}%)</span>
            <span>100%</span>
          </div>
        </div>

        <div className="alvo">
          <label htmlFor="dod">Profundidade de descarga (DoD) do BESS</label>
          <output htmlFor="dod">{n1(dodPct, 0)}%</output>
          <div className="trilho" style={{ '--pct': fracaoDod(dodPct) } as CSSProperties}>
            <input
              id="dod"
              type="range"
              min={DOD_MIN}
              max={DOD_MAX}
              step={5}
              value={dodPct}
              onChange={(e) => setDodPct(Number(e.target.value))}
            />
          </div>
          <div className="escala">
            <span>{DOD_MIN}%</span>
            <span>{DOD_MAX}%</span>
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
              {niveis.map((n) => {
                const usar = () => setAlvo(Math.max(alvoMin, Math.round(n.alvoPct * 10) / 10))
                const ativo = Math.abs(n.alvoPct - alvo) < 0.1
                return (
                <tr key={n.alvoPct} data-ativo={ativo} onClick={usar}>
                  <td className="rotulo-linha">
                    <button
                      type="button"
                      aria-pressed={ativo}
                      aria-label={`Usar alvo de ${n1(n.alvoPct)}%`}
                      onClick={(e) => {
                        e.stopPropagation()
                        usar()
                      }}
                    >
                      {n1(n.alvoPct)}
                    </button>
                  </td>
                  <td>{n1(n.cargaMw)}</td>
                  <td>{n1(n.bessMwh)}</td>
                  <td>{n1(n.bessMw)}</td>
                  <td>{n1(n.aproveitamentoRealPct)}</td>
                </tr>
                )
              })}
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
        <a className="marca" href="#/">
          Curtailment &amp; BESS <span>· Rio Grande do Norte</span>
        </a>
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
  const semDados = Object.keys(NOME_UF).length - Object.keys(UF_DISPONIVEL).length

  return (
    <main className="wrap">
      <div className="intro">
        <p className="eyebrow">Curtailment · SIN · 2025</p>
        <h1>Curtailment de energia renovável</h1>
        <p className="lede">
          Cenários de carga e BESS para aproveitar a energia cortada, por cluster de usinas. Escolha um estado.
        </p>

        <p className="bignum">
          {n1(total, 0)}
          <span className="unidade"> GWh</span>
          <small>
            cortados em 2025 no Rio Grande do Norte · {clusters.length} clusters
          </small>
        </p>

        <table className="states">
          <thead>
            <tr>
              <th>Estado</th>
              <th className="num">Clusters</th>
              <th className="num">GWh cortados</th>
            </tr>
          </thead>
          <tbody>
            <tr
              data-uf="24"
              data-ativo={destaque === '24'}
              onClick={() => ir('/rn')}
              onMouseEnter={() => setDestaque('24')}
              onMouseLeave={() => setDestaque(undefined)}
            >
              <td>
                <a
                  href="#/rn"
                  onFocus={() => setDestaque('24')}
                  onBlur={() => setDestaque(undefined)}
                >
                  {NOME_UF[24]}
                </a>
              </td>
              <td className="num">{clusters.length}</td>
              <td className="num corte">{n1(total, 0)}</td>
            </tr>
            <tr className="nodata">
              <td>Outros {semDados} estados</td>
              <td className="num">—</td>
              <td className="num">—</td>
            </tr>
          </tbody>
        </table>
        <p className="nota-tabela">Os demais estados ainda não têm dados processados.</p>
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
        <Trilha passos={[{ rotulo: 'Brasil', href: '#/' }, { rotulo: 'Rio Grande do Norte' }]} />
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

/** Trilha de navegação: os passos com href são links; o último é a página atual. */
function Trilha({ passos }: { passos: { rotulo: string; href?: string }[] }) {
  return (
    <nav className="trilha" aria-label="Você está em">
      <ol>
        {passos.map((p) => (
          <li key={p.rotulo}>
            {p.href ? <a href={p.href}>{p.rotulo}</a> : <span aria-current="page">{p.rotulo}</span>}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** Blocos cinza no lugar do conteúdo enquanto os dados carregam. */
function Esqueleto({ variante }: { variante: 'inicio' | 'cluster' }) {
  const bloco = (w: string, h: number, mt = 0) => (
    <div className="esqueleto" style={{ width: w, height: h, marginTop: mt }} />
  )
  if (variante === 'inicio')
    return (
      <main className="wrap" aria-busy="true" aria-label="Carregando">
        <div className="intro">
          {bloco('40%', 14)}
          {bloco('90%', 44, 16)}
          {bloco('100%', 16, 16)}
          {bloco('80%', 16, 8)}
          {bloco('70%', 64, 32)}
          {bloco('100%', 120, 40)}
        </div>
        <div className="map">{bloco('100%', 480)}</div>
      </main>
    )
  return (
    <div aria-busy="true" aria-label="Carregando">
      {bloco('20%', 14)}
      {bloco('50%', 44, 16)}
      {bloco('35%', 16, 16)}
      <div className="tiles">
        {[0, 1, 2, 3].map((i) => (
          <div key={i}>
            {bloco('60%', 13)}
            {bloco('80%', 32, 8)}
          </div>
        ))}
      </div>
      {bloco('100%', 300, 64)}
    </div>
  )
}

/** Página só do cluster: as informações, com a trilha de volta para o mapa do estado. */
function PaginaCluster({ id, nome }: { id: string; nome: string }) {
  const [cluster, setCluster] = useState<Cluster>()

  useEffect(() => {
    window.scrollTo(0, 0)
    let atual = true
    fetch(`${import.meta.env.BASE_URL}data/${id}.json`)
      .then((r) => r.json())
      .then((c: Cluster) => atual && setCluster(c))
    return () => {
      atual = false
    }
  }, [id])

  return (
    <main className="pagina">
      <Trilha
        passos={[
          { rotulo: 'Brasil', href: '#/' },
          { rotulo: 'Rio Grande do Norte', href: '#/rn' },
          { rotulo: titulo(nome) },
        ]}
      />
      {cluster?.id === id ? <Painel key={id} cluster={cluster} /> : <Esqueleto variante="cluster" />}
    </main>
  )
}

export default function App() {
  const [clusters, setClusters] = useState<ClusterResumo[]>()
  const [malhas, setMalhas] = useState<Malhas>()
  const rota = useRota()

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/clusters.json`)
      .then((r) => r.json())
      .then((lista: ClusterResumo[]) => setClusters(lista.sort((a, b) => b.corte_anual_gwh - a.corte_anual_gwh)))
    fetch(`${import.meta.env.BASE_URL}data/mapa.json`)
      .then((r) => r.json())
      .then(setMalhas)
  }, [])

  if (!clusters || !malhas)
    return (
      <Moldura>
        <Esqueleto variante="inicio" />
      </Moldura>
    )
  const escolhido = rota.cluster ? clusters.find((c) => c.id === rota.cluster) : undefined
  let pagina
  if (rota.estado !== 'rn') pagina = <Inicio key="inicio" malhas={malhas} clusters={clusters} />
  else if (escolhido) pagina = <PaginaCluster key={escolhido.id} id={escolhido.id} nome={escolhido.subestacao} />
  else pagina = <Estado key="rn" malhas={malhas} clusters={clusters} />
  return <Moldura>{pagina}</Moldura>
}
