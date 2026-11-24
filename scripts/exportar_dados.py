"""Exporta o corte de cada cluster do RN para os JSON que a aplicação lê.

Uso:  python scripts/exportar_dados.py <pasta do repositório dissertacao-curtailment-rn>

Gera public/data/clusters.json (índice, com a posição do cluster e das usinas),
public/data/<cluster>.json (dia típico por fonte e série horária do ano) e public/data/mapa.json
(contorno das UFs e do RN, das malhas do IBGE em cache em dados/). Mesma construção do notebook 06: um mesmo rótulo de cluster nas duas
fontes é um cluster solar e um eólico na mesma subestação, e o corte dos dois é somado.
"""
import json
import pathlib
import sys

import pandas as pd

ORIGEM = pathlib.Path(sys.argv[1])
SAIDA = pathlib.Path(__file__).resolve().parent.parent / 'public' / 'data'
COLS = ['ceg', 'din_instante', 'energia_cortada_mwh_intervalo', 'hora']


def corte(fonte_parquet, clusters_csv):
    """Por cluster: dia típico (24 h), série horária do ano, subestação e nº de usinas."""
    clusters = pd.read_csv(ORIGEM / clusters_csv)
    usinas = clusters.groupby('cluster_final')[['longitude', 'latitude']].apply(lambda g: g.values.tolist())
    clusters = clusters[['ceg', 'cluster_final', 'nom_subestacao']]
    df = pd.read_parquet(ORIGEM / fonte_parquet, columns=COLS).merge(clusters, on='ceg')
    df['dia'] = df['din_instante'].dt.floor('D')
    # Divide pelo total de dias, não pelos dias com registro naquela hora: hora sem linha é hora sem corte.
    dias = df.groupby('cluster_final')['dia'].nunique()
    perfil = (df.groupby(['cluster_final', 'hora'])['energia_cortada_mwh_intervalo'].sum()
              .unstack('hora').div(dias, axis=0).reindex(columns=range(24)).fillna(0))
    df['h'] = df['din_instante'].dt.floor('h')
    serie = df.groupby(['cluster_final', 'h'])['energia_cortada_mwh_intervalo'].sum().unstack('cluster_final')
    return perfil, serie, clusters.groupby('cluster_final')['nom_subestacao'].first(), \
        clusters.groupby('cluster_final')['ceg'].nunique(), usinas


perfil_s, serie_s, se_s, n_s, usinas_s = corte('solar_rn.parquet', 'clusters_solar_geografico.csv')
perfil_e, serie_e, se_e, n_e, usinas_e = corte('eolico_rn.parquet', 'clusters_eolica_geografico.csv')

horas = pd.date_range('2025-01-01', '2025-12-31 23:00', freq='h')
zeros24 = pd.Series(0.0, index=range(24))
SAIDA.mkdir(parents=True, exist_ok=True)

indice = []
for c in sorted(set(perfil_s.index) | set(perfil_e.index)):
    tem_s, tem_e = c in perfil_s.index, c in perfil_e.index
    ps = perfil_s.loc[c] if tem_s else zeros24
    pe = perfil_e.loc[c] if tem_e else zeros24
    serie = sum(s[c].reindex(horas).fillna(0) for s, tem in [(serie_s, tem_s), (serie_e, tem_e)] if tem)
    pontos_s = usinas_s[c] if tem_s else []
    pontos_e = usinas_e[c] if tem_e else []
    pontos = pontos_s + pontos_e
    item = {
        'id': c,
        'subestacao': (se_s if tem_s else se_e)[c],
        'tipo': 'hibrido' if tem_s and tem_e else 'solar' if tem_s else 'eolico',
        'n_solar': int(n_s[c]) if tem_s else 0,
        'n_eolico': int(n_e[c]) if tem_e else 0,
        'corte_anual_gwh': round(float(serie.sum()) / 1e3, 1),
    }
    # Só o índice leva a posição: é o que o mapa do estado desenha.
    indice.append({
        **item,
        'lon': round(sum(p[0] for p in pontos) / len(pontos), 4),
        'lat': round(sum(p[1] for p in pontos) / len(pontos), 4),
        'usinas_solar': [[round(x, 4), round(y, 4)] for x, y in pontos_s],
        'usinas_eolico': [[round(x, 4), round(y, 4)] for x, y in pontos_e],
    })
    (SAIDA / f'{c}.json').write_text(json.dumps({
        **item,
        'dia_tipico_solar': [round(float(v), 4) for v in ps],
        'dia_tipico_eolico': [round(float(v), 4) for v in pe],
        'serie': [round(float(v), 3) for v in serie],
    }), encoding='utf-8')

(SAIDA / 'clusters.json').write_text(json.dumps(indice, ensure_ascii=False), encoding='utf-8')


def aneis(nome, casas):
    """Anéis exteriores de cada feature de uma malha do IBGE, por código de área."""
    malha = json.loads((ORIGEM / 'dados' / f'malha_{nome}.geojson').read_text(encoding='utf-8'))
    saida = {}
    for f in malha['features']:
        g = f['geometry']
        poligonos = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        saida[f['properties']['codarea']] = [[[round(x, casas), round(y, casas)] for x, y in p[0]] for p in poligonos]
    return saida


# Código IBGE da UF → anéis. O RN (24) vai também em resolução maior, para a página do estado.
(SAIDA / 'mapa.json').write_text(
    json.dumps({'ufs': aneis('brasil_ufs', 2), 'rn': aneis('rn', 3)['24']}), encoding='utf-8')
print(f'{len(indice)} clusters exportados para {SAIDA}')
