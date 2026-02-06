"use client";
import React from "react";
import { FaThermometerHalf, FaTint } from "react-icons/fa";
import { MdOutlineSensors } from "react-icons/md";
import { useState, useEffect } from "react";

const Card = ({ title, value, descript }) => {
  const [data, setData] = useState([]);
  const [capteur, setCapteur] = useState("h");

  useEffect(() => {
    fetch("http://localhost:5002/api/capteurs/dataa")
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  });

  const sensorButtons = [
    { key: "h", label: "Humidity Sensors", icon: <FaTint size={14} /> },
    { key: "t_", label: "Temperature Sensors", icon: <FaThermometerHalf size={14} /> },
    { key: "p", label: "Pressure Sensors", icon: <MdOutlineSensors size={14} /> },
    { key: "x2", label: "Sensors X2", icon: <MdOutlineSensors size={14} /> },
    { key: "x3", label: "Sensors X3", icon: <MdOutlineSensors size={14} /> },
  ];

  return (
    <div className="flex gap-6 p-4">
      {/* Sensor Type Sidebar */}
      <div className="flex flex-col gap-2 min-w-[180px]">
        {sensorButtons.map((btn) => (
          <button
            key={btn.key}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-left
              transition-all duration-300 ease-out
              ${capteur === btn.key
                ? "bg-gradient-to-r from-gray-800 to-gray-900 text-white shadow-lg shadow-gray-900/20"
                : "bg-white text-gray-600 border border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }
            `}
            onClick={() => setCapteur(btn.key)}
          >
            <span className={`transition-transform duration-200 ${capteur === btn.key ? "scale-110" : ""}`}>
              {btn.icon}
            </span>
            <span className="text-sm">{btn.label}</span>
          </button>
        ))}
      </div>

      {/* Sensor Data Grid */}
      <div className="flex-1 grid grid-cols-4 gap-4">
        {data.map((item, index) =>
          Object.keys(item).map((key) => {
            if (key.startsWith(capteur)) {
              return (
                <div
                  key={`${index}-${key}`}
                  className="data-card group animate-fadeIn"
                >
                  <div className="flex items-center gap-2 mb-3">
                    <div className="p-2 rounded-lg bg-gradient-to-r from-green-400 to-green-600 text-white">
                      <MdOutlineSensors size={14} />
                    </div>
                    <span className="text-sm font-medium text-gray-500">
                      Sensor {key}
                    </span>
                  </div>
                  <div className="data-card-value">
                    {item[key]}
                  </div>
                </div>
              );
            } else {
              return null;
            }
          })
        )}
      </div>
    </div>
  );
};

export default Card;
