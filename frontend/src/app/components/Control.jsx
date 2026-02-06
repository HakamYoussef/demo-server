'use client';
import { useAuthContext } from '../context/authContext';
import ControlButton from './ControlButton';
import React, { useEffect, useState } from 'react';
import { MdOutlineSensors, MdPower, MdPowerOff } from 'react-icons/md';

export const Control = () => {
  const [data, setData] = useState({});
  const { token } = useAuthContext();

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
  }, [token]);

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-2 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full"></div>
        <h1 className="text-2xl font-bold text-gray-800">Control Panel</h1>
      </div>

      {/* Control Buttons Section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Quick Controls</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
          <ControlButton field="Elv1" isOn={data["Elv1"] === 1} />
          <ControlButton field="Elv2" isOn={data["Elv2"] === 1} />
          <ControlButton field="Elv3" isOn={data["Elv3"] === 1} />
          <ControlButton field="Elv4" isOn={data["Elv4"] === 1} />
          <ControlButton field="Elv5" isOn={data["Elv5"] === 1} />
          <ControlButton field="Elv6" isOn={data["Elv6"] === 1} />
        </div>
      </div>

      {/* Real-time Status Section */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Device Status</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {Object.keys(data).length === 0 ? (
            <div className="col-span-full flex flex-col items-center justify-center py-12 text-gray-400">
              <MdOutlineSensors size={48} className="mb-3 opacity-50" />
              <p className="text-lg font-medium">No data available</p>
              <p className="text-sm">Waiting for device data...</p>
            </div>
          ) : (
            Object.keys(data).map((key) => {
              if (key.startsWith("Elv") || key.startsWith("F")) {
                const isOn = data[key] === 1;
                return (
                  <div
                    key={key}
                    className={`
                      relative overflow-hidden rounded-xl p-4 transition-all duration-300
                      ${isOn
                        ? 'bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300'
                        : 'bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200'
                      }
                    `}
                  >
                    {/* Status Indicator */}
                    <div className={`
                      absolute top-3 right-3 w-3 h-3 rounded-full
                      ${isOn ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}
                    `}></div>

                    <div className="flex items-center gap-2 mb-3">
                      <div className={`
                        p-2 rounded-lg 
                        ${isOn
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-400 text-white'
                        }
                      `}>
                        {isOn ? <MdPower size={16} /> : <MdPowerOff size={16} />}
                      </div>
                      <span className="text-sm font-semibold text-gray-700">{key}</span>
                    </div>

                    <div className={`
                      text-xl font-bold
                      ${isOn ? 'text-green-600' : 'text-gray-500'}
                    `}>
                      {isOn ? "ON" : "OFF"}
                    </div>
                  </div>
                );
              }
              return null;
            })
          )}
        </div>
      </div>
    </div>
  );
};
