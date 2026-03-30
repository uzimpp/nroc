from datetime import datetime, timedelta
from constants import CORN_PRODUCTS
from scraper import fetch_prices, save_to_csv
import os

def run_daily():
    # End date: today
    end_dt   = datetime.now()
    # Start date: 7 days ago to ensure overlap and data filling
    start_dt = end_dt - timedelta(days=7)
    
    # Locate data directory relative to this script
    data_dir = os.path.join(os.path.dirname(__file__), "data")
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"[Dir] Created data directory for daily fetch: {data_dir}")

    for product_id, product_name in CORN_PRODUCTS.items():
        print(f"[Update] Updating Daily Data for: {product_name} (ID: {product_id})")
        print(f"   [Date] {start_dt.date()} -> {end_dt.date()}")
        
        records = fetch_prices(product_id, start_dt, end_dt)
        
        if records:
            filename = f"corn_{product_id}.csv"
            filepath = os.path.join(data_dir, filename)
            # Append and deduplicate with existing records
            save_to_csv(filepath, records, product_id, product_name, append=True)
        else:
            print(f"   [Warning] No records found for {product_name} today")

if __name__ == "__main__":
    run_daily()
