"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "../context/authContext";
import { useToast } from "@chakra-ui/react";
import {
  FaThermometerHalf,
  FaTint,
  FaCloud,
  FaWind,
  FaSun
} from "react-icons/fa";
import { MdOutlineSensors } from "react-icons/md";

const Card = () => {
  const { token } = useAuthContext();
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("H_A");
  const [thresholdTemp, setThresholdTemp] = useState(null);
  const toast = useToast();
  const lastNotificationTime = useRef({});

  const sensorTypes = [
    { key: "H_A", label: "Air Humidity", icon: <FaTint size={16} />, color: "from-blue-400 to-blue-600" },
    { key: "T_A", label: "Air Temperature", icon: <FaThermometerHalf size={16} />, color: "from-orange-400 to-red-500" },
    { key: "CO2_A", label: "Air CO2", icon: <FaCloud size={16} />, color: "from-gray-400 to-gray-600" },
    { key: "O2_A", label: "Air O2", icon: <FaWind size={16} />, color: "from-cyan-400 to-cyan-600" },
    { key: "P1_A", label: "Int. Pyranometer", icon: <FaSun size={16} />, color: "from-yellow-400 to-orange-500" },
    { key: "P2_A", label: "Ext. Pyranometer", icon: <FaSun size={16} />, color: "from-amber-400 to-yellow-500" },
  ];

  const notify = (title, description, status) => {
    const now = Date.now();
    if (!lastNotificationTime.current[title] || now - lastNotificationTime.current[title] >= 30000) {
      toast({
        title,
        description,
        status,
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
      lastNotificationTime.current[title] = now;
    }
  };

  useEffect(() => {
    const fetchThreshold = async () => {
      try {
        const response = await fetch("http://213.199.35.129:5002/api/admin/threshold", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch threshold");
        }

        const tdata = await response.json();
        setThresholdTemp(tdata.temperatureThreshold);
      } catch (error) {
        notify("Error fetching threshold", error.message, "error");
      }
    };

    fetchThreshold();
  }, [token, toast]);

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

  useEffect(() => {
    if (!thresholdTemp) return;

    const temperatureKeys = Object.keys(data).filter(key => key.startsWith("T_A"));

    if (temperatureKeys.length === 0) {
      return;
    }

    const allBelowThreshold = temperatureKeys.every(key => parseFloat(data[key]) < thresholdTemp);

    if (allBelowThreshold) {
      notify(
        "Temperature Alert",
        "All temperatures are below the maximum temperature.",
        "success"
      );
    } else {
      temperatureKeys.forEach(key => {
        const value = parseFloat(data[key]);
        if (value > thresholdTemp) {
          notify(
            `Temperature Alert for ${key}`,
            `${key} is above the maximum: ${value}`,
            "warning"
          );
        }
      });
    }
  }, [data, thresholdTemp, toast]);

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
                : "bg-white text-gray-600 border border-gray-200 hover:border-green-300 hover:text-green-600"
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
                    <div className={`p-2 rounded-lg bg-gradient-to-r ${sensorType?.color || 'from-green-400 to-green-600'} text-white`}>
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
