import os

def load_env(env_path=".env"):
    """
    Simple .env file loader for MicroPython. 
    Reads key-value pairs and returns a dict.
    """
    env_vars = {}
    try:
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'): continue
                if '=' in line:
                    key, value = line.split('=', 1)
                    # Clean up key, value, and strip quotes
                    key = key.strip()
                    value = value.strip().strip('"').strip("'")
                    env_vars[key] = value
    except OSError:
        print(f"Warning: {env_path} not found. Using defaults/empty strings.")
    return env_vars

_env = load_env()

# ===== WiFi & MQTT Configuration (from .env) =====
WIFI_SSID = _env.get("WIFI_SSID", "")
WIFI_PASS = _env.get("WIFI_PASS", "")

MQTT_BROKER = _env.get("MQTT_BROKER", "iot.cpe.ku.ac.th")
MQTT_USER   = _env.get("MQTT_USER",   "")
MQTT_PASS   = _env.get("MQTT_PASS",   "")
MQTT_TOPIC_PUBLISH   = _env.get("MQTT_TOPIC_PUBLISH",   "")
MQTT_TOPIC_SUBSCRIBE = _env.get("MQTT_TOPIC_SUBSCRIBE", "")

# ===== Device / Timing =====
DEVICE_LAT       = 13.7563
DEVICE_LON       = 100.5018
TZ_OFFSET        = 7
PUBLISH_INTERVAL = 300   # seconds (10 minutes)

# ===== Sensor Pin & Calibration =====
PIN_SDA        = 4
PIN_SCL        = 5
PIN_LDR        = 36
PIN_DHT        = 32
PIN_MOISTURE   = 34
LM73_ADDR      = 77
R1             = 33000
MOISTURE_DRY   = 3500
MOISTURE_WET   = 900

# ===== Indicator Pins =====
PIN_BUZZER    = 13
PIN_LED_WIFI  = 2
PIN_LED_GREEN = 12