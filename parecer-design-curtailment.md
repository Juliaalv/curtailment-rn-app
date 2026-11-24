# Parecer de design: "Curtailment de energia renovável" — como profissionalizar sem cards

A tela parece amadora não pela falta de enfeites, mas porque nada nela está ancorado: o mapa flutua sem relação com o texto, o branco puro e o cinza puro deixam tudo sem temperatura, e a única cor (o azul do RN) não faz parte de nenhum sistema. A solução é estrutural e tipográfica: um grid em duas colunas, uma paleta azul com neutros levemente azulados e um acento âmbar para "energia cortada", tipografia com números tabulares, linhas finas, cabeçalho e rodapé com a fonte dos dados. Tudo plano, sem cards.

## TL;DR

- **Diagnóstico:** o problema é de *ancoragem e sistema*, não de decoração. Hoje faltam grid, moldura institucional (cabeçalho e rodapé), uma paleta de verdade e contraste entre o mapa e o fundo. Por isso a página lê como protótipo.
- **Maior impacto, menor esforço:** (1) colocar texto à esquerda e mapa à direita num grid de 12 colunas; (2) trocar `#FFF` e cinzas neutros por um off-white azulado (`#F6F8FB`) e uma tinta azul-escura (`#0B1F33`); (3) azul primário `#1351B4` para o que é clicável e âmbar `#D97706` só para "GWh cortados"; (4) transformar "14.214 GWh" num número grande tipográfico; (5) cabeçalho fino e rodapé com "Fonte: ONS — constrained-off".
- **Referências que já fazem isso sem cards:** Our World in Data (masthead azul, serifada nos títulos, hachura para "sem dados"), Datawrapper (cinza para sem dados, cor só no que importa), GOV.UK e o Padrão Digital de Governo gov.br (planos, tipográficos, azul institucional), Carbon Brief (mapa + texto editorial). Com elas dá para montar três direções: editorial claro, técnico-institucional azul e sala de controle escura.

## Diagnóstico (o que hoje tira o profissionalismo)

1. **O layout não tem esqueleto.** O título fica no topo, o mapa no centro e a lista no canto inferior esquerdo, mas os três não se alinham a colunas comuns. O lado direito inteiro fica vazio e o espaço entre o subtítulo e a lista também. Esse branco não é "respiro intencional"; é sobra, e o olho percebe a diferença.
2. **Falta moldura institucional.** Sem cabeçalho, sem nome do projeto ou instituição e sem rodapé com fonte e metodologia, a página não diz *quem fala* nem *de onde vêm os dados*. Para público técnico do setor elétrico, isso pesa mais do que qualquer cor.
3. **O mapa some no fundo.** Estados quase brancos com borda branca sobre fundo branco não têm relação figura-fundo. O guia de cartografia da Axis Maps lembra que a hierarquia visual do mapa deve seguir a hierarquia intelectual: o que importa precisa saltar, e o contexto precisa estar presente mas recuado. Hoje o contexto (o Brasil) quase desaparece e o destaque (RN) não tem com o que contrastar.
4. **A cor não é um sistema.** Um azul solto, preto puro e cinza neutro. Lisa Charlotte Muth recomenda definir cinzas com "um toque de cor" e harmonizá-los com o fundo. No guia "A detailed guide to colors in data vis style guides" (Datawrapper Blog, 30 mar. 2022), ela registra que um cinza normal "looks off on the pink FT background" e que, por isso, o Financial Times adotou "a beige-ish gray for unhighlighted or missing data". Ali também é citada Caroline Nevitt, editora de experiência do usuário do FT: "Our pink background reduces the limits of lightness our colors can have."
5. **A hierarquia depende só do tamanho da fonte.** O dado mais forte da página ("14.214 GWh cortados em 2025") está em corpo pequeno, cinza, dentro de uma linha de texto. É o número que vende o trabalho e está escondido.
6. **A fonte é a do sistema.** Segoe UI e similares variam de máquina para máquina e passam a sensação de "não estilizado".

## Recomendações priorizadas

