"use client";
import React, { useRef, useState, useEffect } from "react";
import Navbar from "../components/Navbar";
import dynamic from "next/dynamic";
import Records from "../components/Records";


import {
  PDFDownloadLink,
  Document,
  Page,
  View,
  Text,
  Image,
} from "@react-pdf/renderer";
import { CSVLink } from "react-csv";
import protectedRoute from "../components/protectedRoute";

const Archive = () => {
  //E = conductivité , p$ = ph 
  const [cOption, setOption] = useState("H_");
  const [env, setEnv] = useState("_A");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [recordData, setData] = useState([]);
  // const convertFromUnix = (timestamp) => {
  //   const date = new Date(timestamp * 1000);
  //   const day = String(date.getDate()).padStart(2, "0");
  //   const month = String(date.getMonth() + 1).padStart(2, "0");
  //   const year = date.getFullYear();
  //   return `${day}/${month}/${year}`;
  // };
  // const convertToUnix = (dateString) => {
  //   const parts = dateString.split("/");
  //   const date = new Date(parts[2], parts[1] - 1, parts[0]);
  //   return Math.floor(date.getTime() / 1000);
  // };

  // useEffect(() => {
  //   let url = `http://localhost:5002/api/capteurs/dataa`;

  //   if (startDate && endDate) {
  //     url += `?startDate=${convertToISODate(startDate)}&endDate=${convertToISODate(endDate)}`;
  //   }

  //   fetch(url)
  //     .then((response) => response.json())
  //     .then((data) => {
  //       const filteredData = data;
  //       setData(filteredData);
  //       console.log(filteredData);
  //     })
  //     .catch((err) => console.log(err));
  // }, [startDate, endDate]);
  // const dates = Object.keys(recordData);
  // const h1Values = dates.map((date) => recordData[date].HH2 ?? null);
  // const t1Values = dates.map((date) => recordData[date]?.TT2 ?? null);
  // const data = [
  //   {
  //     x: dates,
  //     y: h1Values,
  //     type: "scatter",
  //     mode: "lines+markers",
  //     name: "h_1",
  //     marker: { color: "blue" },
  //   },
  //   {
  //     x: dates,
  //     y: t1Values,
  //     type: "scatter",
  //     mode: "lines+markers",
  //     name: "t_1",
  //     marker: { color: "red" },
  //   },
  // ];

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
  const parseDateString = (dateString) => {
    const parts = dateString.split("/");
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed in JavaScript
    const year = parseInt(parts[2], 10);
  
    // Check for valid date parts
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      throw new Error("Invalid date format");
    }
  
    const date = new Date(year, month, day);
  
    // Check for valid date object
    if (isNaN(date.getTime())) {
      throw new Error("Invalid date");
    }
  
    return date.toISOString();
  };
  


  const handleOptionChange = (event) => {
    setOption(event.target.value);
  };
  const handleEnvChange = (event) => {
    setEnv(event.target.value);
  };

  const handleStartDateChange = (event) => {
    setStartDate(event.target.value);
  };

  const handleEndDateChange = (event) => {
    setEndDate(event.target.value);
  };

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
  
    // Append query parameters to the URL if any
    if (queryParams.length > 0) {
      url += `?${queryParams.join("&")}`;
    }
  
  
    // Fetch data
    fetch(url)
      .then((response) => response.json())
      .then((data) => {
        setData(data);
      })
      .catch((err) => console.error("Fetch error:", err));
  };
  
  
  // useEffect(() => {
  //   console.log("jjj :", h1Values);
  //   if (Object.keys(recordData).length > 0) {
  //     Plotly.newPlot("chart", data, layout).then(() => {
  //       Plotly.toImage("chart", { format: "png" })
  //         .then((url) => {
  //           setPlotImage(url);
  //         })
  //         .catch((error) => {
  //           console.error("Error converting chart to PNG:", error);
  //         });
  //     });
  //   }
  // }, [recordData]);

  const styles = {
    page: {
      paddingRight: 50,
      paddingLeft: 50,
      padding: 0,
      margin: 0,
      paddingBottom: 50,
      paddingTop: 50,
    },
    container: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    logo: {
      width: 140,
      marginBottom: 20,
    },
    title: {
      fontSize: 24,
      fontWeight: "bold",
      marginBottom: 20,
    },
    table: {
      width: "90%",
      border: "1px solid black",
      marginBottom: 20,
    },
    row: {
      flexDirection: "row",
      borderBottom: "1px solid black",
    },
    cell: {
      flex: 1,
      padding: 5,
      borderRight: "1px solid black",
      fontSize: 12,
    },
  };
  const generatePDF = () => {
    return (
      <Document>
        <Page style={styles.page}>
          <View style={styles.container}>
            <Image style={styles.logo} src="/logo.jpeg" />
            <Text style={styles.title}>Records:</Text>
            <View style={styles.table}>
              {recordData.map((record, index) => {
                const { timestamp } = record;
                const date = new Date(timestamp);
                const formattedDate = date.toLocaleDateString(); // Change format as needed
                const formattedTime = date.toLocaleTimeString(); // Change format as needed
  
                return (
                  <View style={styles.row} key={index}>
                    <Text style={styles.cell}>
                      Date: {formattedDate}
                    </Text>
                    <Text style={styles.cell}>
                      Hour: {formattedTime}
                    </Text>
                    <Text style={styles.cell}>{cOption}:</Text>
                    <View>
                      {Object.keys(record)
                        .filter((recordKey) => recordKey.startsWith(cOption) && recordKey.includes(env))
                        .map((hKey) => (
                          <View key={hKey}>
                            <Text style={{ fontSize: 12 }}>
                              {hKey}: {record[hKey]}
                            </Text>
                          </View>
                        ))}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </Page>
      </Document>
    );
  };
  

  const generateCSVData = () => {

    const csvData = [];
  

    const headers = ["Date", "Heure", ...new Set(recordData.flatMap(record => Object.keys(record).filter(key => key !== 'timestamp' && key.startsWith(cOption) && key.includes(env))))];
  

    csvData.push(headers);
  

    recordData.forEach((record) => {
      const { timestamp } = record;
      const dateObject = new Date(timestamp);
      const date = dateObject.toISOString().split('T')[0]; // YYYY-MM-DD
      const time = dateObject.toTimeString().split(' ')[0]; // HH:MM:SS
  

      const row = [date, time, ...headers.slice(2).map(key => record[key] || '')];
      
      csvData.push(row);
    });
  
    return csvData;
  };
  
  
  return (
    <body style={{paddingTop : "80px"}}>
      <div>
  <div className="flex flex-col items-center justify-center">
    <div id="chart" className="hidden"></div>
    <Navbar />
    <div className="flex flex-col">
      <div>
        <h1 className="text-3xl font-semibold px-1 py-1">Archive</h1>
      </div>
      <div id="kk" className="m-1 border-2 shadow">
        <h1 className="p-2 font-semibold">Previous measurements</h1>
        <form onSubmit={handleSubmit}>
          {/* Date range section */}
          <div className="flex flex-row gap-1 mb-3 px-2">
            <label htmlFor="startDate" className="pl-1">From:</label>
            <input
              className="border-2 border-black mx-1 px-2 rounded-md"
              placeholder="jj/mm/aaaa"
              type="date"
              id="startDate"
              value={startDate}
              onChange={handleStartDateChange}
            />
          </div>
          <div className="flex flex-row gap-1 mb-1 px-2">
            <label htmlFor="endDate" className="pl-1">To:</label>
            <input
              className="border-2 border-black px-2 rounded-md"
              placeholder="jj/mm/aaaa"
              type="date"
              id="endDate"
              value={endDate}
              onChange={handleEndDateChange}
            />
          </div>

          {/* Environment selection */}
          <div className="pl-2 pt-2">
            <label className="font-semibold">Environment:</label>
            <div className="flex gap-4 pt-2">
              <div>
                <input
                  type="radio"
                  id="air"
                  name="env"
                  value="_A"
                  checked={env === "_A"}
                  onChange={handleEnvChange}
                />
                <label htmlFor="air" className="pr-4">Air</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="soil"
                  name="env"
                  value="_S"
                  checked={env === "_S"}
                  onChange={handleEnvChange}
                />
                <label htmlFor="soil" className="pr-4">Soil</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="water"
                  name="env"
                  value="_E"
                  checked={env === "_E"}
                  onChange={handleEnvChange}
                />
                <label htmlFor="water">Water</label>
              </div>
            </div>
          </div>

          {/* Type selection */}
          <div className="pl-2 pt-2">
            <label className="font-semibold">Type:</label>
            <div className="flex gap-4 pt-2">
              <div>
                <input
                  type="radio"
                  id="hType"
                  name="cOption"
                  value="H_"
                  checked={cOption === "H_"}
                  onChange={handleOptionChange}
                />
                <label htmlFor="hType" className="pr-4">h_</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="tType"
                  name="cOption"
                  value="T_"
                  checked={cOption === "T_"}
                  onChange={handleOptionChange}
                />
                <label htmlFor="tType" className="pr-4">t_</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="conductivity"
                  name="cOption"
                  value="C_"
                  checked={cOption === "C_"}
                  onChange={handleOptionChange}
                />
                <label htmlFor="conductivity" className="pr-4">Conductivité</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="ph"
                  name="cOption"
                  value="PH_"
                  checked={cOption === "PH_"}
                  onChange={handleOptionChange}
                />
                <label htmlFor="ph" className="pr-4">PH</label>
              </div>
              <div>
                <input
                  type="radio"
                  id="oxygen"
                  name="cOption"
                  value="O2_"
                  checked={cOption === "O2_"}
                  onChange={handleOptionChange}
                />
                <label htmlFor="oxygen" className="pr-4">O2</label>
              </div>
            </div>
          </div>

          {/* Submit button */}
          <div className="flex justify-start">
            <button
              type="submit"
              className="mx-1 mt-2 mb-1 bg-white hover:bg-green-500 text-black hover:text-white px-4 py-2 rounded-md border-2 border-black hover:border-white font-semibold"
            >
              Search
            </button>
          </div>
          {/* Download results section */}
         <div className="flex flex-row">
          <CSVLink
            data={generateCSVData()}
            filename="records.csv"
            className="mx-1 mt-1 mb-1 bg-white hover:bg-green-500 text-black hover:text-white px-4 py-2 rounded-md border-2 border-black hover:border-white font-semibold"
          >
            Import
          </CSVLink>
        {/* Uncomment to enable PDF generation */}
        {/* 
        <PDFDownloadLink
          document={generatePDF()}
          fileName="records.pdf"
          className="bg-green-500 text-white px-2 py-1.5 rounded-md font-semibold"
        >
          {({ loading }) => loading ? "Chargement..." : "Enregistrer les résultats (PDF)"}
        </PDFDownloadLink>
        */}
          </div>
        </form>
      </div>



      {/* Display records */}
      <div className="mb-5">
        <Records env={env} option={cOption} startDate={startDate} endDate={endDate} data={recordData} />
      </div>
    </div>
  </div>
</div>
    </body>
    

  )
};

export default protectedRoute(Archive);

