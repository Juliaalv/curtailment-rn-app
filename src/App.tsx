import { type CSSProperties, type KeyboardEvent, type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { n1, titulo } from './formato'
import { GraficoDespacho, GraficoDiaTipico, GraficoSoc, Legenda } from './Graficos'
import { DOD, aproveitamento, cenario, desempenhoReal, despachoDiaTipico } from './lib/cenarios'
import { type ClusterResumo, type Malhas, MapaBrasil, MapaEstado } from './Mapa'
import { type Idioma, setIdioma, useIdioma } from './i18n'
import { seriesDespacho, seriesFonte, seriesSoc } from './series'
import { NOME_UF, UF_DISPONIVEL } from './ufs'

interface Cluster extends ClusterResumo {
  dia_tipico_solar: number[]
  dia_tipico_eolico: number[]
  serie: number[]
}

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
  /** Resultado principal do cenário: leva o acento azul. */
  destaque?: boolean
}

function Tile({ rotulo, valor, unidade, nota, corte, destaque }: TileProps) {
  return (
    <div className="tile" data-corte={corte} data-destaque={destaque}>
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
  const { t } = useIdioma()
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
  /** Setas movem o alvo de 1 ponto (o passo de 0,1 é só para o arraste). */
  const teclarAlvo = (e: KeyboardEvent<HTMLInputElement>) => {
    const delta = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key]
    if (!delta) return
    e.preventDefault()
    setAlvo((a) => Math.min(100, Math.max(alvoMin, Math.round((a + delta) * 10) / 10)))
  }
  const c2 = useMemo(() => cenario(corte, cluster.serie, alvo, dod), [corte, cluster, alvo, dod])
  const despacho = useMemo(() => despachoDiaTipico(corte, c2.cargaMw, dod * c2.bessMwh), [corte, c2, dod])
  const niveis = useMemo(
    () =>
      Array.from({ length: N_NIVEIS }, (_, i) =>
        cenario(corte, cluster.serie, c1.tipico + ((100 - c1.tipico) * i) / (N_NIVEIS - 1), dod),
      ),
    [corte, cluster, c1, dod],
  )

  const series = seriesFonte(t).filter((s) => (s.chave === 'solar' ? cluster.n_solar : cluster.n_eolico) > 0)
  const usinas = [
    cluster.n_eolico > 0 && t.eolicas(cluster.n_eolico),
    cluster.n_solar > 0 && t.solares(cluster.n_solar),
  ].filter(Boolean)

  return (
    <article className="painel">
      <header className="cabecalho">
        <p className="eyebrow">Cluster · RN · 2025</p>
        <h1>{titulo(cluster.subestacao)}</h1>
        <p className="lede">
          Cluster {cluster.id} · {t.tipo[cluster.tipo]} · {usinas.join(t.e)}
        </p>
      </header>

      <div className="tiles">
        <Tile rotulo={t.energiaCortada} valor={n1(cluster.corte_anual_gwh)} unidade="GWh" corte />
        <Tile rotulo={t.corteDiaTipico} valor={n1(corteDia, 0)} unidade="MWh/dia" />
        <Tile rotulo={t.corteMedio} valor={n1(corteDia / 24)} unidade="MW" />
        <Tile rotulo={t.maiorHora} valor={n1(Math.max(...corte))} unidade="MW" />
      </div>

      <section className="secao">
        <h2>{t.c1Titulo}</h2>
        <p className="descricao">{t.c1Desc}</p>
        <div className="tiles">
          <Tile rotulo={t.cargaFixa} valor={n1(c1.p)} unidade="MW" />
          <Tile rotulo={t.aprovTipico} valor={n1(c1.tipico)} unidade="%" nota={t.tetoMetodo} />
          <Tile rotulo={t.aprovReal} valor={n1(c1.real)} unidade="%" nota={t.serieHoraria} />
        </div>
        {c1.p < 0.05 && (
          <p className="aviso">{t.c1Aviso}</p>
        )}
        <div className="cartao">
          <h3>{t.graficoTipico}</h3>
          <p className="subtitulo">{t.graficoTipicoSub}</p>
          <Legenda series={series.length > 1 ? series : []} linha={c1.p >= 0.05 ? t.cargaC1 : undefined} />
          <GraficoDiaTipico
            solar={cluster.dia_tipico_solar}
            eolico={cluster.dia_tipico_eolico}
            series={series}
            cargaMw={c1.p}
          />
        </div>
      </section>

      <section className="secao">
        <div className="c2-grid">
          <div className="c2-controles">
            <h2>{t.c2Titulo}</h2>
            <p className="descricao">{t.c2Desc(n1(dodPct, 0))}</p>

            <div className="alvo">
              <label htmlFor="alvo">{t.alvoRotulo}</label>
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
                  aria-valuetext={`${n1(alvo)}%`}
                  onKeyDown={teclarAlvo}
                  onChange={(e) => setAlvo(Number(e.target.value))}
                />
              </div>
              <div className="escala">
                <span>
                  {t.cenario1} ({n1(alvoMin)}%)
                </span>
                <span>100%</span>
              </div>
            </div>

            <div className="alvo">
              <label htmlFor="dod">{t.dodRotulo}</label>
              <output htmlFor="dod">{n1(dodPct, 0)}%</output>
              <div className="trilho" style={{ '--pct': fracaoDod(dodPct) } as CSSProperties}>
                <input
                  id="dod"
                  type="range"
                  min={DOD_MIN}
                  max={DOD_MAX}
                  step={5}
                  value={dodPct}
                  aria-valuetext={`${n1(dodPct, 0)}%`}
                  onChange={(e) => setDodPct(Number(e.target.value))}
                />
              </div>
              <div className="escala">
                <span>{DOD_MIN}%</span>
                <span>{DOD_MAX}%</span>
              </div>
            </div>

            <div className="tiles">
              <Tile rotulo={t.cargaFlat} valor={n1(c2.cargaMw)} unidade="MW" />
              <Tile rotulo={t.energiaBess} valor={n1(c2.bessMwh)} unidade="MWh" />
              <Tile rotulo={t.potenciaBess} valor={n1(c2.bessMw)} unidade="MW" />
              <Tile
                rotulo={t.aprovReal}
                valor={n1(c2.aproveitamentoRealPct)}
                unidade="%"
                nota={
                  alvo - c2.aproveitamentoRealPct >= 0.05
                    ? t.diferencaAlvo(n1(alvo - c2.aproveitamentoRealPct), n1(alvo))
                    : t.alvoNota(n1(alvo))
                }
                destaque
              />
            </div>

            <p className="aviso">{t.c2Aviso}</p>
          </div>

          <div className="c2-graficos">
            <div className="cartao">
              <h3>{t.graficoDespacho}</h3>
              <p className="subtitulo">{t.graficoDespachoSub}</p>
              <Legenda series={seriesDespacho(t)} linha={t.cargaFlat} />
              <GraficoDespacho despacho={despacho} cargaMw={c2.cargaMw} />
            </div>

            {c2.bessMwh > 0 && (
              <div className="cartao">
                <h3>{t.graficoSoc}</h3>
                <p className="subtitulo">{t.graficoSocSub(n1(c2.bessMw), n1(c2.bessMwh), n1(dodPct, 0))}</p>
                <Legenda series={seriesSoc(t)} linha={t.capNominal} />
                <GraficoSoc soc={despacho.soc} energiaNominal={c2.bessMwh} dod={dod} />
              </div>
            )}

            <div className="cartao">
              <h3>{t.niveis}</h3>
              <p className="subtitulo">{t.niveisSub}</p>
              <div className="rolagem">
                <table>
                  <thead>
                    <tr>
                      <th>{t.colAlvo}</th>
                      <th>{t.colCarga}</th>
                      <th>BESS (MWh)</th>
                      <th>BESS (MW)</th>
                      <th>{t.colAnoReal}</th>
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
                            aria-label={t.usarAlvo(n1(n.alvoPct))}
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
            </div>
          </div>
        </div>
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

/** JSON de public/data; rejeita quando a resposta não é 2xx. */
const carregar = <T,>(arquivo: string): Promise<T> =>
  fetch(`${import.meta.env.BASE_URL}data/${arquivo}`).then((r) => {
    if (!r.ok) throw new Error(`${r.status} ${arquivo}`)
    return r.json()
  })

/** No lugar do conteúdo quando os dados não chegam. */
function Erro({ onTentar }: { onTentar: () => void }) {
  const { t } = useIdioma()
  return (
    <div className="erro" role="alert">
      <p>{t.erroCarregar}</p>
      <button type="button" onClick={onTentar}>
        {t.tentarNovamente}
      </button>
    </div>
  )
}

const FONTE_ONS = 'https://dados.ons.org.br/dataset/restricao_coff_eolica_detail'

/** Cabeçalho e rodapé comuns: quem fala e de onde vêm os dados. */
function Moldura({ children }: { children: ReactNode }) {
  const { idioma, t } = useIdioma()
  return (
    <>
      <header className="site-header">
        <a className="marca" href="#/">
          Curtailment &amp; BESS <span>· Rio Grande do Norte</span>
        </a>
        <nav aria-label={t.secoes}>
          <a href={FONTE_ONS} target="_blank" rel="noreferrer">
            {t.dados}
          </a>
          <div className="idiomas" role="group" aria-label={t.idiomaRotulo}>
            {(['pt', 'en'] as Idioma[]).map((i) => (
              <button key={i} type="button" aria-pressed={idioma === i} onClick={() => setIdioma(i)}>
                {i.toUpperCase()}
              </button>
            ))}
          </div>
        </nav>
      </header>
      {children}
      <footer className="site-footer">
        <div className="site-footer-in">
          <p>
            <b>{t.fonte}</b> {t.fonteTexto}
            <a href={FONTE_ONS} target="_blank" rel="noreferrer">
              {t.portal}
            </a>
            {t.fonteFim}
          </p>
        </div>
      </footer>
    </>
  )
}

function Inicio({ malhas, clusters }: { malhas: Malhas; clusters: ClusterResumo[] }) {
  const { t } = useIdioma()
  const [destaque, setDestaque] = useState<string>()
  const total = clusters.reduce((a, c) => a + c.corte_anual_gwh, 0)
  const resumo = {
    24: {
      aria: t.ariaRN(clusters.length, n1(total, 0)),
      anotacao: `${n1(total, 0)} GWh`,
    },
  }
  const semDados = Object.keys(NOME_UF).length - Object.keys(UF_DISPONIVEL).length

  return (
    <main className="wrap">
      <div className="intro">
        <p className="eyebrow">Curtailment · SIN · 2025</p>
        <h1>{t.tituloInicio}</h1>
        <p className="lede">{t.ledeInicio}</p>

        <p className="bignum">
          {n1(total, 0)}
          <span className="unidade"> GWh</span>
          <small>{t.bignumNota(clusters.length)}</small>
        </p>

        <table className="states">
          <thead>
            <tr>
              <th>{t.estado}</th>
              <th className="num">Clusters</th>
              <th className="num">{t.gwhCortados}</th>
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
              <td>{t.outrosEstados(semDados)}</td>
              <td className="num">—</td>
              <td className="num">—</td>
            </tr>
          </tbody>
        </table>
        <p className="nota-tabela">{t.semDadosNota}</p>
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
            {t.comDados}
          </span>
          <span>
            <i className="hachura" />
            {t.semDados}
          </span>
        </div>
      </div>
    </main>
  )
}

function Estado({ malhas, clusters }: { malhas: Malhas; clusters: ClusterResumo[] }) {
  const { t } = useIdioma()
  const [destaque, setDestaque] = useState<string>()
  const total = clusters.reduce((a, c) => a + c.corte_anual_gwh, 0)

  const escolher = (c: string) => ir(`/rn/${c}`)

  return (
    <main className="wrap">
      <header className="intro-largo">
        <Trilha passos={[{ rotulo: t.brasil, href: '#/' }, { rotulo: 'Rio Grande do Norte' }]} />
        <p className="eyebrow">Curtailment · RN · 2025</p>
        <h1>Rio Grande do Norte</h1>
        <p className="lede">
          <b className="corte">{n1(total, 0)} GWh</b>
          {t.ledeEstado(clusters.length)}
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
            {t.tipo.eolico}
          </span>
          <span>
            <i className="bola" style={{ background: 'var(--c-solar)' }} />
            {t.tipo.solar}
          </span>
          <span>
            <i
              className="bola"
              style={{ background: 'linear-gradient(90deg, var(--c-eolico) 50%, var(--c-solar) 50%)' }}
            />
            {t.tipo.hibrido}
          </span>
          <span>{t.legendaArea}</span>
        </div>
      </div>

      <div className="lista-estado">
        <div className="lista-cab" aria-hidden="true">
          <span>Cluster</span>
          <span>{t.gwhCortados}</span>
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
                <span className="tipo">{t.tipo[c.tipo]}</span>
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
  const { t } = useIdioma()
  return (
    <nav className="trilha" aria-label={t.voceEsta}>
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
  const { t } = useIdioma()
  const bloco = (w: string, h: number, mt = 0) => (
    <div className="esqueleto" style={{ width: w, height: h, marginTop: mt }} />
  )
  if (variante === 'inicio')
    return (
      <main className="wrap" aria-busy="true" aria-label={t.carregando}>
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
    <div aria-busy="true" aria-label={t.carregando}>
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
  const { t } = useIdioma()
  const [cluster, setCluster] = useState<Cluster>()
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)

  useEffect(() => {
    window.scrollTo(0, 0)
    let atual = true
    carregar<Cluster>(`${id}.json`)
      .then((c) => atual && setCluster(c))
      .catch(() => atual && setErro(true))
    return () => {
      atual = false
    }
  }, [id, tentativa])

  const tentar = () => {
    setErro(false)
    setTentativa((n) => n + 1)
  }

  return (
    <main className="pagina">
      <Trilha
        passos={[
          { rotulo: t.brasil, href: '#/' },
          { rotulo: 'Rio Grande do Norte', href: '#/rn' },
          { rotulo: titulo(nome) },
        ]}
      />
      {erro ? (
        <Erro onTentar={tentar} />
      ) : cluster?.id === id ? (
        <Painel key={id} cluster={cluster} />
      ) : (
        <Esqueleto variante="cluster" />
      )}
    </main>
  )
}

export default function App() {
  const [clusters, setClusters] = useState<ClusterResumo[]>()
  const [malhas, setMalhas] = useState<Malhas>()
  const [erro, setErro] = useState(false)
  const [tentativa, setTentativa] = useState(0)
  const rota = useRota()

  useEffect(() => {
    Promise.all([carregar<ClusterResumo[]>('clusters.json'), carregar<Malhas>('mapa.json')])
      .then(([lista, m]) => {
        setClusters(lista.sort((a, b) => b.corte_anual_gwh - a.corte_anual_gwh))
        setMalhas(m)
      })
      .catch(() => setErro(true))
  }, [tentativa])

  if (erro)
    return (
      <Moldura>
        <main className="pagina">
          <Erro
            onTentar={() => {
              setErro(false)
              setTentativa((n) => n + 1)
            }}
          />
        </main>
      </Moldura>
    )
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
