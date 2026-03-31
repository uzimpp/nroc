"""
wifi_manager.py — WiFi connection helper
  - connect() : connect to AP, return True/False
  - is_up()   : quick connection check
"""

import network
import time
from config import WIFI_SSID, WIFI_PASS

_wlan = network.WLAN(network.STA_IF)


def connect(retries: int = 20) -> bool:
    """
    Activate interface and connect to the configured SSID.
    Returns True if connected within `retries` seconds.
    """
    _wlan.active(True)

    if _wlan.isconnected():
        print(f"WiFi already connected: {_wlan.ifconfig()[0]}")
        return True

    print(f"Connecting to WiFi: {WIFI_SSID}...")
    _wlan.connect(WIFI_SSID, WIFI_PASS)

    for attempt in range(1, retries + 1):
        if _wlan.isconnected():
            print(f"WiFi Connected! IP: {_wlan.ifconfig()[0]}")
            return True
        print(f"Attempt {attempt}/{retries}...")
        time.sleep(1)

    print("WiFi connection failed! Continuing without WiFi.")
    return False


def is_up() -> bool:
    return _wlan.isconnected()