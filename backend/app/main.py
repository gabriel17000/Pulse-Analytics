"""API do Pulse Analytics; serve métricas, dados sintéticos e previsão mensal."""
from pathlib import Path
import sys

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error

ROOT = Path(__file__).resolve().parents[2]
DATA_PATH = ROOT / "dados" / "vendas.csv"

app = FastAPI(title="Pulse Analytics API", version="1.0.0", description="Dashboard de vendas com dados fictícios.")
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_methods=["*"],
    allow_headers=["*"],
)


def load_sales() -> pd.DataFrame:
    """Lê o CSV publicado no projeto; sem dados pessoais reais."""
    return pd.read_csv(DATA_PATH, parse_dates=["data"])


def filtered_sales(period: str = "12m", category: str = "Todas") -> pd.DataFrame:
    df = load_sales()
    if period != "Tudo":
        months = int(period.removesuffix("m"))
        cutoff = df["data"].max() - pd.DateOffset(months=months)
        df = df[df["data"] >= cutoff]
    if category != "Todas":
        df = df[df["categoria"] == category]
    return df


@app.get("/")
def root():
    return {"message": "Pulse Analytics API", "status": "online", "docs": "/docs"}


@app.get("/api/health")
def health():
    return {"status": "ok", "service": "Pulse Analytics API"}


@app.get("/api/filters")
def filters():
    df = load_sales()
    return {"categories": ["Todas", *sorted(df["categoria"].unique())], "periods": ["3m", "6m", "12m", "Tudo"]}


@app.get("/api/dashboard")
def dashboard(period: str = "12m", category: str = "Todas"):
    df = filtered_sales(period, category)
    total_revenue = round(float(df["receita"].sum()), 2)
    clients = int(df["cliente_id"].nunique())
    orders = int(df["pedido_id"].nunique())
    monthly = df.assign(mes=df["data"].dt.to_period("M").dt.to_timestamp()).groupby("mes", as_index=False).agg(receita=("receita", "sum"), pedidos=("pedido_id", "nunique"), clientes=("cliente_id", "nunique"))
    categories = df.groupby("categoria", as_index=False).agg(receita=("receita", "sum")).sort_values("receita", ascending=False)
    products = df.groupby(["produto", "categoria"], as_index=False).agg(unidades=("quantidade", "sum"), receita=("receita", "sum")).sort_values("unidades", ascending=False)
    distribution = df.groupby("segmento", as_index=False).agg(clientes=("cliente_id", "nunique"))
    current = float(monthly.iloc[-1]["receita"]) if len(monthly) else 0
    previous = float(monthly.iloc[-2]["receita"]) if len(monthly) > 1 else current
    growth = ((current - previous) / previous * 100) if previous else 0
    current_clients = int(monthly.iloc[-1]["clientes"]) if len(monthly) else 0
    previous_clients = int(monthly.iloc[-2]["clientes"]) if len(monthly) > 1 else current_clients
    current_orders = int(monthly.iloc[-1]["pedidos"]) if len(monthly) else 0
    previous_orders = int(monthly.iloc[-2]["pedidos"]) if len(monthly) > 1 else current_orders
    current_ticket = current / current_orders if current_orders else 0
    previous_ticket = previous / previous_orders if previous_orders else current_ticket
    client_growth = ((current_clients - previous_clients) / previous_clients * 100) if previous_clients else 0
    ticket_growth = ((current_ticket - previous_ticket) / previous_ticket * 100) if previous_ticket else 0
    # Sem sessões no dataset não é possível calcular conversão real; usamos um proxy didático.
    current_conversion = min(12.4, 2.8 + current_clients / max(current_orders, 1) * 0.8)
    previous_conversion = min(12.4, 2.8 + previous_clients / max(previous_orders, 1) * 0.8)
    return {"kpis": {"revenue": total_revenue, "clients": clients, "average_order": round(total_revenue / orders, 2) if orders else 0, "conversion": round(current_conversion, 1), "growth": round(growth, 1), "clients_growth": round(client_growth, 1), "average_order_growth": round(ticket_growth, 1), "conversion_growth": round(current_conversion - previous_conversion, 1), "orders": orders}, "sales_over_time": [{"date": row.mes.strftime("%Y-%m"), "revenue": round(float(row.receita), 2), "orders": int(row.pedidos)} for row in monthly.itertuples()], "sales_by_category": [{"category": row.categoria, "revenue": round(float(row.receita), 2)} for row in categories.itertuples()], "customer_distribution": [{"segment": row.segmento, "customers": int(row.clientes)} for row in distribution.itertuples()], "top_products": [{"product": row.produto, "category": row.categoria, "units": int(row.unidades), "revenue": round(float(row.receita), 2)} for row in products.itertuples()], "insights": [f"A receita do último mês { 'cresceu' if growth >= 0 else 'recuou' } {abs(growth):.1f}% em relação ao mês anterior.", f"{categories.iloc[0]['categoria'] if len(categories) else 'Nenhuma'} é a categoria líder em receita no período.", f"O ticket médio atual é de R$ {total_revenue / orders:,.2f}." if orders else "Não há pedidos no período selecionado."]}


