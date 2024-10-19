"use client";
import React, { useState, useEffect } from "react";
import { FaTemperatureHigh } from "react-icons/fa";

const Card = ({ title, value, descript }) => {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);


  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5002/api/capteurs/dataa");
      const jsonData = await response.json();

      setData(jsonData[0]);
    } catch (err) {
      console.log(err);
    }
  };

  return (
    <div>
      <h2>{title}</h2>
      <ul>
        {Object.values(data).map((entry, index) => (
          <li key={index}>
            <h3>Data {index + 1}</h3>
            <ul>
              {Object.entries(entry).map(
                ([key, value]) =>
                  key.startsWith("h_") && (
                    <li key={key}>
                      {key}: {value}
                    </li>
                  )
              )}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default Card;
