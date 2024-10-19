"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const sensors = [
  { id: "H_S1", label: "Sensor 1", humdLabel: "H_S1", color: "blue", tempLabel: "T_S1", tempColor: "red" },
  { id: "H_S2", label: "Sensor 2", humdLabel: "H_S2", color: "blue", tempLabel: "T_S2", tempColor: "red" },
  { id: "H_S3", label: "Sensor 3", humdLabel: "H_S3", color: "blue", tempLabel: "T_S3", tempColor: "red" },
  { id: "H_S4", label: "Sensor 4", humdLabel: "H_S4", color: "blue", tempLabel: "T_S4", tempColor: "red" },
  { id: "H_S5", label: "Sensor 5", humdLabel: "H_S5", color: "blue", tempLabel: "T_S5", tempColor: "red" },
  { id: "H_S6", label: "Sensor 6", humdLabel: "H_S6", color: "blue", tempLabel: "T_S6", tempColor: "red" },
  // Add more sensor configurations here...
];

const SensorPlot = ({ data, dates, sensor, layout }) => {
  const sensorData = [
    {
      x: dates,
      y: data.map(entry => entry[sensor.id] ?? null),
      type: "scatter",
      mode: "lines",
      name: sensor.humdLabel,
      marker: { color: sensor.color },
    },
    {
      x: dates,
      y: data.map(entry => entry[sensor.tempLabel] ?? null),
      type: "scatter",
      mode: "lines+markers",
      name: sensor.tempLabel,
      marker: { color: sensor.tempColor },
    },
  ];

  return (
    <div>
     <h2 className="text-xl font-semibold flex justify-center pt-2 ">{`${sensor.label} / ${sensor.tempLabel}`}</h2>
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

        const parsedDates = data.map(entry => {
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

  return (
    <div>
      <h1 className="text-3xl font-semibold px-2.5 py-2">Sensor Dashboard</h1>

      <label className="block mx-2">
        Select Sensor:
        <select
          className="border px-3 py-2 mx-2"
          value={selectedSensor.id}
          onChange={(e) => setSelectedSensor(sensors.find(sensor => sensor.id === e.target.value))}
        >
          {sensors.map(sensor => (
            <option key={sensor.id} value={sensor.id}>{sensor.label}</option>
          ))}
        </select>
      </label>
      {selectedSensor && (
        <SensorPlot
          data={chartData}
          dates={dates}
          sensor={selectedSensor}
          layout={layout}
        />
      )}
    </div>
  );
};

export default Dashboard;
