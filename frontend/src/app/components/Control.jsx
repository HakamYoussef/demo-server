'use client';
import { useAuthContext } from '../context/authContext';
import ControlButton from './ControlButton';
import React, { useEffect, useState } from 'react';

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
        setData(latestData); // Update data with incoming WebSocket data
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
      console.log("Close event code:", event.code);
      console.log("Close event reason:", event.reason);
    };

    return () => {
      socket.close();
    };
  }, [token]);

  return (
    <div className="flex flex-col">
      <h1 className="text-2xl font-semibold">Control</h1>

      {/* Control Buttons Section */}
      <div className="flex justify-center w-full mt-2">
        <div className="grid grid-cols-2 gap-1 place-items-center max-w-lg">
          <ControlButton field="Elv1" isOn={data["Elv1"] === 1} />
          <ControlButton field="Elv2" isOn={data["Elv2"] === 1} />
          <ControlButton field="Elv3" isOn={data["Elv4"] === 1} />
          <ControlButton field="Elv4" isOn={data["Elv5"] === 1} />
          <ControlButton field="Elv5" isOn={data["Elv6"] === 1} />
          <ControlButton field="Elv6" isOn={data["Elv7"] === 1} />
        </div>
      </div>

      {/* Real-time Measurements Section */}
      <div className="grid grid-cols-[1fr_1fr]">
        <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-1">
          {Object.keys(data).length === 0 ? (
            <p>No data available</p>
          ) : (
            Object.keys(data).map((key, index) => {
              if (key.startsWith("Elv") || key.startsWith("F")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>
                        Status{" "}
                        <a
                          href={`#${key.toLocaleLowerCase()}`}
                          className="text-blue-500"
                        >
                          {key}
                        </a>
                      </h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key] == 1 ? "ON" : "OFF"}
                    </h2>
                  </div>
                );
              } else {
                return null;
              }
            })
          )}
        </div>
      </div>
    </div>
  );
};
