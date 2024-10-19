"use client";
import React, { useState, useEffect } from "react";

const Card = () => {
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("O");

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

  useEffect(() => {
    console.log("test: ", data);
  }, [data]);

  return (
    <div className="flex flex-col">
      <div className="flex gap-1 ml-1 mt-1">
        <button
          className={
            capteur === "O" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
          }
          onClick={() => {
            setCapteur("O");
          }}
        >
          Water oxygen
        </button>
        <button
          className={
            capteur === "PH_eau" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
          }
          onClick={() => {
            setCapteur("PH_eau");
          }}
        >
          Water PH
        </button>
        <button
          className={
            capteur === "LEVEL_eau" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200   text-black px-2 py-1 rounded-md"
          }
          onClick={() => {
            setCapteur("LEVEL_eau");
          }}
        >
          Tank level F
        </button>
        <button className="bg-gray-200 text-black px-2 py-1 rounded-md">Tank level I</button>
      </div>
      <div className="grid grid-cols-4 gap-1 pl-3 mt-2">
        {Object.keys(data).map((key, index) => {
          if (key.startsWith(capteur)) {
            return (
              <>
              <div
                key={index}
                className="shadow rounded-md h-32 w-32 flex flex-col justify-center items-center"
              >
                  <div className="text-xl text-center font-bold">{`Sensor ${key}`}</div>
                  <p className="text-xl text-center pt-1 pb-2 text-blue-500">{data[key]}</p>
                </div></>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
};

export default Card;
