# IoT Corn Sensor System — Embedded

This folder contains the MicroPython firmware for the IoT Corn Sensor System. The system is designed to monitor environmental conditions (soil moisture, temperature, humidity, and light) and report data via MQTT.

## 📁 File Structure

- **`main.py`**: The entry point of the application. Handles the main loop and timing.
- **`config.py`**: System configuration, including pin definitions, sensor calibration, and `.env` loading.
- **`sensors.py`**: Driver logic for all connected sensors (LM73, LDR, DHT11, Soil Moisture).
- **`wifi_manager.py`**: Manages WiFi connectivity and reconnection logic.
- **`mqtt_manager.py`**: Handles MQTT connection, publishing sensor data, and subscribing to commands.
- **`indicators.py`**: Controls physical feedback elements (LEDs and Buzzer).
- **`utils.py`**: General helper functions (e.g., timestamp formatting).
- **`.env`**: (Generated) Private configuration for WiFi and MQTT credentials.
- **`.gitignore`**: Ensures sensitive files like `.env` are not committed to version control.

## ⚙️ Setup & Configuration

### 1. Environment Variables
Create a `.env` file in this directory with the following keys:

```env
WIFI_SSID="your_wifi_name"
WIFI_PASS="your_wifi_password"

MQTT_BROKER="iot.cpe.ku.ac.th"
MQTT_USER="your_mqtt_username"
MQTT_PASS="your_mqtt_password"
MQTT_TOPIC_PUBLISH="your/topic/sensors"
MQTT_TOPIC_SUBSCRIBE="your/topic/commands"
```

### 2. Hardware Pinout (ESP32/KB32)

| Component | Pin | Note |
| :--- | :--- | :--- |
| **I2C SDA** | 4 | For LM73 Temperature Sensor |
| **I2C SCL** | 5 | For LM73 Temperature Sensor |
| **LDR (Light)** | 36 | Analog Input |
| **DHT11** | 32 | Digital Input |
| **Soil Moisture** | 34 | Analog Input |
| **Buzzer** | 13 | Digital Output |
| **WiFi LED** | 2 | Status Indicator |
| **Green LED** | 12 | Heartbeat/Pulse Indicator |

## 🚀 How to Run

1. Flash MicroPython to your ESP32 board.
2. Upload all `.py` files and your strictly private `.env` file to the board's filesystem.
3. The board will automatically execute `main.py` on boot.
4. Serial logs will display the connection status and sensor readings.

## 📊 Sensor Calibration
Calibration values for the soil moisture sensor can be adjusted in `config.py`:
- `MOISTURE_DRY`: ADC value when the sensor is completely dry.
- `MOISTURE_WET`: ADC value when the sensor is in water.
