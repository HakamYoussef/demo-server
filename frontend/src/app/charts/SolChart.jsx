"use client";
import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { FaDatabase, FaMicrochip, FaChartLine } from "react-icons/fa";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const sensors = [
  { id: "H_S1", label: "Sensor 1", humdLabel: "Humidity 1", color: "#3b82f6", tempLabel: "Temp 1", tempColor: "#ef4444" },
  { id: "H_S2", label: "Sensor 2", humdLabel: "Humidity 2", color: "#3b82f6", tempLabel: "Temp 2", tempColor: "#ef4444" },
  { id: "H_S3", label: "Sensor 3", humdLabel: "Humidity 3", color: "#3b82f6", tempLabel: "Temp 3", tempColor: "#ef4444" },
  { id: "H_S4", label: "Sensor 4", humdLabel: "Humidity 4", color: "#3b82f6", tempLabel: "Temp 4", tempColor: "#ef4444" },
  { id: "H_S5", label: "Sensor 5", humdLabel: "Humidity 5", color: "#3b82f6", tempLabel: "Temp 5", tempColor: "#ef4444" },
  { id: "H_S6", label: "Sensor 6", humdLabel: "Humidity 6", color: "#3b82f6", tempLabel: "Temp 6", tempColor: "#ef4444" },
];

const Dashboard = () => {
  const [chartData, setChartData] = useState([]);
  const [dates, setDates] = useState([]);
  const [selectedSensor, setSelectedSensor] = useState(sensors[0]);
  const [useResize, setUseResize] = useState(0);

  useEffect(() => {
    const handleResize = () => setUseResize(prev => prev + 1);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    autosize: true,
    paper_bgcolor: "rgba(0,0,0,0)",
    plot_bgcolor: "rgba(0,0,0,0)",
    margin: { l: 40, r: 20, t: 40, b: 40 },
    font: { family: "Inter, sans-serif", size: 12, color: "#64748b" },
    xaxis: {
      gridcolor: "#f1f5f9",
      linecolor: "#f1f5f9",
      zeroline: false,
      title: { text: "Timeline", font: { size: 11, weight: 600 } }
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
    hoverlabel: {
      bgcolor: "white",
      font: { family: "Inter, sans-serif" },
      bordercolor: "#e2e8f0"
    }
  };

  const currentPlotData = [
    {
      x: dates,
      y: chartData.map(entry => entry[selectedSensor.id] ?? null),
      type: "scatter",
      mode: "lines",
      name: "Humidity (%)",
      line: { color: selectedSensor.color, width: 3, shape: 'spline' },
      fill: 'tozeroy',
      fillcolor: 'rgba(59, 130, 246, 0.05)'
    },
    {
      x: dates,
      y: chartData.map(entry => entry[selectedSensor.tempLabel.replace('Temp', 'T_S')] ?? null),
      type: "scatter",
      mode: "lines+markers",
      name: "Temperature (°C)",
      line: { color: selectedSensor.tempColor, width: 2 },
      marker: { size: 4 }
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
            <FaChartLine size={20} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800 tracking-tight">Soil Analytics</h2>
            <p className="text-sm text-gray-500 font-medium">Historical sensor data trends</p>
          </div>
        </div>

        {/* Custom Dropdown Selector */}
        <div className="relative group min-w-[200px]">
          <select
            className="w-full appearance-none bg-white border border-gray-200 text-gray-700 py-2.5 px-4 pr-10 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer hover:border-amber-300"
            value={selectedSensor.id}
            onChange={(e) => setSelectedSensor(sensors.find(s => s.id === e.target.value))}
          >
            {sensors.map(sensor => (
              <option key={sensor.id} value={sensor.id}>{sensor.label}</option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
          </div>
        </div>
      </div>

      <div className="modern-card p-4 bg-white/50 backdrop-blur-sm relative overflow-hidden group">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        <Plot
          data={currentPlotData}
          layout={{ ...layout }}
          useResizeHandler={true}
          style={{ width: "100%", height: "450px" }}
          config={{ displayModeBar: false, responsive: true }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <div className="p-4 rounded-xl border border-gray-100 bg-blue-50/30 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
            <FaDatabase size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Active Sensor</p>
            <p className="text-lg font-bold text-gray-800">{selectedSensor.label}</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-gray-100 bg-amber-50/30 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
            <FaMicrochip size={18} />
          </div>
          <div>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">Channel Mapping</p>
            <p className="text-lg font-bold text-gray-800">{selectedSensor.id} & {selectedSensor.tempLabel.replace('Temp', 'T_S')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
