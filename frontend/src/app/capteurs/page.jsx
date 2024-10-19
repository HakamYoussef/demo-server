"use client";
import React from "react";
import { useState, useEffect } from "react";
import SideBar from "../components/SideBar";
import { TbArrowBackUp } from "react-icons/tb";

const page = () => {
  const [data, setData] = useState([]);
  //const [capteur, setCapteur] = useState("h");
  /*useEffect(() => {
    console.log(data);
  }, [data]);*/
  useEffect(() => {
    fetch("http://213.199.35.129:5002/api/chart/readings")
      .then((response) => response.json())
      .then((data) => {
        const keys = Object.keys(data[0].readings);
        const latestKey = keys.reduce((a, b) => (a > b ? a : b));
        setData(data[0].readings[latestKey]);
      })
      .catch((err) => console.log(err));
  }, [data]);
  return (
    <div>
      <div className="flex">
        <SideBar />
        <div className="flex flex-col">
          <div className="flex">
            <a href="/air">
              <TbArrowBackUp size={40} className="bg-black text-white " />
            </a>
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">
              Capteurs d'humidité
            </h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("HH")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">
              Capteurs de température
            </h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("TT")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">
              Capteurs de pression
            </h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("P")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">Capteurs RS</h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("RS")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">
              Capteurs d'oxygene
            </h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("O")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
          <div>
            <h1 className="text-3xl font-semibold px-2.5 py-2">
              Capteurs de C
            </h1>
          </div>
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr] gap-1 pl-3">
            {Object.keys(data).map((key, index) => {
              if (key.startsWith("C")) {
                return (
                  <div key={index} className="shadow rounded-md">
                    <div className="text-center px-3 pt-2">
                      <h6>capteur {key}</h6>
                    </div>
                    <h2 className="text-3xl text-center font-bold">
                      {data[key]}
                    </h2>
                    <p className="text-sm text-tn pt-1 pl-2.15 pb-2"></p>
                  </div>
                );
              } else {
                return null;
              }
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default page;
