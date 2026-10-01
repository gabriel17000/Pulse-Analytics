from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health():
    assert client.get("/api/health").json()["status"] == "ok"

def test_dashboard_has_kpis_and_charts():
    response = client.get("/api/dashboard?period=6m&category=Todas")
    assert response.status_code == 200
    body = response.json()
    assert body["kpis"]["revenue"] > 0
    assert body["sales_over_time"]
    assert body["top_products"]

def test_dashboard_products_include_their_actual_category():
    body = client.get("/api/dashboard?period=12m").json()
    categories = {item["category"] for item in body["sales_by_category"]}
    assert body["top_products"]
    assert all(product["category"] in categories for product in body["top_products"])
    assert len(body["top_products"]) > 5

def test_forecast_returns_evaluation_metrics():
    body = client.get("/api/forecast").json()
    assert body["prediction"] > 0
    assert body["mae"] >= 0 and body["rmse"] >= 0
