# Data Collections Overview

This backend uses MongoDB to persist radiation settings and Arduino readings.

## `radiations`
* **Model:** `Radiation` (`api/models/Radiation.mjs`)
* **Purpose:** Stores the latest voltage configuration submitted from the dashboard (`Vbas` and `Vhaut`).
* **Accessed by:**
  * `getConfig` controller (`api/controllers/arduino-controller.mjs`) retrieves the most recent document to serve the dashboard and hardware clients.
  * Configuration submission endpoints update this collection with new values.

## `arduino_readings`
* **Model:** `ArduinoReading` (`api/models/arduino-reading.mjs`)
* **Purpose:** Captures incoming sensor measurements from the Arduino device. Each document includes the `comptage` count, `pic` value, and the reading `time`.
* **Accessed by:**
  * `postComptage` controller (`api/controllers/arduino-controller.mjs`) validates and saves readings coming from the hardware.
  * `getComptage` controller (`api/controllers/arduino-controller.mjs`) queries the collection, normalizes legacy timestamps, and returns the readings to clients.
* **Sample data generator:** `api/reading_data_generator.py` can be run to insert test readings that follow the `comptage`, `pic`, `time` document shape.

These are the primary collections queried when the API responds to requests for configuration and sensor data.
