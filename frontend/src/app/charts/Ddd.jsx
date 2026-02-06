"use client";
import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });



const Ddd = () => {
  const [chartData, setChartData] = useState({});
  const [plotImage, setPlotImage] = useState(null);
  useEffect(() => {
    fetch("http://213.199.35.129:5002/api/capteurs/data")
      .then((response) => response.json())
      .then((data) => setChartData(data[0].UsersData.nabil.DATA))
      .catch((err) => console.log(err));
  }, []);

  const dates = Object.keys(chartData);
  const h1Values = dates.map((date) => chartData[date].h_1);
  const t1Values = dates.map((date) => chartData[date].t_1);

  const data = [
    {
      x: dates,
      y: h1Values,
      type: "scatter",
      mode: "lines+markers",
      name: "h_1",
      marker: { color: "blue" },
    },
    {
      x: dates,
      y: t1Values,
      type: "scatter",
      mode: "lines+markers",
      name: "t_1",
      marker: { color: "red" },
    },
  ];

  const layout = {
    title: "",
    xaxis: {
      title: "Date",
      type: "date",
    },
    yaxis: {
      title: "Value",
    },
    type: "scattergl",
    width: 1200,
    height: 500,
  };

  return (
    <div className="">
      <p>{plotImage}</p>
      <h1 className="text-3xl font-semibold px-2.5 pt-2">graphs</h1>
      <Plot data={data} layout={layout} className="js-plotly-plot" />
    </div>
  );
};

export default Ddd;
