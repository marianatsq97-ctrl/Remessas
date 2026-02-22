# Portal de Alertas - Remessas

Portal web estático para monitoramento de contratos e alertas de remessas, em layout escuro no padrão do mockup.

## Funcionalidades

- Upload de dados por arquivo **CSV** ou **JSON**.
- Demo pronta para validação rápida da interface.
- Filtros por ano, mês e período (data inicial/final).
- Cards de resumo com níveis de criticidade:
  - **OK** (0 a 7 dias sem remessa)
  - **Atenção** (8 a 14 dias)
  - **Atenção grave** (15 a 21 dias)
  - **Plano de ação** (> 21 dias)
- Gráfico de evolução mensal de remessas.
- Tabela detalhada com paginação.

## Formato esperado do CSV

> Delimitador aceito: vírgula `,` ou ponto e vírgula `;`

```csv
cnpj,cliente,contrato,nomeObra,volume,ultimaRemessa
12.345.678/0001-10,Cliente X,C-1001,Obra Y,15,2026-01-12
```

## Formato esperado do JSON

```json
[
  {
    "cnpj": "12.345.678/0001-10",
    "cliente": "Cliente X",
    "contrato": "C-1001",
    "nomeObra": "Obra Y",
    "volume": 15,
    "ultimaRemessa": "2026-01-12"
  }
]
```

## Executar localmente

### Opção 1: abrir direto
Abra o arquivo `index.html` no navegador.

### Opção 2: servidor local
```bash
python3 -m http.server 4180
```
Depois, acesse `http://127.0.0.1:4180`.

## Publicar no GitHub Pages

1. Envie os arquivos para um repositório no GitHub.
2. Em **Settings > Pages**, selecione a branch principal e a pasta `/ (root)`.
3. Salve e aguarde a URL pública ser gerada.
