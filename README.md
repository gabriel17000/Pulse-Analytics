# Pulse Analytics

Dashboard SaaS de demonstração para análise de vendas, indicadores de negócio e previsão de receita usando Machine Learning. O projeto reúne uma interface React, uma API FastAPI e um modelo explicável de regressão linear.

## Demonstração

- **Frontend:** [pulse-analytics-m6v9.vercel.app](https://pulse-analytics-m6v9.vercel.app)
- **API:** [pulse-analytics-api-psi.vercel.app](https://pulse-analytics-api-psi.vercel.app)
- **Documentação interativa da API:** [/docs](https://pulse-analytics-api-psi.vercel.app/docs)

## Funcionalidades

- Dashboard de KPIs: receita, clientes, ticket médio e conversão.
- Gráficos de vendas por período, categoria e segmento de clientes.
- Produtos líderes e catálogo de produtos.
- Filtros de período e categoria.
- Análise de métricas e insights do período.
- Forecast de receita, com avaliação do modelo por MAE e RMSE.
- Busca, exportação CSV e atualização dos dados.
- Tema escuro e layout responsivo.

## Tecnologias

- **Backend:** Python, FastAPI, Pandas, scikit-learn e pytest.
- **Frontend:** React, TypeScript, Vite, Tailwind CSS e Recharts.

## Arquitetura

```text
Usuário
  ↓
React + TypeScript + Vite
  ↓
API FastAPI
  ↓
Pandas / scikit-learn
  ↓
CSV com dados sintéticos
```

## Machine Learning

O Forecast utiliza `LinearRegression` do scikit-learn. A receita é agrupada por mês e o histórico mensal alimenta o modelo para estimar os próximos períodos. Para avaliar o desempenho temporalmente, os três meses mais recentes são separados do conjunto usado no ajuste. O resultado é avaliado com MAE e RMSE.

O modelo é demonstrativo: não considera fatores como sazonalidade, campanhas ou mudanças de mercado e não deve ser tratado como uma previsão operacional real.

## Dados

O CSV contém dados sintéticos/fictícios. Os registros não representam clientes, empresas ou vendas reais. A taxa de conversão também é um proxy demonstrativo, pois o conjunto de dados não contém sessões ou visitas.

## Executar localmente

Requisitos: Python 3.10+ e Node.js 20+.

### Backend

Na raiz do repositório:

```powershell
python backend/generate_data.py
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r backend/requirements.txt
uvicorn app.main:app --reload --app-dir backend
```

A API fica disponível em `http://localhost:8000`; a documentação está em `http://localhost:8000/docs`.

### Frontend

Em outro terminal:

```powershell
cd frontend
npm install
npm run dev
```

Abra `http://localhost:5173`. Se essa porta estiver ocupada, o Vite seleciona outra porta livre. Em desenvolvimento, o proxy do Vite encaminha `/api` para `http://127.0.0.1:8000`.

### Testes

Com o ambiente Python ativado, na raiz:

```powershell
python -m pytest backend/tests
```

Para compilar o frontend:

```powershell
cd frontend
npm run build
```

## Deploy na Vercel

O projeto usa dois projetos Vercel, conectados ao mesmo repositório.

| Projeto | Root Directory | Preset | Variável de ambiente |
| --- | --- | --- | --- |
| Frontend | `frontend` | Vite | `VITE_API_URL=https://pulse-analytics-api-psi.vercel.app/api` |
| Backend/API | `backend` | FastAPI | `FRONTEND_ORIGINS=https://pulse-analytics-m6v9.vercel.app` |

`VITE_API_URL` define a base usada pelo frontend em produção. Localmente, sem essa variável, o frontend usa `/api` e o proxy do Vite encaminha as requisições à API local. `FRONTEND_ORIGINS` informa à API qual origem do navegador pode acessar os endpoints.

## Estrutura do projeto

```text
pulse-analytics/
├── backend/
├── frontend/
├── dados/
├── modelos/
├── documentacao/
└── README.md
```