### 1. Reorganizar em duas colunas assimétricas (impacto alto, esforço baixo)

- **Grid de 12 colunas, largura máxima de ~1200 px.** Coluna de texto com 5 colunas à esquerda e mapa com 7 colunas à direita, alinhados pelo topo. O mapa passa a "pertencer" ao texto.
- **Ordem da coluna esquerda:**
  1. *Eyebrow* em caixa alta pequena ("CURTAILMENT · SIN · 2025").
  2. Título.
  3. Subtítulo com no máximo ~60–70 caracteres por linha.
  4. **Número grande**: "14.214 GWh" em 56–72 px, peso 600, em âmbar escuro, com a legenda abaixo em corpo pequeno ("cortados em 2025 no Rio Grande do Norte · 30 clusters").
  5. A lista "Estados disponíveis" como **tabela editorial**: uma linha por estado, colunas Estado | Clusters | GWh cortados, números alinhados à direita, hairlines entre as linhas. Os estados sem dados aparecem na mesma tabela, em cinza, com "—".
- **No mapa**, o rótulo do RN entra como anotação direta ("Rio Grande do Norte — 14.214 GWh") com linha-guia na cor da tinta, não em cinza fraco.
- **Ponte entre lista e mapa:** passar o mouse numa linha da tabela destaca o estado no mapa, e vice-versa. Isso substitui com vantagem qualquer card.

### 2. Paleta azul com neutros tingidos e um acento (impacto alto, esforço baixo)

Partindo do azul institucional do Padrão Digital de Governo (`#1351B4`), que tem contraste de cerca de 7:1 sobre branco e é familiar ao setor público brasileiro:

| Papel | Hex | Uso |
|---|---|---|
| Papel (fundo) | `#F6F8FB` | fundo da página, off-white azulado |
| Faixa | `#EAF0F7` | faixas full-bleed (cabeçalho/rodapé/seção) |
| Tinta | `#0B1F33` | títulos e texto principal (no lugar do preto puro) |
| Tinta 2 | `#4A5B6E` | subtítulos, legendas (~6,5:1 sobre o papel) |
| Hairline | `#D5DDE6` | linhas divisórias |
| Terra sem dados | `#E3E9F0` | estados sem dados no mapa |
| Contorno | `#FFFFFF` ou `#C9D3DE` | bordas entre estados |
| **Primária** | `#1351B4` | estados com dados, links, foco |
| Primária escura | `#0C326F` | hover/selecionado, faixa do cabeçalho |
| **Acento — energia cortada** | `#D97706` (gráfico) / `#B45309` (texto) | GWh cortados, curtailment |
| Eólica | `#0E7C86` | séries eólicas |
| Solar | `#E3A008` | séries solares |
| BESS | `#6741D9` | baterias/armazenamento |

- **Escala sequencial para quando houver mais estados:** ColorBrewer *Blues* de 5 classes, `#EFF3FF #BDD7E7 #6BAED6 #3182BD #08519C`. As sequenciais de matiz única do ColorBrewer são seguras para daltonismo porque a diferença é de luminosidade, e não só de matiz. O guia da Axis Maps também recomenda que a ponta mais chamativa da rampa represente o valor mais "importante" (aqui, mais GWh cortados).
- **Regra de uso:** o azul diz "isto tem dados ou é clicável"; o âmbar diz "isto é energia perdida". Não use o âmbar em mais nada. Muth formula o princípio no artigo "Emphasize what you want readers to see with color" (Datawrapper Blog), numa seção intitulada "Make everything gray except what's important", e o justifica assim: "Color is our most powerful tool to control where the reader looks."
- **Contraste (WCAG 2.1 AA):** texto normal precisa de 4,5:1 e texto grande de 3:1. Pelo critério 1.4.11, objetos gráficos necessários à compreensão e componentes de interface (como um estado clicável ou o anel de foco) precisam de 3:1 contra as cores adjacentes. O âmbar `#D97706` serve para preenchimentos e números muito grandes; para texto corrido, use `#B45309`.
- **Ferramentas:** ColorBrewer (colorbrewer2.org) para as escalas; Adobe Leonardo (leonardocolor.io), que gera cores a partir de uma *razão de contraste alvo*, o que é ideal para derivar os tons de tinta e hairline do azul; um picker OKLCH (atmos.style/playground, oklch.net), em que passos iguais de luminosidade parecem iguais ao olho, para criar rampas do azul sem "desbotar". Teste também com simulação de daltonismo (Viz Palette ou o próprio Leonardo).

