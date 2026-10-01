# Guia de entrevista — Pulse Analytics

## Como apresentar em 60 segundos

“Criei um dashboard de vendas de ponta a ponta com React e FastAPI. O backend agrega um CSV sintético com Pandas, entrega KPIs e séries por API e estima a receita do mês seguinte com regressão linear do scikit-learn. Separei os últimos três meses para avaliar o erro com MAE e RMSE. O foco foi manter a lógica legível, os dados sem informação pessoal e a interface próxima de um produto SaaS.”

## Mapa das partes

- `backend/app/main.py`: rotas HTTP, filtros, agregações Pandas e treinamento/avaliação do modelo.
- `backend/generate_data.py`: geração reprodutível de pedidos fictícios usando semente fixa.
- `dados/vendas.csv`: registros em formato tabular; cada linha representa um item de pedido.
- `frontend/src/App.tsx`: estado dos filtros, chamadas à API e composição dos cartões/gráficos.
- `frontend/src/style.css`: tema escuro, layout e adaptações para telas menores.
- `backend/tests/test_api.py`: verifica saúde da API, formato do dashboard e métricas da previsão.

## Perguntas que podem aparecer

**Por que FastAPI?** É leve, tem tipagem clara e gera documentação interativa OpenAPI automaticamente.

**O que Pandas faz aqui?** Lê o CSV, agrupa vendas por mês/categoria/produto e calcula agregações sem espalhar lógica de consulta pela interface.

**Como funciona regressão linear?** Aprende uma reta que relaciona um índice temporal com a receita mensal. Depois extrapola essa reta para o próximo índice.

**O que significam MAE e RMSE?** MAE é o erro absoluto médio; RMSE também mede erro médio, mas penaliza mais os erros grandes. Ambos estão na mesma unidade da receita (reais), então menor tende a ser melhor.

**Por que separar os últimos três meses?** A ordem do tempo importa. Treinar no passado e testar em meses posteriores simula melhor a previsão futura que embaralhar observações aleatoriamente.

**Quais são as limitações?** A regressão linear não modela sazonalidade, campanhas ou mudanças estruturais. Além disso, a conversão é ilustrativa porque o dataset não contém visitas/sessões. Em produção eu validaria a definição do KPI e compararia modelos com baseline sazonal.

**Como evitar vazamento de dados?** A avaliação usa apenas meses anteriores no treino; meses de teste ficam fora do ajuste. A previsão final é estimada com o modelo treinado no histórico disponível.

**Como a aplicação escala?** Para o escopo de portfólio, CSV atende. Com volume maior, eu migraria a fonte para banco relacional, adicionaria paginação/cache, validação formal de parâmetros e métricas de observabilidade.

**Como testar?** `python -m pytest backend/tests`; os testes chamam a API localmente e verificam contrato básico e resultados válidos.
