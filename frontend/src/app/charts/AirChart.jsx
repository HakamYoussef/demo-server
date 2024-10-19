"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const sensors = [
  { id: "H_A1", label: "Sensor 1", humdLabel: "H_A1", color: "blue", tempLabel: "T_A1", tempColor: "red" },
  { id: "H_A2", label: "Sensor 2", humdLabel: "H_A2", color: "blue", tempLabel: "T_A2", tempColor: "red" },
  { id: "H_A3", label: "Sensor 3", humdLabel: "H_A3", color: "blue", tempLabel: "T_A3", tempColor: "red" },
  { id: "H_A4", label: "Sensor 4", humdLabel: "H_A4", color: "blue", tempLabel: "T_A4", tempColor: "red" },
  { id: "H_A5", label: "Sensor 5", humdLabel: "H_A5", color: "blue", tempLabel: "T_A5", tempColor: "red" },
  { id: "H_A6", label: "Sensor 6", humdLabel: "H_A6", color: "blue", tempLabel: "T_A6", tempColor: "red" },
];

const SINGLE_SENSOR_CONFIG = [
  { id: "o2_a", title: "O2", key: "O2_A", color: "green" },
  { id: "co2_a", title: "CO2", key: "CO2_A", color: "orange" },
  { id: "p1_a", title: "Internal Pyranometer", key: "P1_A", color: "purple" },
  { id: "p2_a", title: "External Pyranometer", key: "P2_A", color: "red" },
];

const SensorPlot = ({ data, dates, sensor, layout }) => {
  const sensorData = [
    {
      x: dates,
      y: data.map(entry => entry[sensor.humdLabel] ?? entry[sensor.key] ?? null),
      type: "scatter",
      mode: "lines+markers",
      name: `${sensor.label ?? sensor.key}`,
      marker: { color: sensor.color },
    },
    {
      x: dates,
      y: data.map(entry => entry[sensor.tempLabel] ?? null),
      type: "scatter",
      mode: "lines+markers",
      name: `${sensor.label ?? null}`,
      marker: { color: sensor.tempColor },
    },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold flex justify-center pt-2">{sensor.label ?? sensor.title}</h2>
      <Plot data={sensorData} layout={layout} className="js-plotly-plot" />
    </div>
  );
};

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(sensors[0]);

  useEffect(() => {
    fetch("http://213.199.35.129:5002/api/capteurs/dataa")
      .then((response) => response.json())
      .then((data) => {
        setChartData(data);

        const parsedDates = data.map((entry) => {
          const date = new Date(entry.timestamp);
          return isNaN(date.getTime()) ? null : date;
        });
        setDates(parsedDates);
      })
      .catch((err) => console.log(err));
  }, []);

  const layout = {
    title: "",
    xaxis: {
      title: "Date",
      type: "date",
    },
    yaxis: {
      title: "Value",
    },
    width: 1200,
    height: 500,
  };

  const handleSensorChange = (e) => {
    const selectedId = e.target.value;
    const allSensors = [...sensors, ...SINGLE_SENSOR_CONFIG];
    setSelectedSensor(allSensors.find((sensor) => sensor.id === selectedId));
  };

  return (
    <div>
      <h1 className="text-3xl font-semibold px-2.5 py-2">Sensor Dashboard</h1>

      <label className="block mx-2">
        Select Sensor:
        <select
          className="border px-3 py-2 mx-3"
          value={selectedSensor.id}
          onChange={handleSensorChange}
        >
          {[...sensors, ...SINGLE_SENSOR_CONFIG].map((sensor) => (
            <option key={sensor.id} value={sensor.id}>
              {sensor.label || sensor.title}
            </option>
          ))}
        </select>
      </label>

      {selectedSensor && (
        <SensorPlot data={chartData} dates={dates} sensor={selectedSensor} layout={layout} />
      )}
    </div>
  );
};

export default Dashboard;