### 3. Tratamento do mapa (impacto alto, esforço médio)

- **Sem dados:** use preenchimento `#E3E9F0` com contorno branco de 0,75–1 px, que fica visível sobre o papel `#F6F8FB`. A convenção do Datawrapper é cinza para "sem dados"; o Our World in Data usa **hachura** (um padrão SVG) para "No data" e um listrado diferente para "não aplicável". Para você, a hachura fina é uma boa opção, porque comunica "ainda não processado" e não "zero".
- **Com dados:** preenchimento `#1351B4`. No hover, `#0C326F` e cursor de mão. Estados sem dados não reagem ao hover (cursor padrão), e isso já ensina a interface sem precisar de texto.
- **Foco por teclado:** `tabindex="0"`, `role="button"` e `aria-label="Rio Grande do Norte, 30 clusters, 14.214 GWh cortados"` nos `<path>` com dados, mais um anel de foco visível em âmbar ou na tinta (3:1 garantido).
- **Rótulos:** anote diretamente o estado com dados (nome + número), com linha-guia de 1 px na cor da tinta. Quando houver vários estados, adicione uma legenda horizontal pequena acima do mapa (5 classes + um quadrado hachurado "sem dados"), seguindo o padrão do Datawrapper de legenda com os extremos e poucas classes intermediárias.
- **Ressalva cartográfica:** a Axis Maps lembra que coropléticos pedem dados normalizados (taxas), não totais brutos. Se um dia colorir estados por GWh absolutos, considere colorir por % de curtailment sobre a geração de referência, ou usar símbolos proporcionais por cluster.

### 4. Tipografia (impacto alto, esforço baixo)

- **Uma família sans com números tabulares e lining.** Muth (Datawrapper) recomenda sans-serif para dados e fontes com algarismos tabulares e lining. Boas opções gratuitas com suporte completo ao português: **IBM Plex Sans** (+ Plex Mono para valores técnicos), **Source Sans 3**, **Inter** ou **Public Sans**.
- **Título serifado opcional** para dar tom editorial ou acadêmico: **Source Serif 4** ou **Newsreader**. É o que o OWID faz com Playfair Display nos títulos e Lato no restante.
- **Escala** (razão ~1,25): 14 / 16 / 20 / 25 / 32 / 40 px, e o número grande em 64 px. Entrelinha de 1,5 no corpo e 1,1 nos títulos.
- **Números:** `font-variant-numeric: tabular-nums lining-nums` em tabelas e no número grande; separador de milhar com ponto (`Intl.NumberFormat('pt-BR')`).
- **Rótulos em caixa alta** só em eyebrows e cabeçalhos de tabela, com 11–12 px e `letter-spacing: .08em`. Muth recomenda usar caixa alta com parcimônia.

### 5. Moldura: cabeçalho e rodapé (impacto médio-alto, esforço baixo)

- **Cabeçalho fino** (56 px), faixa full-bleed em `#0C326F` com o texto em branco. À esquerda, o nome do projeto ("Curtailment & BESS · Brasil"); à direita, os links "Metodologia · Dados · Sobre" e a instituição ou programa de mestrado. É o recurso do OWID: uma única cor escura de marca como masthead sobre páginas claras.
- **Rodapé** em faixa `#EAF0F7`, com hairline no topo:
  - "Fonte: ONS — Dados de Restrição de Operação por Constrained-off de Usinas Eólicas e Fotovoltaicas (Portal de Dados Abertos), apuração 2025. Elaboração própria."
  - Uma linha sobre o recorte. No Portal ONS Dados Abertos, a descrição do conjunto de dados diz que ele reúne "Informações associadas à apuração das restrições de operação por Constrained-off nas usinas eólicas classificadas nas modalidades Tipo I, Tipo II-B e Tipo II-C". O conjunto com detalhamento por usina eólica foi criado em 27 de maio de 2024, e a série solar em base semi-horária começa mais tarde que a eólica.
  - Autoria, orientação e versão.
