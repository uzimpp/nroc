import os

from .fetch_weather import get_daily_forecast, get_hourly_forecast

API_KEY = os.getenv("API_KEY")

if API_KEY is None:
    API_KEY = ""

if __name__ == "__main__":
    short_term_data = get_hourly_forecast(13.75, 100.50, hours=24, api_key=API_KEY)
    print(short_term_data)

    long_term_data = get_daily_forecast(13.75, 100.50, days=7, api_key=API_KEY)
    print(long_term_data)
