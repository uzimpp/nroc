"""
main.py — IoT Corn Sensor System entry point

Module layout:
  config.py        — all constants (WiFi, MQTT, pins, calibration)
  sensors.py       — LM73 / LDR / DHT11 / soil-moisture reads
  indicators.py    — buzzer + LEDs
  wifi_manager.py  — WiFi connect / status
  mqtt_manager.py  — MQTT connect / publish / subscribe
  utils.py         — shared helpers (now_str, …)
"""

import time
import wifi_manager
import mqtt_manager
import indicators
import sensors
import utils
from config import DEVICE_LAT, DEVICE_LON, PUBLISH_INTERVAL

# ── Boot ─────────────────────────────────────────────────────────────────────
print("\n" + "=" * 60)
print("IoT Corn Sensor System Starting...")
print("=" * 60)

wifi_manager.connect()
mqtt_manager.connect()

indicators.wifi_led(True)
indicators.green_pulse()

print("\n" + "=" * 60)
print("Ready! Publishing every 10 minutes. Listening for commands...")
print("=" * 60 + "\n")

# ── Main loop ─────────────────────────────────────────────────────────────────
last_publish    = 0
heartbeat_timer = 0

try:
    while True:
        now = time.ticks_ms()

        # Heartbeat LED — every 1 second
        if time.ticks_diff(now, heartbeat_timer) >= 1000:
            heartbeat_timer = now
            indicators.green_pulse()

        # Poll for incoming MQTT commands
        mqtt_manager.check_messages()

        # Publish sensor data — every PUBLISH_INTERVAL seconds
        if time.ticks_diff(now, last_publish) >= PUBLISH_INTERVAL * 1000:
            last_publish = now
            dt = utils.now_str()

            print("\n" + "=" * 60)
            print(f"[{dt}] Publishing sensor data...")
            print("=" * 60)

            # Read sensors
            data = sensors.read_all()
            print(f"  Temperature (I2C):  {data['temp_i2c']}°C")
            print(f"  Temperature (DHT):  {data['temperature']}°C")
            print(f"  Humidity:           {data['humidity']}%")
            print(f"  Light:              {data['light']} lux")
            print(f"  Moisture:           {data['moisture']}% (raw: {data['moisture_raw']})")

            payload = {
                "datetime"    : dt,
                "lat"         : DEVICE_LAT,
                "lon"         : DEVICE_LON,
                "temp_i2c"    : data["temp_i2c"],
                "light"       : data["light"],
                "temperature" : data["temperature"],
                "humidity"    : data["humidity"],
                "moisture"    : data["moisture"],
                "moisture_raw": data["moisture_raw"],
            }

            if mqtt_manager.publish(payload):
                indicators.beep_success()
            else:
                indicators.beep_error()

            print("=" * 60 + "\n")

        time.sleep_ms(10)

except KeyboardInterrupt:
    print("\n[Done] Stopped by user. Cleaning up...")
    mqtt_manager.disconnect()
    indicators.beep_off()
    print("[Done] Done. Goodbye!")

except Exception as e:
    print(f"\n[Error] Fatal error: {e}")
    import traceback
    traceback.print_exc()