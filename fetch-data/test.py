import csv
from datetime import datetime, timedelta
from playwright.sync_api import sync_playwright

PRODUCT_ID   = 182
PRODUCT_NAME = "ข้าวโพดหวาน – เบอร์ใหญ่"
OUTPUT_CSV   = "/PATH/price_history.csv"

def to_ms(dt): return int(dt.timestamp() * 1000)

def fetch_prices_playwright(start: datetime, end: datetime) -> list:
    captured = []

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        page.goto("https://talaadthai.com/products/corn-9827-2858", wait_until="networkidle")
        page.wait_for_timeout(2000)

        def on_response(response):
            if "ProductPricingGraphSummary" in response.url and "sumBy=day" in response.url:
                try:
                    raw = response.json()
                    items = raw.get("data", {}).get("items", [])
                    captured.extend(items)
                    print(f"  ✅ +{len(items)} records")
                except Exception as e:
                    print("  ❌", e)

        page.on("response", on_response)

        current = start
        chunk_num = 0
        while current < end:
            chunk_end = min(current + timedelta(days=7), end)
            chunk_num += 1
            print(f"[{chunk_num}] 📅 {current.date()} → {chunk_end.date()}")

            page.evaluate(f"""
                fetch('https://svc-center-ext-tlt-corp-prod-service.talaadthai.com/v1/ext/product/ProductPricingGraphSummary?' +
                    new URLSearchParams({{
                        productId: '{PRODUCT_ID}',
                        dateFrom:  '{to_ms(current)}',
                        dateTo:    '{to_ms(chunk_end)}',
                        sumBy:     'day'
                    }}), {{
                    headers: {{ 'accept': 'application/json, text/plain, */*', 'origin': 'https://talaadthai.com' }},
                    credentials: 'include'
                }})
            """)
            page.wait_for_timeout(1000)
            current = chunk_end + timedelta(days=1)

        browser.close()

    print(f"\n📦 รวมทั้งหมด {len(captured)} records จาก {chunk_num} chunks")
    return captured

def save_csv(path, records):
    # dedup โดย date เผื่อ chunk overlap
    seen = {}
    for r in records:
        date = r.get("date")
        if isinstance(date, (int, float)):
            date = datetime.fromtimestamp(date / 1000).strftime("%Y-%m-%d")
        seen[date] = (r.get("low"), r.get("high"))

    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["product_id","product_name","date","price_min","price_max","unit","fetched_at"])
        for date, (low, high) in sorted(seen.items()):
            writer.writerow([PRODUCT_ID, PRODUCT_NAME, date, low, high, "กก.", datetime.now().isoformat()])

    print(f"✅ บันทึก {len(seen)} แถว (หลัง dedup) → {path}")

if __name__ == "__main__":
    end_dt   = datetime.now()
    start_dt = end_dt - timedelta(days=365*2)

    print(f"🌽 ดึงราคา {start_dt.date()} → {end_dt.date()}")
    records = fetch_prices_playwright(start_dt, end_dt)

    if records:
        print("🔍 ตัวอย่าง 3 แถวแรก:", records[:3])
        save_csv(OUTPUT_CSV, records)