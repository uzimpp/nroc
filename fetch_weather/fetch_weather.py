from datetime import datetime

import requests

BASE_URL = "https://data.tmd.go.th/nwpapi/v1/forecast/location"


def get_hourly_forecast(
    lat: float,
    lon: float,
    hours: int,
    api_key: str,
    fields: str = "tc",
    extra_params: dict = {},
):
    """
    Fetches high-resolution hourly weather forecast data for up to 48 hours.

    Args:
        lat (float): Latitude of the location.
        lon (float): Longitude of the location.
        hours (int): Number of hours to forecast ahead (Maximum: 48).
        api_key (str): TMD API Key (JWT Token).
        fields (str, optional): Weather variables to retrieve, separated by commas. Defaults to "tc".
        extra_params (dict, optional): Additional parameters to append or override (e.g., {"hour": 13}).

    Available Fields (Hourly):
        - tc: Surface temperature (°C)
        - rh: Surface relative humidity (%)
        - slp: Sea level pressure (hpa)
        - rain: Hourly rain volume (mm)
        - ws10m: Wind speed at 10m height (m/s) *Note: Multiply by 1.94 for knots
        - wd10m: Wind direction at 10m height (degree)
        - wsNNN: Wind speed at pressure level NNN hpa (m/s) *Levels: 925, 850, 700, 500, 200
        - wdNNN: Wind direction at pressure level NNN hpa (degree)
        - cloudlow: Cloud fraction at low level (%)
        - cloudmed: Cloud fraction at medium level (%)
        - cloudhigh: Cloud fraction at high level (%)
        - cond: Weather condition (1=Clear, 2=Partly cloudy, 3=Cloudy, 4=Overcast,
                5=Light rain, 6=Moderate rain, 7=Heavy rain, 8=Thunderstorm,
                9=Very cold, 10=Cold, 11=Cool, 12=Very hot)

    Returns:
        list: A list of hourly weather forecast data points, or None if the request fails.

    Raises:
        ValueError: If the requested hours exceed the 48-hour limit.
    """
    if hours > 48:
        raise ValueError("Hourly forecast limit is 48 hours.")

    url = f"{BASE_URL}/hourly/at"

    params = {
        "lat": lat,
        "lon": lon,
        "fields": fields,
        "duration": hours,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "hour": 7,
    }

    if extra_params:
        params.update(extra_params)

    headers = {"accept": "application/json", "authorization": f"Bearer {api_key}"}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    return None


def get_daily_forecast(
    lat: float,
    lon: float,
    days: int,
    api_key: str,
    fields: str = "tc_max,tc_min",
    extra_params: dict = {},
):
    """
    Fetches medium-range daily (3-hourly interval) weather forecast data for up to 7 days.

    Args:
        lat (float): Latitude of the location.
        lon (float): Longitude of the location.
        days (int): Number of days to forecast ahead (Maximum: 7).
        api_key (str): TMD API Key (JWT Token).
        fields (str, optional): Weather variables to retrieve, separated by commas. Defaults to "tc_max,tc_min".
        extra_params (dict, optional): Additional parameters to append or override (e.g., {"hour": 13}).

    Available Fields (Daily):
        - tc_max: Max surface temperature (°C)
        - tc_min: Min surface temperature (°C)
        - rh: Average surface relative humidity (%)
        - slp: Average sea level pressure (hpa)
        - psfc: Surface pressure (Pa)
        - rain: 24-hour total rain volume (mm)
        - ws10m: Max wind speed at 10m height (m/s) *Note: Multiply by 1.94 for knots
        - wd10m: Max wind direction at 10m height (degree)
        - wsNNN: Max wind speed at pressure level NNN hpa (m/s) *Levels: 925, 850, 700, 500, 200
        - wdNNN: Max wind direction at pressure level NNN hpa (degree)
        - cloudlow: Average cloud fraction at low level (%)
        - cloudmed: Average cloud fraction at medium level (%)
        - cloudhigh: Average cloud fraction at high level (%)
        - swdown: Downward short wave flux at ground surface (W m-2)
        - cond: Weather condition (1=Clear, 2=Partly cloudy, 3=Cloudy, 4=Overcast,
                5=Light rain, 6=Moderate rain, 7=Heavy rain, 8=Thunderstorm,
                9=Very cold, 10=Cold, 11=Cool, 12=Very hot)

    Returns:
        list: A list of daily weather forecast data points, or None if the request fails.

    Raises:
        ValueError: If the requested days exceed the 7-day limit.
    """
    if days > 7:
        raise ValueError("Daily forecast limit is 7 days.")

    url = f"{BASE_URL}/daily/at"

    params = {
        "lat": lat,
        "lon": lon,
        "fields": fields,
        "duration": days * 24,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "hour": 7,
    }

    if extra_params:
        params.update(extra_params)

    headers = {"accept": "application/json", "authorization": f"Bearer {api_key}"}

    response = requests.get(url, headers=headers, params=params)
    if response.status_code == 200:
        return response.json()
    return None


if __name__ == "__main__":
    import os

    from dotenv import load_dotenv

    load_dotenv()
    API_KEY = os.getenv("API_KEY")

    if not API_KEY:
        print("Error: API_KEY not found. Please check your .env file.")
    else:
        # Example 1: Use defaults (Only gets 'tc' for hourly)
        print("--- Default Hourly Data ---")
        default_hourly = get_hourly_forecast(13.75, 100.50, hours=24, api_key=API_KEY)
        print(default_hourly)

        # Example 2: Override fields to get rain and wind, and change the hour via extra_params
        print("\n--- Custom Daily Data ---")
        custom_daily = get_daily_forecast(
            lat=13.75,
            lon=100.50,
            days=3,
            api_key=API_KEY,
            fields="tc_max,tc_min,rain,ws10m",
            extra_params={"hour": 13},
        )
        print(custom_daily)
