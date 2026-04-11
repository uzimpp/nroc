import os
import requests
import json
from dotenv import load_dotenv

load_dotenv('/Users/napat/Desktop/nroc/fetch_weather/.env')
api_key = os.getenv('API_KEY')

url = "https://data.tmd.go.th/nwpapi/v1/forecast/location/daily/at"
params = {
    "lat": 13.75,
    "lon": 100.50,
    "fields": "tc_max,tc_min",
    "duration": 7 * 24,
    "date": "2026-04-11",
    "hour": 7,
}
headers = {"accept": "application/json", "authorization": f"Bearer {api_key}"}

print(f"Requesting {url} with params {params}")
res = requests.get(url, headers=headers, params=params)
print("Status code:", res.status_code)
print("Response text:", res.text)
