"""Simulate one ESP32: send telemetry over verified TLS, receive storage acks."""
import json
import logging
import os
import random
import ssl
import threading
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
import paho.mqtt.client as mqtt


def generate_values():
    values = {}
    for i in range(1, 7):
        values[f"T_A{i}"] = round(random.uniform(20, 28), 1)
        values[f"H_A{i}"] = round(random.uniform(50, 75), 1)
    for i in range(1, 13):
        values[f"T_S{i}"] = round(random.uniform(18, 25), 1)
        values[f"H_S{i}"] = round(random.uniform(40, 70), 1)
        values[f"C_S{i}"] = round(random.uniform(0.5, 2), 2)
        values[f"PH_S{i}"] = round(random.uniform(6, 7.5), 1)
    values.update({
        "CO2_A": round(random.uniform(400, 800), 1),
        "O2_A": round(random.uniform(20, 21), 1),
        "P1_A": round(random.uniform(0, 2), 2),
        "P2_A": round(random.uniform(0, 2), 2),
        "O_eau": round(random.uniform(5, 9), 1),
        "PH_eau": round(random.uniform(6.5, 7.5), 1),
        "LEVEL_eau": random.randint(50, 90),
    })
    return values


def main():
    load_dotenv(Path(__file__).with_name(".env"))
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(message)s")
    host = os.environ["MQTT_HOST"]
    device_id = os.getenv("MQTT_DEVICE_ID", "esp32-sim-01")
    if not device_id or len(device_id) > 64 or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-" for c in device_id):
        raise ValueError("Invalid MQTT_DEVICE_ID")
    interval = float(os.getenv("MQTT_INTERVAL_SECONDS", "5"))
    if interval <= 0:
        raise ValueError("MQTT_INTERVAL_SECONDS must be positive")
    connected = threading.Event()
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id=f"{device_id}-{uuid.uuid4().hex[:8]}")
    client.username_pw_set(os.environ["MQTT_USERNAME"], os.environ["MQTT_PASSWORD"])
    client.tls_set(ca_certs=os.getenv("MQTT_CA_FILE") or None, tls_version=ssl.PROTOCOL_TLS_CLIENT)
    client.enable_logger()
    client.reconnect_delay_set(min_delay=1, max_delay=30)
    client.max_queued_messages_set(10)

    def on_connect(client, userdata, flags, reason_code, properties):
        if reason_code.is_failure:
            logging.error("Broker rejected connection: %s", reason_code)
            return
        # Publishing starts only after the broker confirms the ack subscription.
        client.subscribe(f"devices/{device_id}/ack", qos=1)

    def on_subscribe(client, userdata, mid, reason_codes, properties):
        if any(code.is_failure for code in reason_codes):
            logging.error("Broker denied acknowledgment subscription")
            return
        connected.set()
        logging.info("Connected via MQTTS to %s; publishing as %s", host, device_id)

    def on_disconnect(client, userdata, flags, reason_code, properties):
        connected.clear()
        logging.info("Disconnected; MQTT client will retry")

    def on_message(client, userdata, message):
        logging.info("Server acknowledgment: %s", message.payload.decode("utf-8", errors="replace"))

    client.on_connect = on_connect
    client.on_subscribe = on_subscribe
    client.on_disconnect = on_disconnect
    client.on_message = on_message
    client.connect_async(host, int(os.getenv("MQTT_PORT", "8883")), keepalive=60)
    client.loop_start()
    try:
        while True:
            if not connected.wait(timeout=10):
                logging.info("Waiting for TLS connection / broker subscription")
                continue
            message = {
                "messageId": uuid.uuid4().hex,
                "sentAt": datetime.now(timezone.utc).isoformat(),
                "values": generate_values(),
            }
            info = client.publish(f"devices/{device_id}/telemetry", json.dumps(message), qos=1, retain=False)
            if info.rc != mqtt.MQTT_ERR_SUCCESS:
                logging.warning("Publish not queued: %s", mqtt.error_string(info.rc))
            else:
                try:
                    info.wait_for_publish(timeout=10)
                except RuntimeError as error:
                    logging.warning("Publish interrupted: %s", error)
                logging.info("Telemetry %s: broker acknowledged=%s", message["messageId"], info.is_published())
            threading.Event().wait(interval)
    except KeyboardInterrupt:
        logging.info("Stopping simulator")
    finally:
        client.disconnect()
        client.loop_stop()


if __name__ == "__main__":
    main()
