from datetime import datetime
from constants import CORN_PRODUCTS
from scraper import fetch_prices, save_to_csv
import os

def run_historical():
    # Start date: Jan 1st, 2024
    start_dt = datetime(2024, 1, 1)
    end_dt   = datetime.now()
    
    # Create data directory if not exists
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"[Dir] Created data directory: {data_dir}")

    for product_id, product_name in CORN_PRODUCTS.items():
        print(f"[Corn] Fetching Historical Data for: {product_name} (ID: {product_id})")
        print(f"   [Date] {start_dt.date()} -> {end_dt.date()}")
        
        records = fetch_prices(product_id, start_dt, end_dt)
        
        if records:
            filename = f"corn_{product_id}.csv"
            filepath = os.path.join(data_dir, filename)
            save_to_csv(filepath, records, product_id, product_name)
        else:
            print(f"   [Warning] No records found for {product_name}")

if __name__ == "__main__":
    run_historical()
