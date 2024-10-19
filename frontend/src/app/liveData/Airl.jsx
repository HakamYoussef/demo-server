"use client";
import React from "react";
import { useState, useEffect, useRef } from "react";
import { useAuthContext } from "../context/authContext";
import { useToast } from "@chakra-ui/react";

const Card = () => {
  const { token } = useAuthContext();
  const [data, setData] = useState({});
  const [capteur, setCapteur] = useState("H_A");
  const [thresholdTemp, setThresholdTemp] = useState(null);
  const toast = useToast();
  const lastNotificationTime = useRef({}); // Track notifications per key

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
      console.log("Close event code:", event.code);
      console.log("Close event reason:", event.reason);
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

  return (
    <div>
      <div className="flex flex-col">
        <div className="flex gap-1 mt-1">
          <button
            className={
              capteur === "H_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("H_A")}
          >
            Air humidity
          </button>
          <button
            className={
              capteur === "T_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("T_A")}
          >
            Air temperature
          </button>
          <button
            className={
              capteur === "CO2_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("CO2_A")}
          >
            Air CO2
          </button>
          <button
            className={
              capteur === "O2_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("O2_A")}
          >
            Air O2
          </button>
          <button
            className={
              capteur === "P1_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("P1_A")}
          >
            Internal pyranometer
          </button>
          <button
            className={
              capteur === "P2_A" ? "bg-blue-500 text-white px-2 py-1 rounded-md" : "bg-gray-200 text-black px-2 py-1 rounded-md"
            }
            onClick={() => setCapteur("P2_A")}
          >
            External pyranometer
          </button>
        </div>
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
    </div>
  );
};

export default Card;
