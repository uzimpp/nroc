# TalaadThai Corn Price Fetcher

This project contains scripts to fetch historical and daily price data for sweet corn from the TalaadThai API.

## Project Structure

- `data/`: Directory where fetched CSV files are stored.
- `constants.py`: Contains product IDs and API configuration.
- `scraper.py`: Shared scraping logic via direct HTTP requests to the TalaadThai API.
- `fetch_historical.py`: Script to fetch all historical data from **2024-01-01**.
- `fetch_daily.py`: Script for daily incremental updates (fetches last 7 days to fill gaps).

## Monitored Products

| ID  | Product Name | Output File |
|:---:|--------------|-------------|
| 206 | ข้าวโพดหวาน – เบอร์กลาง | `data/corn_206.csv` |
| 216 | ข้าวโพดหวาน – เบอร์เล็ก | `data/corn_216.csv` |
| 182 | ข้าวโพดหวาน – เบอร์ใหญ่ | `data/corn_182.csv` |

## Setup

1. **Install Dependencies**:
   Ensure you have Python 3 installed and the required packages.
   ```bash
   pip install -r requirements.txt
   ```

2. **Fetch Historical Data**:
   Run this once to populate the initial database starting from 2024.
   ```bash
   python3 fetch_historical.py
   ```

3. **Daily Updates**:
   Run this script daily to keep the data up to date. It will append new data to existing CSVs and ensure no duplicates.
   ```bash
   python3 fetch_daily.py
   ```

## Requirements
- Python 3.10+
- `requests` library
- Internet connection (access to talaadthai.com)
