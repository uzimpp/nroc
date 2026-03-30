"""
indicators.py — Buzzer and LED helpers
  - setup()         : initialise all pins
  - beep_success()  : short 880 Hz beep
  - beep_error()    : long 200 Hz beep
  - beep_on()       : buzzer on (remote command)
  - beep_off()      : buzzer off (remote command)
  - wifi_led(state) : set WiFi LED
  - green_pulse()   : 50 ms heartbeat flash
"""

import time
from machine import PWM, Pin
from config import PIN_BUZZER, PIN_LED_WIFI, PIN_LED_GREEN

buzzer    = PWM(Pin(PIN_BUZZER))
led_wifi  = Pin(PIN_LED_WIFI,  Pin.OUT)
led_green = Pin(PIN_LED_GREEN, Pin.OUT)

buzzer.duty(0)


def beep_success():
    buzzer.freq(880)
    buzzer.duty(67)
    led_wifi.value(0)
    time.sleep_ms(100)
    buzzer.duty(0)
    led_wifi.value(1)


def beep_error():
    buzzer.freq(200)
    buzzer.duty(67)
    led_wifi.value(0)
    time.sleep_ms(500)
    buzzer.duty(0)
    led_wifi.value(1)


def beep_on():
    """Turn buzzer on continuously (triggered by broker command '1')."""
    buzzer.freq(880)
    buzzer.duty(67)


def beep_off():
    """Turn buzzer off (triggered by broker command '0')."""
    buzzer.duty(0)


def wifi_led(state: bool):
    led_wifi.value(1 if state else 0)


def green_pulse():
    """50 ms heartbeat flash on green LED."""
    led_green.value(0)
    time.sleep_ms(50)
    led_green.value(1)