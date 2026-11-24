# Curtailment no RN — cenários de carga e BESS

Aplicação web local para explorar, por cluster de usinas do Rio Grande do Norte, duas formas de
aproveitar a energia cortada (curtailment) em 2025:

- **Cenário 1** — carga fixa igual à menor barra do dia típico, sem bateria.
- **Cenário 2** — carga flat maior, sustentada por um BESS de 4 h. O usuário escolhe o alvo de
  aproveitamento e a aplicação recalcula a carga, o banco e o despacho.

O dia típico dimensiona; o aproveitamento é sempre medido também na série horária real do ano.
A lógica é a mesma do notebook `06_carga_hibrida_simplificada.ipynb` do repositório
`dissertacao-curtailment-rn`.

## Rodar

```
npm install
npm run dev
```

Abra o endereço que o terminal mostrar (por padrão http://localhost:5173).

## Atualizar os dados

Os JSON em `public/data/` são gerados a partir dos parquets e dos CSV de clusters do repositório
da dissertação:

```
python scripts/exportar_dados.py <pasta do dissertacao-curtailment-rn>
```

## Testes

```
npm test
```

Os testes conferem os cálculos (`src/lib/cenarios.ts`) contra os valores do notebook 06.
