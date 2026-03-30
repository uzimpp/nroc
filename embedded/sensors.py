"""
sensors.py — All sensor read functions
  - get_temp_i2c()   : LM73 via I2C
  - get_lux()        : LDR light sensor
  - read_dht11()     : DHT11 temperature + humidity
  - read_moisture()  : Capacitive soil moisture
"""

import math
import dht
from machine import I2C, ADC, Pin
from config import (
    PIN_SDA, PIN_SCL, LM73_ADDR, R1,
    PIN_LDR, PIN_DHT, PIN_MOISTURE,
    MOISTURE_DRY, MOISTURE_WET,
)

# ── I2C Temperature (LM73) ──────────────────────────────────────────────────
i2c = I2C(1, sda=Pin(PIN_SDA), scl=Pin(PIN_SCL))
try:
    i2c.writeto(LM73_ADDR, bytearray([4, 0x60]))
    i2c.writeto(LM73_ADDR, bytearray([0]))
    print("✓ I2C Temp Sensor initialized")
except Exception as e:
    print("✗ I2C Init Error:", e)

# ── LDR (Light) ─────────────────────────────────────────────────────────────
_ldr = ADC(Pin(PIN_LDR))
_m   = (math.log10(10000) - math.log10(0.1)) / (math.log10(100) - math.log10(1_000_000))
_c   = math.log10(0.1) - _m * math.log10(1_000_000)

# ── DHT11 ───────────────────────────────────────────────────────────────────
_dht = dht.DHT11(Pin(PIN_DHT))

# ── Soil Moisture ────────────────────────────────────────────────────────────
_moisture_adc = ADC(Pin(PIN_MOISTURE))
_moisture_adc.atten(ADC.ATTN_11DB)


# ── Public read functions ────────────────────────────────────────────────────

def get_temp_i2c():
    """Return temperature (°C) from LM73, or None on error."""
    try:
        data  = i2c.readfrom(LM73_ADDR, 2)
        value = (data[0] << 8) | data[1]
        if value & 0x8000:
            value -= 65536
        return value / 128.0
    except Exception as e:
        print(f"I2C read error: {e}")
        return None


def get_lux():
    """Return light intensity in lux from LDR, or 0 on error."""
    try:
        v_a   = _ldr.read_uv() / 1_000_000
        v_a   = max(0.001, min(3.299, v_a))
        r_ldr = v_a * R1 / (3.3 - v_a)
        return 10 ** (_m * math.log10(r_ldr) + _c) if r_ldr > 0 else 0
    except Exception as e:
        print(f"LDR read error: {e}")
        return 0


def read_dht11():
    """Return (temperature °C, humidity %) from DHT11, or (None, None) on error."""
    try:
        _dht.measure()
        return _dht.temperature(), _dht.humidity()
    except Exception as e:
        print(f"DHT11 read error: {e}")
        return None, None


def read_moisture():
    """Return (moisture_pct, raw_adc) from soil sensor."""
    try:
        raw = _moisture_adc.read()
        pct = (MOISTURE_DRY - raw) / (MOISTURE_DRY - MOISTURE_WET) * 100
        pct = max(0.0, min(100.0, pct))
        return round(pct, 1), raw
    except Exception as e:
        print(f"Moisture read error: {e}")
        return 0, 0


def read_all():
    """Read every sensor and return a single dict."""
    temp_i2c          = get_temp_i2c()
    light             = get_lux()
    dht_temp, dht_hum = read_dht11()
    moist_pct, moist_raw = read_moisture()
    return {
        "temp_i2c"     : temp_i2c,
        "light"        : round(light, 2),
        "temperature"  : dht_temp,
        "humidity"     : dht_hum,
        "moisture"     : moist_pct,
        "moisture_raw" : moist_raw,
    }