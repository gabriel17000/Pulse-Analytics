from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json() == {
        "message": "Pulse Analytics API",
        "status": "online",
        "docs": "/docs",
    }

def test_health():
    assert client.get("/api/health").json()["status"] == "ok"

def test_filters():
    response = client.get("/api/filters")
    assert response.status_code == 200
    assert response.json()["periods"] == ["3m", "6m", "12m", "Tudo"]

def test_local_frontend_origins_are_allowed():
    for origin in ("http://localhost:5174", "http://127.0.0.1:5174"):
        response = client.get("/api/health", headers={"Origin": origin})
        assert response.headers["access-control-allow-origin"] == origin

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

def test_forecast_respects_filters_and_returns_three_future_months():
    response = client.get("/api/forecast?period=6m&category=Tecnologia")
    assert response.status_code == 200
    body = response.json()
    assert body["history"]
    assert len(body["history"]) <= 7
    assert len(body["future"]) == 3
    assert body["period"] == body["future"][0]["date"]
    assert body["prediction"] == body["future"][0]["prediction"]
    assert body["future"][0]["date"] < body["future"][1]["date"] < body["future"][2]["date"]
