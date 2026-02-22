from __future__ import annotations

import csv
import json
from datetime import date, datetime
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
INPUT_FILES = [
    BASE_DIR / "data" / "sql42_complementar.csv",
    BASE_DIR / "data" / "topcon_ultimo_consumo.csv",
]
OUTPUT_FILE = BASE_DIR / "alerts.json"

DATE_COLUMNS = ["DataUltimaRemessa", "Data_ultima_remessa", "data_ultima_remessa", "UltimaRemessa"]
CLIENT_CODE_COLUMNS = ["CodCliente", "CodigoCliente", "Cliente", "Cod_Cliente"]
CLIENT_NAME_COLUMNS = ["NomeCliente", "Nome", "RazaoSocial", "ClienteNome"]


def parse_date(value: str) -> date | None:
    value = (value or "").strip()
    if not value:
        return None

    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    return None


def first_value(row: dict[str, str], candidates: list[str], default: str = "") -> str:
    for key in candidates:
        if key in row and str(row.get(key, "")).strip():
            return str(row[key]).strip()
    return default


def read_csv_rows(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []

    content = path.read_text(encoding="utf-8").splitlines()
    if not content:
        return []

    delimiter = ";" if content[0].count(";") > content[0].count(",") else ","
    with path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle, delimiter=delimiter)
        return [dict(row) for row in reader]


def main() -> None:
    today = date.today()
    alerts: list[dict[str, str | int]] = []

    for csv_file in INPUT_FILES:
        for row in read_csv_rows(csv_file):
            remessa_raw = first_value(row, DATE_COLUMNS)
            last_shipment = parse_date(remessa_raw)
            if not last_shipment:
                continue

            days_without = (today - last_shipment).days
            if days_without <= 7:
                continue

            client_code = first_value(row, CLIENT_CODE_COLUMNS, "SEM_COD")
            client_name = first_value(row, CLIENT_NAME_COLUMNS, "Cliente sem nome")

            alerts.append(
                {
                    "Fonte": csv_file.name,
                    "CodCliente": client_code,
                    "NomeCliente": client_name,
                    "DataUltimaRemessa": last_shipment.isoformat(),
                    "DiasSemRemessa": days_without,
                    "Status": "PLANO_DE_ACAO",
                    "Acao": "Criar PLANO DE AÇÃO",
                }
            )

    alerts.sort(key=lambda item: int(item["DiasSemRemessa"]), reverse=True)

    payload = {
        "gerado_em": today.isoformat(),
        "regra": "data_hoje - data_ultima_remessa > 7",
        "total_alertas": len(alerts),
        "alertas": alerts,
    }

    OUTPUT_FILE.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {len(alerts)} alertas gerados em {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
