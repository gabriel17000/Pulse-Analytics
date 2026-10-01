# Arquitetura

O frontend consome endpoints REST locais. O backend lê um CSV compartilhado como fonte de demonstração, agrega os dados sob demanda e executa a regressão linear no endpoint de previsão. As dependências são explícitas em `backend/requirements.txt` e `frontend/package.json`; não há integração com outros projetos ou serviços externos.

```text
React + Recharts → FastAPI → Pandas → dados/vendas.csv
                            └→ scikit-learn (forecast)
```
