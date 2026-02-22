# Portal de Alertas - Remessas

Portal web estático para monitoramento de contratos e alertas de remessas, com layout escuro inspirado no modelo enviado.

## Funcionalidades

- Carregamento de dados por arquivo CSV/JSON.
- Botão de demonstração com dados prontos.
- Filtros por ano, mês e intervalo de data.
- Cards de resumo com níveis de urgência.
- Gráfico de evolução mensal de remessas.
- Tabela detalhada com paginação.

## Formato esperado do CSV

```csv
cnpj,cliente,contrato,nomeObra,volume,ultimaRemessa
12.345.678/0001-10,Cliente X,C-1001,Obra Y,15,2026-01-12
```

## Rodar localmente

Como é um site estático, basta abrir o arquivo `index.html` no navegador.
