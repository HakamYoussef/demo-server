"use client";
import { createSocket as io } from "../lib/api.mjs";
import SensorSelector from "../components/SensorSelector";
import React, { useState, useEffect } from "react";
import { FaTint, FaFlask, FaWater, FaVial, FaWind } from "react-icons/fa";
import { MdOutlineSensors, MdWaves } from "react-icons/md";

const Card = () => {
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("O_eau");

  const sensorTypes = [
    { key: "O_eau", label: "Water Oxygen", shortLabel: "Oxygen", icon: <FaWind size={16} />, color: "from-cyan-400 to-blue-500" },
    { key: "PH_eau", label: "Water pH", shortLabel: "pH", icon: <FaFlask size={16} />, color: "from-blue-400 to-indigo-600" },
    { key: "LEVEL_eau", label: "Tank Level", shortLabel: "Tank level", icon: <MdWaves size={16} />, color: "from-blue-500 to-cyan-600" },
  ];

  useEffect(() => {
    const socket = io();

    socket.on("sensorData", (latestData) => {
      if (latestData && typeof latestData === "object" && !Array.isArray(latestData)) {
        setData(latestData);
      }
    });
    socket.on("connect_error", (error) => {
      console.error("Sensor connection error:", error.message);
    });

    return () => socket.disconnect();
  }, []);

  const getCurrentSensorType = () => sensorTypes.find(s => s.key === capteur);

  return (
    <div className="px-0 py-2 sm:p-4">
      {/* Sensor Type Selector */}
      <SensorSelector sensors={sensorTypes} value={capteur} onChange={setCapteur} />

      {/* Sensor Data Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {Object.keys(data).length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
            <MdOutlineSensors size={48} className="mb-3 opacity-50" />
            <p className="text-lg font-medium">No data available</p>
            <p className="text-sm">Waiting for sensor data...</p>
          </div>
        ) : (
          Object.keys(data).map((key, index) => {
            if (key.startsWith(capteur)) {
              const sensorType = getCurrentSensorType();
              return (
                <div
                  key={key}
                  className="data-card group animate-fadeIn stagger-item"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${sensorType?.color || 'from-blue-400 to-blue-600'} text-white`}>
                      {sensorType?.icon || <MdOutlineSensors size={14} />}
                    </div>
                    <span className="text-sm font-medium text-gray-500 truncate">
                      {key}
                    </span>
                  </div>
                  <div className="data-card-value">
                    {data[key]}
                  </div>
                </div>
              );
            }
            return null;
          })
        )}
      </div>
    </div>
  );
};

export default Card;
