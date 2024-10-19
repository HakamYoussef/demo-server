"use client";
import React, { useState, useEffect } from "react";

const Records = ({ option, env,startDate, endDate, data }) => {
  const [recordData, setData] = useState([]);
  const contains = (mainString, searchString) => {
    return mainString.includes(searchString);
  }
  
  // const convertToUnix = (dateString) => {
  //   const parts = dateString.split("/");
  //   const date = new Date(parts[2], parts[1] - 1, parts[0]);
  //   return Math.floor(date.getTime() / 1000);
  // };
  // const convertFromUnix = (timestamp) => {
  //   const date = new Date(timestamp * 1000);
  //   const day = String(date.getDate()).padStart(2, "0");
  //   const month = String(date.getMonth() + 1).padStart(2, "0");
  //   const year = date.getFullYear();
  //   return `${day}/${month}/${year}`;
  // };
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    // const hours = String(date.getHours()).padStart(2, "0");
    // const minutes = String(date.getMinutes()).padStart(2, "0");
    // const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year}`;
  };
  const formatHeure = (dateString) => {
    const date = new Date(dateString);
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };
  const convertToISODate = (dateString) => {
    const parts = dateString.split("/");
    const date = new Date(parts[2], parts[1] - 1, parts[0]);
    return date.toISOString();
  };
  // useEffect(() => {
  //   let url = `http://localhost:5002/api/capteurs/dataa`;
  //   if (startDate && endDate) {
  //     url += `?startDate=${convertToISODate(startDate)}&endDate=${
  //       convertToISODate(endDate)
  //     }`;
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

  return (
    <div className="ml-2 mt-2 border-2 border-black overflow-scroll max-h-x  max-w">
      <p>Enregistrement </p>
      <div className="grid grid-cols-3 gap-1 pl-3">
        <div className="px-2">Date </div>
        <div className="px-2">Hour</div>
        <div className="px-2">{option}</div>
        {Object.keys(data).map((key) => {
          const record = data[key];
          return (
            <React.Fragment key={key}>
              <div className="px-2">{formatDate(record.timestamp)}</div>

              <div className="px-2">
               <div>{formatHeure(record.timestamp)}</div>
              </div>
              <div className="px-2">
                <ul className="m-0 p-0">
                  {Object.keys(record)
                    .filter((recordKey) => recordKey.startsWith(option) && recordKey.includes(env))
                    .map((hKey) => (
                      <li key={hKey} className="m-0 p-0">
                        {hKey}:{record[hKey]}
                      </li>
                    ))}
                </ul>
              </div>
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default Records;
