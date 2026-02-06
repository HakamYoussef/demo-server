"use client";
import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import Records from "../components/Records";
import { CSVLink } from "react-csv";
import protectedRoute from "../components/protectedRoute";
import { FaSearch, FaDownload, FaCalendarAlt, FaWind, FaSeedling, FaTint } from "react-icons/fa";
import { MdOutlineSensors } from "react-icons/md";

const Archive = () => {
  const [cOption, setOption] = useState("H_");
  const [env, setEnv] = useState("_A");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordData, setData] = useState([]);

  const envOptions = [
    { value: "_A", label: "Air", icon: <FaWind size={14} /> },
    { value: "_S", label: "Soil", icon: <FaSeedling size={14} /> },
    { value: "_E", label: "Water", icon: <FaTint size={14} /> },
  ];

  const typeOptions = [
    { value: "H_", label: "Humidity" },
    { value: "T_", label: "Temperature" },
    { value: "C_", label: "Conductivity" },
    { value: "PH_", label: "pH" },
    { value: "O2_", label: "O2" },
  ];

  const parseDateString = (dateString) => {
    const parts = dateString.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error("Invalid date format");
    }
    const date = new Date(year, month, day);
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
    return date.toISOString();
  };

  const handleOptionChange = (event) => setOption(event.target.value);
  const handleEnvChange = (event) => setEnv(event.target.value);
  const handleStartDateChange = (event) => setStartDate(event.target.value);
  const handleEndDateChange = (event) => setEndDate(event.target.value);

  const handleSubmit = (event) => {
    event.preventDefault();
    let url = `http://213.199.35.129:5002/api/capteurs/dataa`;
    let queryParams = [];

    if (startDate) {
      try {
        const startISO = parseDateString(startDate);
        queryParams.push(`startDate=${encodeURIComponent(startISO)}`);
      } catch (error) {
        console.error("Invalid start date:", error);
      }
    }

    if (endDate) {
      try {
        const endISO = parseDateString(endDate);
        queryParams.push(`endDate=${encodeURIComponent(endISO)}`);
      } catch (error) {
        console.error("Invalid end date:", error);
      }
    }

    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
    }

    fetch(url)
      .then((response) => response.json())
      .then((data) => setData(data))
      .catch((err) => console.error("Fetch error:", err));
  };

  const generateCSVData = () => {
    const csvData = [];
    const headers = ["Date", "Heure", ...new Set(recordData.flatMap(record =>
      Object.keys(record).filter(key => key !== 'timestamp' && key.startsWith(cOption) && key.includes(env))
    ))];
    csvData.push(headers);

    recordData.forEach((record) => {
      const { timestamp } = record;
      const dateObject = new Date(timestamp);
      const date = dateObject.toISOString().split('T')[0];
      const time = dateObject.toTimeString().split(' ')[0];
      const row = [date, time, ...headers.slice(2).map(key => record[key] || '')];
      csvData.push(row);
    });

    return csvData;
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: "90px" }}>
      <Navbar />

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Archive</h1>
          <p className="text-indigo-200 mt-1">Search and export historical sensor data</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Search Form */}
          <div className="modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-indigo-400 to-purple-500 text-white">
                <FaSearch size={20} />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Search Records</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Date Range */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <FaCalendarAlt className="text-gray-400" />
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">From</label>
                    <input
                      type="date"
                      value={startDate}
                      onChange={handleStartDateChange}
                      className="modern-input text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">To</label>
                    <input
                      type="date"
                      value={endDate}
                      onChange={handleEndDateChange}
                      className="modern-input text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Environment Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Environment</label>
                <div className="flex flex-wrap gap-2">
                  {envOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer
                        transition-all duration-200 text-sm font-medium
                        ${env === option.value
                          ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="env"
                        value={option.value}
                        checked={env === option.value}
                        onChange={handleEnvChange}
                        className="sr-only"
                      />
                      {option.icon}
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Type Selection */}
              <div className="space-y-3">
                <label className="text-sm font-semibold text-gray-700">Measurement Type</label>
                <div className="flex flex-wrap gap-2">
                  {typeOptions.map((option) => (
                    <label
                      key={option.value}
                      className={`
                        px-4 py-2 rounded-xl cursor-pointer
                        transition-all duration-200 text-sm font-medium
                        ${cOption === option.value
                          ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg"
                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        }
                      `}
                    >
                      <input
                        type="radio"
                        name="cOption"
                        value={option.value}
                        checked={cOption === option.value}
                        onChange={handleOptionChange}
                        className="sr-only"
                      />
                      {option.label}
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  className="flex-1 modern-btn modern-btn-primary flex items-center justify-center gap-2"
                >
                  <FaSearch size={14} />
                  Search
                </button>
                <CSVLink
                  data={generateCSVData()}
                  filename="records.csv"
                  className="modern-btn modern-btn-secondary flex items-center justify-center gap-2"
                >
                  <FaDownload size={14} />
                  Export
                </CSVLink>
              </div>
            </form>
          </div>

          {/* Records Display */}
          <div className="lg:col-span-2 modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-400 to-green-500 text-white">
                <MdOutlineSensors size={20} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Records</h2>
                <p className="text-sm text-gray-500">{recordData.length} results found</p>
              </div>
            </div>

            <Records env={env} option={cOption} startDate={startDate} endDate={endDate} data={recordData} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default protectedRoute(Archive);
