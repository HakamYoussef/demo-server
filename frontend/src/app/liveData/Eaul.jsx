"use client";
import React, { useState, useEffect } from "react";
import { FaTint, FaFlask, FaWater, FaVial, FaWind } from "react-icons/fa";
import { MdOutlineSensors, MdWaves } from "react-icons/md";

const Card = () => {
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("O");

  const sensorTypes = [
    { key: "O", label: "Water Oxygen", icon: <FaWind size={16} />, color: "from-cyan-400 to-blue-500" },
    { key: "PH_eau", label: "Water pH", icon: <FaFlask size={16} />, color: "from-blue-400 to-indigo-600" },
    { key: "LEVEL_eau", label: "Tank Level", icon: <MdWaves size={16} />, color: "from-blue-500 to-cyan-600" },
  ];

  useEffect(() => {
    const socket = new WebSocket("ws://213.199.35.129:5002");

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const latestData = JSON.parse(event.data);
        setData(latestData);
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
    };

    return () => {
      socket.close();
    };
  }, []);

  const getCurrentSensorType = () => sensorTypes.find(s => s.key === capteur);

  return (
    <div className="p-4">
      {/* Sensor Type Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {sensorTypes.map((sensor) => (
          <button
            key={sensor.key}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-300 ease-out
              ${capteur === sensor.key
                ? `bg-gradient-to-r ${sensor.color} text-white shadow-lg scale-105`
                : "bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600"
              }
            `}
            onClick={() => setCapteur(sensor.key)}
          >
            <span className={`transition-transform duration-300 ${capteur === sensor.key ? "scale-110" : ""}`}>
              {sensor.icon}
            </span>
            <span>{sensor.label}</span>
          </button>
        ))}
      </div>

      {/* Sensor Data Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
