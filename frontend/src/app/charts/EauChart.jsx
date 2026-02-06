"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaWater, FaDroplet, FaChartLine } from "react-icons/fa6";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const sensors = [
  { id: "O1", label: "Oxygen Sensor 1", key: "O1", color: "#06b6d4" },
  { id: "O2", label: "Oxygen Sensor 2", key: "O2", color: "#06b6d4" },
  { id: "PH_eau1", label: "Water pH 1", key: "PH_eau1", color: "#3b82f6" },
  { id: "PH_eau2", label: "Water pH 2", key: "PH_eau2", color: "#3b82f6" },
  { id: "LEVEL_eau", label: "Tank Level (Final)", key: "LEVEL_eau", color: "#0ea5e9" },
  { id: "LEVEL_eau_I", label: "Tank Level (Initial)", key: "LEVEL_eau_I", color: "#0284c7" },
];

const EauChart = () => {
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

  const currentPlotData = [
    {
      x: dates,
      y: chartData.map(entry => entry[selectedSensor.key] ?? null),
      type: "scatter",
      mode: "lines",
      name: selectedSensor.label,
      line: { color: selectedSensor.color, width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: `${selectedSensor.color}0D`
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
            <FaWater size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Water Quality Analytics</h2>
            <p className="text-sm text-gray-500 font-medium">Hydroponic nutrient trends</p>
          </div>
        </div>

        <div className="relative group min-w-[240px]">
          <select
            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer hover:border-blue-300 shadow-sm"
            value={selectedSensor.id}
            onChange={(e) => setSelectedSensor(sensors.find(s => s.id === e.target.value))}
          >
            {sensors.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <FaDroplet size={14} className="group-hover:text-blue-500 transition-colors" />
          </div>
        </div>
      </div>

      <div className="modern-card p-4 bg-white/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-cyan-500"></div>
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

export default EauChart;