- Para público técnico, essa linha de fonte vale mais que qualquer ornamento.

### 6. Microdetalhes (impacto médio, esforço baixo)

- Hairlines de 1 px `#D5DDE6`; uma única linha de 2 px na tinta acima do cabeçalho da tabela (estilo FT/editorial).
- Transições de 120–150 ms no `fill` do mapa; nada de sombras.
- Estado vazio honesto: "Os demais estados ainda não têm dados processados" na tabela, em `--ink-2`, e não como frase solta.
- Espaçamento numa escala de 8 px (8/16/24/32/48/64) e margens laterais generosas, para que o branco pareça desenhado.

### CSS para colar

```css
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=Source+Serif+4:opsz,wght@8..60,600&display=swap');

:root{
  --paper:#F6F8FB; --band:#EAF0F7; --ink:#0B1F33; --ink-2:#4A5B6E;
  --rule:#D5DDE6; --land:#E3E9F0; --primary:#1351B4; --primary-dark:#0C326F;
  --accent:#D97706; --accent-text:#B45309;
  --wind:#0E7C86; --solar:#E3A008; --bess:#6741D9;
  --font-sans:'IBM Plex Sans',system-ui,sans-serif;
  --font-serif:'Source Serif 4',Georgia,serif;
}
body{margin:0;background:var(--paper);color:var(--ink);font:400 16px/1.5 var(--font-sans);}
.site-header{background:var(--primary-dark);color:#fff;height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 32px;}
.wrap{max-width:1200px;margin:0 auto;padding:48px 32px;display:grid;grid-template-columns:repeat(12,1fr);gap:32px;align-items:start;}
.intro{grid-column:1 / span 5;}
.map{grid-column:6 / span 7;}
@media (max-width:900px){.intro,.map{grid-column:1 / -1;}}

.eyebrow{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);}
h1{font:600 40px/1.1 var(--font-serif);margin:8px 0 12px;}
.lede{color:var(--ink-2);max-width:60ch;}

.bignum{font-size:64px;font-weight:600;line-height:1;color:var(--accent-text);
  font-variant-numeric:tabular-nums lining-nums;margin-top:32px;}
.bignum small{display:block;font-size:14px;font-weight:400;color:var(--ink-2);margin-top:8px;}

table.states{width:100%;border-collapse:collapse;margin-top:32px;font-variant-numeric:tabular-nums;}
table.states th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-2);
  text-align:left;border-bottom:2px solid var(--ink);padding:8px 0;}
table.states td{border-bottom:1px solid var(--rule);padding:10px 0;}
table.states td.num{text-align:right;}
table.states tr.nodata td{color:var(--ink-2);}
table.states tr[data-uf]:hover td{color:var(--primary);cursor:pointer;}

/* Mapa SVG */
.map path{fill:var(--land);stroke:#fff;stroke-width:.75;transition:fill .15s;}
.map path.has-data{fill:var(--primary);cursor:pointer;}
.map path.has-data:hover,.map path.is-active{fill:var(--primary-dark);}
.map path.has-data:focus-visible{outline:none;stroke:var(--accent);stroke-width:2.5;}
.map path.nodata{fill:url(#hatch);}
.map .label{font:500 13px var(--font-sans);fill:var(--ink);}
.map .leader{stroke:var(--ink);stroke-width:1;}

.site-footer{background:var(--band);border-top:1px solid var(--rule);color:var(--ink-2);
  font-size:13px;padding:24px 32px;}
```

E o padrão de hachura dentro do `<svg>`:

