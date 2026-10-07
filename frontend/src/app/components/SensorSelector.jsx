"use client";

import styles from "./SensorSelector.module.css";

export default function SensorSelector({ sensors, value, onChange }) {
  return (
    <div className={styles.selector} role="group" aria-label="Sensor type">
      {sensors.map(sensor => (
        <button
          key={sensor.key}
          type="button"
          className={styles.button}
          aria-pressed={value === sensor.key}
          aria-label={sensor.label}
          onClick={() => onChange(sensor.key)}
        >
          <span className={styles.icon} aria-hidden="true">{sensor.icon}</span>
          <span className={styles.mobileLabel}>{sensor.shortLabel || sensor.label}</span>
          <span className={styles.fullLabel}>{sensor.label}</span>
        </button>
      ))}
    </div>
  );
}
