"""Gera vendas sintéticas determinísticas para demonstração local."""
from pathlib import Path
import random
import pandas as pd

random.seed(42)
ROOT = Path(__file__).resolve().parents[1]
products = {"Tecnologia": [("Fone Studio", 289), ("Teclado Mecânico", 459), ("Hub USB-C", 199), ("Webcam Pro", 349)], "Casa & Vida": [("Garrafa Térmica", 119), ("Luminária Arc", 249), ("Manta Nuvem", 179)], "Acessórios": [("Mochila Urban", 329), ("Carteira Slim", 149), ("Óculos Solar", 219)]}
segments = ["Essencial", "Conectado", "Premium"]
rows = []
for day in pd.date_range("2024-01-01", "2025-12-31", freq="D"):
    volume = random.choices([0, 1, 2, 3, 4], weights=[.56, .27, .12, .04, .01])[0]
    if day.month in (11, 12): volume += 1
    for _ in range(volume):
        category = random.choice(list(products))
        product, price = random.choice(products[category])
        quantity = random.choices([1, 2, 3], [0.82, 0.15, .03])[0]
        discount = random.choice([0, 0, 0, .05, .1])
        customer = random.randint(1001, 1800)
        rows.append({"pedido_id": f"PA-{len(rows)+1:06d}", "data": day.date().isoformat(), "cliente_id": f"C-{customer}", "segmento": segments[(customer // 7) % 3], "categoria": category, "produto": product, "quantidade": quantity, "preco_unitario": price, "desconto": discount, "receita": round(price * quantity * (1-discount), 2)})
out = ROOT / "dados" / "vendas.csv"
pd.DataFrame(rows).to_csv(out, index=False)
print(f"{len(rows)} registros gravados em {out}")