```html
<defs>
  <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
    <rect width="6" height="6" fill="#E3E9F0"/>
    <line x1="0" y1="0" x2="0" y2="6" stroke="#C9D3DE" stroke-width="1.5"/>
  </pattern>
</defs>
```

## Três direções visuais (todas sem cards)

**A. Editorial claro** — inspirado em Our World in Data, Carbon Brief e Nexo Gráficos

- Paleta: papel `#FAFAF7` (levemente quente), tinta `#1A1A1A`, primária `#1F5FA8`, acento `#D9480F`, sem-dados com hachura.
- Tipografia: Source Serif 4 (títulos) + Source Sans 3 (texto e números).
- Assinatura: título serifado grande, parágrafo explicativo curto, mapa anotado diretamente e uma linha "Fonte:" sob o gráfico. Lê como reportagem de dados. É boa para defesa de dissertação e divulgação.

**B. Técnico-institucional azul** — inspirado no Padrão Digital de Governo (gov.br), no GOV.UK Design System e no masthead do OWID

- Paleta: a da tabela acima (`#1351B4` / `#0C326F` / `#F6F8FB` / âmbar `#D97706`).
- Tipografia: Rawline (a fonte oficial do DSGov, via CDN do SERPRO) ou Public Sans/IBM Plex Sans.
- Assinatura: faixa de cabeçalho azul full-bleed, blocos de cor planos e quase nenhum arredondamento ou sombra. O GOV.UK orienta usar "blocos planos de cor" e tons da própria paleta. Dialoga com EPE, ONS e CCEE e é a escolha mais segura para público do setor elétrico. **É a direção recomendada** para este caso.

**C. Sala de controle escura** — inspirado em painéis de operação de rede e no WEBMAP da EPE

- Paleta: fundo `#0B1622`, terra sem dados `#1B2A3A` (contorno `#2B3E52`), estados com dados `#4DA3FF`, acento `#FFB020`, texto `#E6EDF5` e secundário `#9FB0C3`.
- Tipografia: IBM Plex Sans + IBM Plex Mono para valores (GWh, MW, horários).
- Assinatura: números em mono, hairlines azul-acinzentadas, mapa luminoso sobre fundo escuro. Impressiona em apresentação, mas exige mais cuidado com contraste e cansa em leitura longa. Use-a como tema alternativo (`prefers-color-scheme: dark`), não como padrão.

## Onde se inspirar (o que observar em cada)

