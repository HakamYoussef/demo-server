'use client';
import React, { useState, useEffect } from "react";

const Card = () => {
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("H_S");

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
      console.log("Close event code:", event.code);
      console.log("Close event reason:", event.reason);
    };

    return () => {
      socket.close();
    };
  }, []);

  return (
    <div className="flex flex-col">
      {/* Buttons for selecting sensors */}
      <div className="flex gap-1 mt-1">
        <button
          className={`bg-gray-200 text-black px-3 py-1 rounded-md ${capteur === 'H_S' ? 'bg-blue-400 text-black' : 'bg-gray-200'}`}
          onClick={() => setCapteur("H_S")}
        >
          Soil humidity
        </button>
        <button
          className={`bg-gray-200 text-black px-3 py-1 rounded-md ${capteur === 'T_S' ? 'bg-blue-400 text-black' : 'bg-gray-200'}`}
          onClick={() => setCapteur("T_S")}
        >
          Soil temperature
        </button>
        <button
          className={`bg-gray-200 text-black px-3 py-1 rounded-md ${capteur === 'C_S' ? 'bg-blue-400 text-black' : 'bg-gray-200'}`}
          onClick={() => setCapteur("C_S")}
        >
          Soil conductivity
        </button>
        <button
          className={`bg-gray-200 text-black px-3 py-1 rounded-md ${capteur === 'PH' ? 'bg-blue-400 text-black' : 'bg-gray-200'}`}
          onClick={() => setCapteur("PH")}
        >
          Soil pH
        </button>
      </div>

      {/* Display sensor data */}
      <div className="grid grid-cols-7 gap-1 mt-2">
      {Object.keys(data).length === 0 ? (
        <div className="text-center text-gray-500">No data available</div>
      ) : (
        
        Object.keys(data).map((key, index) => {
          if (key.startsWith(capteur)) {
            return (
              <div
                key={index}
                className="shadow rounded-md h-25 w-25 flex flex-col justify-center items-center"
              >
                <div className="text-xl text-center font-bold">{`Sensor ${key}`}</div>
                <p className="text-xl text-center pt-1 pb-2 text-blue-500">{data[key]}</p>
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
