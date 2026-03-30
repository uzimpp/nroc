import csv
import os
import time
import requests
from datetime import datetime, timedelta
from constants import API_URL

HEADERS = {
    "accept": "application/json, text/plain, */*",
    "origin": "https://talaadthai.com",
    "referer": "https://talaadthai.com/",
    "user-agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
}

def to_ms(dt):
    """Convert datetime to milliseconds timestamp."""
    return int(dt.timestamp() * 1000)

def fetch_prices(product_id: int, start: datetime, end: datetime) -> list:
    """Fetch prices for a given product ID and date range via direct HTTP requests."""
    captured = []
    session = requests.Session()
    session.headers.update(HEADERS)

    total_days = (end - start).days
    chunk_days = 30  # 30-day chunks = much fewer requests
    total_chunks = total_days // chunk_days + 1
    chunk_num = 0
    current = start

    while current < end:
        chunk_end = min(current + timedelta(days=chunk_days), end)
        chunk_num += 1

        if chunk_num % 5 == 0 or chunk_num == 1:
            print(f"    [Progress] Chunk {chunk_num}/{total_chunks}: {current.date()} -> {chunk_end.date()}...")

        params = {
            "productId": product_id,
            "dateFrom": to_ms(current),
            "dateTo": to_ms(chunk_end),
            "sumBy": "day",
        }

        max_retries = 3
        for attempt in range(max_retries):
            try:
                r = session.get(API_URL, params=params, timeout=30)
                r.raise_for_status()
                items = r.json().get("data", {}).get("items", [])
                captured.extend(items)
                break  # success
            except Exception as e:
                if attempt < max_retries - 1:
                    wait_sec = (attempt + 1) * 3
                    print(f"    [Retry] Chunk {chunk_num} failed (attempt {attempt+1}/{max_retries}). Retrying in {wait_sec}s... ({e})")
                    time.sleep(wait_sec)
                else:
                    print(f"    [Error] Chunk {chunk_num} failed permanently: {e}")
                    time.sleep(10)  # cooldown after permanent failure

        time.sleep(0.5)  # polite delay between chunks
        current = chunk_end + timedelta(days=1)

    return captured

def save_to_csv(filepath: str, records: list, product_id: int, product_name: str, append: bool = False):
    """Save records to CSV with deduplication."""
    seen = {}

    # Load existing data if appending
    if append and os.path.exists(filepath):
        try:
            with open(filepath, "r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    seen[row["date"]] = (float(row["price_min"]), float(row["price_max"]))
        except Exception as e:
            print(f"  [Warning] Could not read existing file for deduplication: {e}")

    # Process new records — API returns date strings like "dd/mm/yyyy"
    for r in records:
        date_raw = r.get("date")
        if isinstance(date_raw, (int, float)):
            date_str = datetime.fromtimestamp(date_raw / 1000).strftime("%Y-%m-%d")
        elif isinstance(date_raw, str) and "/" in date_raw:
            # Parse "dd/mm/yyyy" format
            date_str = datetime.strptime(date_raw, "%d/%m/%Y").strftime("%Y-%m-%d")
        else:
            date_str = date_raw

        low = r.get("low")
        high = r.get("high")
        if low is not None and high is not None and date_str:
            seen[date_str] = (low, high)

    # Ensure output directory exists
    os.makedirs(os.path.dirname(os.path.abspath(filepath)), exist_ok=True)

    # Write to CSV sorted by date
    with open(filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["product_id", "product_name", "date", "price_min", "price_max", "unit", "fetched_at"])
        for date_str in sorted(seen.keys()):
            low, high = seen[date_str]
            writer.writerow([product_id, product_name, date_str, low, high, "กก.", datetime.now().isoformat()])

    print(f"  [Success] Saved {len(seen)} records to {filepath}")