- **Our World in Data** — https://ourworldindata.org — Masthead de uma cor só, título serifado + sans no corpo, aba de mapa com hachura para "No data", fonte e notas sempre abaixo do gráfico.
- **Datawrapper Blog: cores em style guides** — https://www.datawrapper.de/blog/colors-for-data-vis-style-guides — Por que o cinza é "a cor mais importante" da visualização, cinzas tingidos, cor para "sem dados".
- **Datawrapper Blog: enfatizar com cor** — https://www.datawrapper.de/blog/emphasize-with-color-in-data-visualizations — Tudo cinza menos o que importa: exatamente a lógica azul (dados) + âmbar (corte).
- **Datawrapper Blog: fontes para gráficos e tabelas** — https://www.datawrapper.de/blog/fonts-for-data-visualization — Sans-serif, algarismos tabulares e lining, caixa alta com parcimônia, serifada só em títulos.
- **Datawrapper Academy: coropléticos** — https://academy.datawrapper.de/article/134-what-to-consider-when-creating-choropleth-maps — Quantas classes usar, legenda com extremos, quando um mapa nem é a melhor escolha.
- **Datawrapper Academy: padrões em coropléticos** — https://academy.datawrapper.de/article/396-pattern-overlay-in-choropleth-maps — Hachura para dado incompleto ou qualificado, com opacidade baixa.
- **Axis Maps — Cartography Guide** — https://www.axismaps.com/guide/choropleth e https://www.axismaps.com/guide/visual-hierarchy — Normalização em coropléticos, figura-fundo, hierarquia visual.
- **ColorBrewer** — https://colorbrewer2.org — Escalas sequenciais *Blues* seguras para daltônicos.
- **Adobe Leonardo** — https://leonardocolor.io — Gerar a rampa do azul a partir de razões de contraste-alvo.
- **OKLCH picker** — https://atmos.style/playground — Rampas perceptualmente uniformes para o azul e o âmbar.
- **WebAIM: contraste** — https://webaim.org/articles/contrast/ — 4,5:1, 3:1 e não-texto 3:1, explicados.
- **GOV.UK Design System — cor** — https://design-system.service.gov.uk/styles/colour — Paleta funcional (foco, erro, marca), estética plana.
- **Padrão Digital de Governo (gov.br)** — https://www.gov.br/ds/fundamentos-visuais/tipografia — Rawline, escala *Minor Third*, azul institucional.
- **Ember — Electricity Data Explorer** — https://ember-energy.org/data/electricity-data-explorer/ — Explorador de dados de energia com seleção de país, agrupamento eólica+solar e downloads abertos (CC BY 4.0).
- **Carbon Brief — mapas de energia** — https://interactive.carbonbrief.org/how-uk-transformed-electricity-supply-decade/index.html — Mapa + narrativa + metodologia explícita no fim.
- **Nexo Gráficos** — https://www.nexojornal.com.br/grafico/2024/02/09/censo-2022-guia-visual-grafico-nexo — Identidade visual definida antes da série de gráficos; referência brasileira de tom editorial.
- **EPE Interativa / WEBMAP** — https://www.epe.gov.br/pt/abcdenergia/epe-interativa — Como o setor apresenta mapas de energia hoje; bom para saber o que o público já espera (e onde dá para ser mais limpo).
- **ONS Dados Abertos — constrained-off** — https://dados.ons.org.br/dataset/restricao_coff_eolica_detail — A fonte a citar no rodapé.

## Por que "sem cards" é uma escolha defensável

A crítica atual ao visual genérico de dashboard vai na mesma direção dessa restrição. Guias de 2025–2026 apontam como falhas típicas as "paredes" de cards de KPI que competem por atenção. O AIDesigner Blog, em "How to Design a Dashboard UI: A Step-by-Step Guide (2026)", observa que pedir a ferramentas como Claude Code ou Cursor para "design a dashboard" devolve "the same purple-blue gradient hero, three-card-grid, blue-button page that you've seen on every AI-generated SaaS landing page". O Sailop, em "The Anti-Slop Prompt Template (2026)", vai no mesmo sentido: "the three-card grid is so reflexive that it survives almost every vague instruction." A tradição editorial (OWID, FT, Nexo, GOV.UK) obtém hierarquia com tipografia, alinhamento, linhas e uma cor de destaque, e é isso que comunica rigor para um público técnico.

## Ressalvas

- Os hex propostos são um ponto de partida. Valide cada par texto/fundo num verificador WCAG; os únicos contrastes calculados explicitamente foram tinta 2 sobre o papel (~6,5:1) e o azul primário sobre branco (~7:1).
- Não foi encontrado um guia público do Ember com as cores oficiais de eólica e solar. As cores de fonte sugeridas (teal para eólica, ouro para solar) são convenção de mercado, não um padrão citado.
- As fontes do OWID (Playfair Display + Lato) são documentadas pelo Datawrapper em 2019 e pelo pacote Grapher. O azul `#002147` vem de medição de terceiros, não de um guia oficial.
- Se o mapa um dia colorir estados por valor, prefira uma métrica normalizada (% cortado) a GWh absolutos, para não premiar estados apenas por terem mais usinas.

## Fontes

