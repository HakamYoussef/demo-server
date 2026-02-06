"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaCloud, FaFilter, FaChartBar, FaChartArea } from "react-icons/fa";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const sensors = [
  { id: "H_A1", label: "Sensor 1", humdLabel: "Humidity 1", color: "#10b981", tempLabel: "T_A1", tempColor: "#ef4444" },
  { id: "H_A2", label: "Sensor 2", humdLabel: "Humidity 2", color: "#10b981", tempLabel: "T_A2", tempColor: "#ef4444" },
  { id: "H_A3", label: "Sensor 3", humdLabel: "Humidity 3", color: "#10b981", tempLabel: "T_A3", tempColor: "#ef4444" },
  { id: "H_A4", label: "Sensor 4", humdLabel: "Humidity 4", color: "#10b981", tempLabel: "T_A4", tempColor: "#ef4444" },
  { id: "H_A5", label: "Sensor 5", humdLabel: "Humidity 5", color: "#10b981", tempLabel: "T_A5", tempColor: "#ef4444" },
  { id: "H_A6", label: "Sensor 6", humdLabel: "Humidity 6", color: "#10b981", tempLabel: "T_A6", tempColor: "#ef4444" },
];

const SINGLE_SENSOR_CONFIG = [
  { id: "o2_a", title: "O2 Concentration", key: "O2_A", color: "#06b6d4" },
  { id: "co2_a", title: "CO2 Concentration", key: "CO2_A", color: "#f97316" },
  { id: "p1_a", title: "Internal Pyranometer", key: "P1_A", color: "#8b5cf6" },
  { id: "p2_a", title: "External Pyranometer", key: "P2_A", color: "#ec4899" },
];

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
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 40, r: 20, t: 40, b: 40 },
    font: { family: "Inter, sans-serif", size: 12, color: "#64748b" },
    xaxis: {
      gridcolor: "#f1f5f9",
      linecolor: "#f1f5f9",
      zeroline: false,
      title: { text: "Date / Time", font: { size: 11, weight: 600 } }
    },
    yaxis: {
      gridcolor: "#f1f5f9",
      linecolor: "#f1f5f9",
      zeroline: false,
      title: { text: "Value", font: { size: 11, weight: 600 } }
    },
    legend: {
      orientation: "h",
      x: 0,
      y: 1.1,
      font: { size: 11 }
    },
    hovermode: "x unified",
  };

  const allPlotSensors = [...sensors, ...SINGLE_SENSOR_CONFIG];

  const currentPlotData = [
    {
      x: dates,
      y: chartData.map(entry => entry[selectedSensor.id] ?? entry[selectedSensor.humdLabel] ?? entry[selectedSensor.key] ?? null),
      type: "scatter",
      mode: "lines",
      name: selectedSensor.label || selectedSensor.title,
      line: { color: selectedSensor.color, width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: `${selectedSensor.color}0D` // Subtle transparency
    },
  ];

  // Add temperature if it's one of the main sensors
  if (selectedSensor.tempLabel) {
    currentPlotData.push({
      x: dates,
      y: chartData.map(entry => entry[selectedSensor.tempLabel] ?? null),
      type: "scatter",
      mode: "lines+markers",
      name: `Temperature (${selectedSensor.tempLabel})`,
      line: { color: selectedSensor.tempColor, width: 2 },
      marker: { size: 4 }
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-green-50 text-green-600">
            <FaChartArea size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Air Monitoring Analytics</h2>
            <p className="text-sm text-gray-500 font-medium">Environmental climate trends</p>
          </div>
        </div>

        <div className="relative group min-w-[240px]">
          <select
            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all cursor-pointer hover:border-green-300 shadow-sm"
            value={selectedSensor.id}
            onChange={(e) => setSelectedSensor(allPlotSensors.find(s => s.id === e.target.value))}
          >
            <optgroup label="Multi-Sensors (Temp/Hum)">
              {sensors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
            </optgroup>
            <optgroup label="Atmospheric Gases & Energy">
              {SINGLE_SENSOR_CONFIG.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
            </optgroup>
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 group-hover:text-green-500 transition-colors">
            <FaFilter size={14} />
          </div>
        </div>
      </div>

      <div className="modern-card p-4 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
        <Plot
          data={currentPlotData}
          layout={layout}
          useResizeHandler={true}
          style={{ width: "100%", height: "450px" }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>
    </div>
  );
};

export default Dashboard;
