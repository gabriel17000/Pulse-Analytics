# Pulse Analytics

Dashboard SaaS de demonstração para transformar dados de vendas fictícios em indicadores claros e uma previsão explicável. Foi pensado como portfólio de análise de dados e desenvolvimento web: interface de produto, API documentada e modelo simples o bastante para apresentar em uma entrevista.

## Problema que resolve

Pequenas equipes precisam entender rapidamente como receita, pedidos, categorias e clientes evoluem. O Pulse consolida esses sinais em uma visão de negócio, oferece filtros e usa o histórico mensal para estimar a receita do mês seguinte.

## Funcionalidades

- KPIs de receita, clientes, ticket médio e conversão, com variação mensal.
- Série temporal interativa, vendas por categoria, distribuição por segmento e produtos líderes.
- Filtros por período e categoria, mais seleção de métrica na área de análise.
- Insights em linguagem direta e previsão de receita com erro de avaliação MAE/RMSE.
- Busca de produtos e segmentos, atualização manual/automática e exportação CSV contextual.
- Páginas de clientes, catálogo completo de produtos e preferências locais do dashboard.
- Dataset sintético, sem dados pessoais reais; layout responsivo com tema escuro.

## Tecnologias

**Backend:** Python, FastAPI, Pandas, scikit-learn, pytest. **Frontend:** React, TypeScript, Vite, Tailwind CSS e Recharts. Lucide fornece ícones.

## Estrutura

```text
pulse-analytics/
├── backend/       # API, geração de dados e testes
├── frontend/      # aplicação React e estilos
├── dados/         # CSV fictício e descrição das colunas
├── modelos/       # espaço para modelos serializados/experimentos futuros
├── documentacao/  # material complementar
├── GUIA_ENTREVISTA.md
└── README.md
```

## Instalação e execução

Requer Python 3.10+ e Node.js 20+.

1. Na raiz do projeto, gere os dados: `python backend/generate_data.py`.
2. Instale o backend: `python -m venv .venv`, ative o ambiente (`.venv\\Scripts\\Activate.ps1` no Windows ou `source .venv/bin/activate` no macOS/Linux) e execute `pip install -r backend/requirements.txt`.
3. Inicie a API: `uvicorn app.main:app --reload --app-dir backend`. Documentação interativa em `http://localhost:8000/docs`.
4. Em outro terminal, instale o frontend: `cd frontend`, `npm install`, `npm run dev`.
5. Abra `http://localhost:5173`.

Durante o desenvolvimento, o Vite encaminha `/api` para o FastAPI local em `http://localhost:8000`, sem depender da porta escolhida pelo frontend. Para executar os testes, na raiz com ambiente virtual ativo: `python -m pytest backend/tests`.

## Como funciona o Machine Learning

A API agrupa a receita por mês e treina uma `LinearRegression` com um índice temporal crescente. Os três meses mais recentes são separados para avaliação temporal; o modelo é ajustado no histórico anterior, mede MAE e RMSE nos meses separados e depois estima o mês seguinte. Essa linha reta é transparente e boa para fins didáticos, mas não representa sazonalidade nem substitui uma previsão operacional. O endpoint `GET /api/forecast` informa previsão, período, dados históricos e métricas.

## Exemplos de uso

- `GET /api/dashboard?period=6m&category=Tecnologia`: KPIs e séries filtradas.
- `GET /api/analysis?metric=pedidos&period=12m`: evolução de uma métrica e direção da mudança.
- `GET /api/forecast`: previsão mensal de receita e avaliação.

## Limitações conhecidas

Os dados e a previsão são sintéticos/didáticos. A conversão é um proxy, pois o CSV não possui sessões. A regressão linear não modela sazonalidade; filtros e atualização automática são locais à sessão/navegador, sem contas ou persistência no servidor.