- [Axis Maps — Visual Hierarchy](https://www.axismaps.com/guide/visual-hierarchy)
- [Axis Maps — Choropleth](https://www.axismaps.com/guide/choropleth)
- [Datawrapper Blog — Colors for data vis style guides](https://www.datawrapper.de/blog/colors-for-data-vis-style-guides)
- [Datawrapper Blog — Emphasize with color](https://www.datawrapper.de/blog/emphasize-with-color-in-data-visualizations)
- [Datawrapper Blog — Fonts for data visualization](https://www.datawrapper.de/blog/fonts-for-data-visualization)
- [Datawrapper Academy — Choropleth maps](https://academy.datawrapper.de/article/134-what-to-consider-when-creating-choropleth-maps)
- [Datawrapper Academy — Pattern overlay in choropleth maps](https://academy.datawrapper.de/article/396-pattern-overlay-in-choropleth-maps)
- [WebAIM — Contrast and Color Accessibility](https://webaim.org/articles/contrast/)
- [Accessible Resources — WCAG 2.1 color contrast](https://www.accessibleresources.com/post/understanding-wcag-2-1-a-aa-and-aaa-guidelines-for-color-contrast)
- [Medium — A plain-language guide to WCAG contrast requirements](https://medium.com/design-bootcamp/a-plain-language-guide-to-wcag-contrast-requirements-6fe18569d5df)
- [Ultimate Design Tools — Color contrast WCAG guide](https://ultimatedesigntools.com/blog/color-contrast-wcag-guide/)
- [Nate Baldwin — Leonardo, contrast-based color generator](https://medium.com/@NateBaldwin/leonardo-an-open-source-contrast-based-color-generator-92d61b6521d2)
- [Adobe Leonardo (GitHub)](https://github.com/adobe/leonardo)
- [InfoQ — Adobe Leonardo accessible colors](https://www.infoq.com/news/2020/03/adobe-leonardo-accessible-colors)
- [Atmos — OKLCH playground](https://atmos.style/playground)
- [CleanChart — Color palette types for data visualization](https://www.cleanchart.app/blog/color-palette-types-data-visualization)
- [Datavizpyr — Color palettes with RColorBrewer](https://datavizpyr.com/introduction-to-color-palettes-in-r-with-rcolorbrewer/)
- [Font Alternatives — Best fonts for legible numerals in UI](https://fontalternatives.com/blog/best-fonts-legible-numerals-ui/)
- [OWID Grapher (GitHub)](https://github.com/owid/owid-grapher/tree/master/packages/@ourworldindata/grapher)
- [OWID Grapher — PR 7485](https://github.com/owid/owid-grapher/pull/7485)
- [OWID Grapher — Issue 1611](https://github.com/owid/owid-grapher/issues/1611)
- [Designlang — ourworldindata.org](https://designlang.app/design-index/ourworldindata.org)
- [GOV.UK Design System — Images](https://design-system.service.gov.uk/styles/images/)
- [GOV.UK brand — Colour for web](https://brand.design-system.service.gov.uk/colour/web)
- [Oh My Design — GOV.UK design system](https://oh-my-design.kr/design-systems/govuk)
- [Padrão Digital de Governo — Tipografia](https://www.gov.br/ds/fundamentos-visuais/tipografia)
- [DesignMD — DSGov](https://designmd.app.br/brands/dsgov)
- [Ember — Electricity Data Explorer](https://ember-energy.org/data/electricity-data-explorer/)
- [Ember — anúncio do Data Explorer (LinkedIn)](https://www.linkedin.com/posts/ember-climate_our-electricity-data-explorer-has-a-shiny-activity-7050044736077733888-5_TB)
- [Carbon Brief — How the UK transformed its electricity supply](https://interactive.carbonbrief.org/how-uk-transformed-electricity-supply-decade/index.html)
- [Nexo — Censo 2022: guia visual](https://www.nexojornal.com.br/grafico/2024/02/09/censo-2022-guia-visual-grafico-nexo)
- [EPE Interativa](https://www.epe.gov.br/pt/abcdenergia/epe-interativa)
- [ECOA — EPE lança site com dados georreferenciados](https://ecoa.org.br/epe-lanca-site-com-dados-georreferenciados-do-setor-energetico-brasileiro/)
- [ONS Dados Abertos — Constrained-off eólica (detalhamento)](https://dados.ons.org.br/dataset/restricao_coff_eolica_detail)
- [ONS Dados Abertos — Constrained-off fotovoltaica](https://dados.ons.org.br/dataset/restricao_coff_fotovoltaica)
