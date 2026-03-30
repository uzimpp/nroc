"""
mqtt_manager.py — MQTT connection, publish, and subscribe
  - connect()          : connect + subscribe, return True/False
  - publish(payload)   : publish dict as JSON
  - check_messages()   : poll for incoming messages
  - disconnect()       : clean disconnect
"""

import ujson
from umqtt.robust import MQTTClient
import indicators
from config import (
    MQTT_BROKER, MQTT_USER, MQTT_PASS,
    MQTT_TOPIC_PUBLISH, MQTT_TOPIC_SUBSCRIBE,
)

_mqtt = None


def _on_message(topic, payload):
    """Handle incoming MQTT messages."""
    try:
        msg   = payload.decode("utf-8").strip()
        topic = topic.decode("utf-8")
        print(f"<- Received on {topic}: {msg}")

        if topic == MQTT_TOPIC_SUBSCRIBE:
            if msg == "1":
                print("  🔊 Buzzer ON (from broker)")
                indicators.beep_on()
            elif msg == "0":
                print("  🔇 Buzzer OFF (from broker)")
                indicators.beep_off()
            else:
                print(f"  ⚠️  Invalid command: {msg} (use 0 or 1)")

    except Exception as e:
        print(f"MQTT callback error: {e}")


def connect() -> bool:
    """
    Connect to the MQTT broker and subscribe to the control topic.
    Returns True on success.
    """
    global _mqtt
    print(f"\nConnecting to MQTT broker: {MQTT_BROKER}...")
    try:
        _mqtt = MQTTClient(
            client_id="corn_sensor_b6710545571",
            server=MQTT_BROKER,
            user=MQTT_USER,
            password=MQTT_PASS,
        )
        _mqtt.set_callback(_on_message)
        _mqtt.connect()
        _mqtt.subscribe(MQTT_TOPIC_SUBSCRIBE)
        print(f"✓ MQTT Connected and subscribed to {MQTT_TOPIC_SUBSCRIBE}")
        print(f"  Send '1' to turn ON buzzer, '0' to turn OFF")
        return True
    except Exception as e:
        print(f"✗ MQTT Connection Error: {e}")
        _mqtt = None
        return False


def publish(payload: dict) -> bool:
    """
    Serialise `payload` as JSON and publish to the sensor topic.
    Attempts one reconnect on failure. Returns True on success.
    """
    global _mqtt
    if _mqtt is None:
        print("✗ MQTT not connected, skipping publish")
        return False
    try:
        msg = ujson.dumps(payload)
        _mqtt.publish(MQTT_TOPIC_PUBLISH, msg.encode("utf-8"))
        print(f"✓ Published to {MQTT_TOPIC_PUBLISH}")
        print(f"  Payload: {msg}")
        return True
    except Exception as e:
        print(f"✗ MQTT Publish Error: {e}")
        _reconnect()
        return False


def check_messages():
    """Non-blocking poll for incoming MQTT messages."""
    global _mqtt
    if _mqtt:
        try:
            _mqtt.check_msg()
        except Exception as e:
            print(f"MQTT check error: {e}")
            _mqtt = None


def disconnect():
    global _mqtt
    if _mqtt:
        try:
            _mqtt.disconnect()
            print("✓ MQTT disconnected")
        except Exception:
            pass
        _mqtt = None


def is_connected() -> bool:
    return _mqtt is not None


# ── Private ──────────────────────────────────────────────────────────────────

def _reconnect():
    global _mqtt
    print("[MQTT] Attempting to reconnect...")
    try:
        _mqtt.disconnect()
    except Exception:
        pass
    _mqtt = None
    connect()