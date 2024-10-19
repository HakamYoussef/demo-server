"use client";
import React from "react";
import { FaTemperatureHigh } from "react-icons/fa";
import { useState, useEffect } from "react";

const Card = ({ title, value, descript }) => {
  const [data, setData] = useState([]);
  const [capteur, setCapteur] = useState("h");
  /*useEffect(() => {
    console.log(data);
  }, [data]);*/
  useEffect(() => {
    fetch("http://localhost:5002/api/capteurs/dataa")
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((err) => console.log(err));
  });
  return (
    <div className="flex ">
      <div className="flex flex-col ml-1.5 mt-1 gap-1">
        <button
          className={
            capteur === "h" ? "bg-black text-white p-1.5 rounded-md" : ""
          }
          onClick={() => {
            setCapteur("h");
          }}
        >
          capteurs d'humidité
        </button>
        <button
          className={
            capteur === "t_" ? "bg-black text-white p-1.5 rounded-md" : ""
          }
          onClick={() => {
            setCapteur("t_");
          }}
        >
          Capteurs de température
        </button>
        <button>Capteurs de pression</button>
        <button>Capteurs x2</button>
        <button>Capteurs x3</button>
      </div>
      <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
        {data.map((item, index) =>
          Object.keys(item).map((key) => {
            if (key.startsWith(capteur)) {
              return (
                <div className="shadow rounded-md">
                  <div className="text-center px-3 pt-2">
                    <h6>capteur {key}</h6>
                  </div>
                  <h2 className="text-4xl text-center font-bold">
                    {item[key]}
                  </h2>
                  <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
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
