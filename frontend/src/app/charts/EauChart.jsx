"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const Ddd = () => {
  const [chartData, setChartData] = useState({});
  const [plotImage, setPlotImage] = useState(null);
  const [dates, setDates] = useState([]);
  useEffect(() => {
    fetch("http://213.199.35.129:5002/api/capteurs/dataa")
      .then((response) => response.json())
      .then((data) => {
        setChartData(data);

        // Log each timestamp value to ensure it's being accessed correctly
        data.forEach((entry, index) => {
          console.log(`Timestamp at index ${index}:`, entry.timestamp);
        });

        // Convert timestamp to valid Date objects
        const parsedDates = data.map((entry) => {
          const dateString = entry.timestamp; // Direct access, no optional chaining needed
          if (dateString) {
            const date = new Date(dateString);
            console.log(`Parsed date: ${date}`); // Log the parsed date
            return isNaN(date.getTime()) ? null : date;
          }
          return null;
        });

        setDates(parsedDates);
      })
      .catch((err) => console.log(err));
  }, []);


  // const convertFromUnix = (timestamp) => {
  //   const date = new Date(timestamp * 1000);
  //   const day = String(date.getDate()).padStart(2, "0");
  //   const month = String(date.getMonth() + 1).padStart(2, "0");
  //   const year = date.getFullYear();
  //   return `${day}/${month}/${year}`;
  // };


  // const p1Values = chartData.map((entry) => entry.P1 ?? null);
  // const p2Values = chartData.map((entry) => entry.P2 ?? null);
  // Object.keys(chartData).map((date) => convertFromUnix(date));

  // const layout = {
  //   title: "",
  //   xaxis: {
  //     title: "Date",
  //     type: "date",
  //   },
  //   yaxis: {
  //     title: "Value",
  //   },
  //   type: "scattergl",
  //   width: 1200,
  //   height: 500,
  // };
  // const data1 = [
  //   {
  //     x: dates,
  //     y: p1Values,
  //     type: "scatter",
  //     mode: "lines+markers",
  //     name: "p1",
  //     marker: { color: "red" },
  //   },
  // ];
  // const data2 = [
  //   {
  //     x: dates,
  //     y: p2Values,
  //     type: "scatter",
  //     mode: "lines+markers",
  //     name: "p2",
  //     marker: { color: "red" },
  //   },
  // ];

  return (
    <div className="">
      {/* <h1 className="text-3xl font-semibold px-2.5 pt-2">Plots</h1>
      <h1 className="text-3xl font-semibold px-2.5 pt-2">O</h1>
      <h1 className="text-3xl font-semibold px-2.5 pt-2">P1</h1>
      <Plot data={data1} layout={layout} className="js-plotly-plot" />
      <h1 className="text-3xl font-semibold px-2.5 pt-2">P2</h1>
      <Plot data={data2} layout={layout} className="js-plotly-plot" /> */}
    </div>
  );
};

export default Ddd;