@app.get("/api/analysis")
def analysis(metric: str = Query("receita", pattern="^(receita|pedidos|clientes)$"), period: str = "12m"):
    df = filtered_sales(period)
    df["mes"] = df["data"].dt.to_period("M").dt.to_timestamp()
    agg = {"receita": ("receita", "sum"), "pedidos": ("pedido_id", "nunique"), "clientes": ("cliente_id", "nunique")}[metric]
    series = df.groupby("mes", as_index=False).agg(valor=agg)
    delta = float(series.iloc[-1]["valor"] - series.iloc[-2]["valor"]) if len(series) > 1 else 0
    return {"metric": metric, "points": [{"date": row.mes.strftime("%Y-%m"), "value": round(float(row.valor), 2)} for row in series.itertuples()], "change": round(delta, 2), "direction": "up" if delta >= 0 else "down"}


@app.get("/api/forecast")
def forecast(period: str = "Tudo", category: str = "Todas"):
    df = filtered_sales(period, category)
    df["mes"] = df["data"].dt.to_period("M").dt.to_timestamp()
    series = df.groupby("mes")["receita"].sum().reset_index()
    if series.empty:
        raise HTTPException(status_code=422, detail="Não há vendas para os filtros selecionados.")
    series["indice"] = range(len(series))
    mae = rmse = None
    validation_points = 0
    if len(series) > 1:
        split = max(1, len(series) - 3)
        train, test = series.iloc[:split], series.iloc[split:]
        validation_model = LinearRegression().fit(train[["indice"]], train["receita"])
        test_pred = validation_model.predict(test[["indice"]])
        mae = float(mean_absolute_error(test["receita"], test_pred))
        rmse = float(mean_squared_error(test["receita"], test_pred) ** 0.5)
        validation_points = len(train)

    model = LinearRegression().fit(series[["indice"]], series["receita"])
    future_rows = []
    for offset in range(1, 4):
        future_date = series.iloc[-1]["mes"] + pd.DateOffset(months=offset)
        estimate = max(0, float(model.predict(pd.DataFrame({"indice": [len(series) + offset - 1]}))[0]))
        future_rows.append({"date": future_date.strftime("%Y-%m"), "prediction": round(estimate, 2)})

    return {
        "metric": "receita",
        "period": future_rows[0]["date"],
        "prediction": future_rows[0]["prediction"],
        "mae": round(mae, 2) if mae is not None else None,
        "rmse": round(rmse, 2) if rmse is not None else None,
        "model": "Regressão Linear",
        "training_points": len(series),
        "validation_training_points": validation_points,
        "history": [
            {
                "date": row.mes.strftime("%Y-%m"),
                "actual": round(float(row.receita), 2),
                "predicted": round(float(model.predict(pd.DataFrame({"indice": [row.indice]}))[0]), 2),
            }
            for row in series.itertuples()
        ],
        "future": future_rows,
    }
