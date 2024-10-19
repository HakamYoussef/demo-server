'use client';
import React, { useState } from "react";
import Soll from "../liveData/Soll";
import SolChart from "../charts/SolChart";
import protectedRoute from "../components/protectedRoute";
import Navbar from "@/app/components/Navbar";
import Typewrite from "../components/Typewrite";
import Slider from "../components/slider";
const Page = () => {
  return(
    <body style={{paddingTop : "80px"}}>
      
    
    <div className="flex flex-col items-center justify-center bg-gray-100">
      <Navbar />
      <Typewrite />
      <div className="absolute top-3 left-10 ">
          <h2 className="font-bold text-4xl text-green-500">CR SEAPI</h2>
        </div>
      <div className="flex">
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1 gap-1 p-2">
            {/* First row: Eaul and GreenHouse Control side by side */}
            <div className="flex">
              <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md bg-white">
                <Soll />
              </div>
              <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md bg-green-500">
                <Slider /> 
              </div>
            </div>
            <div>
              <h2 className="font-bold text-2xl flex flex-col items-center">Agro exprimental intellignet station</h2>
            </div>
            {/* Second row: EauChart at the bottom, spanning full width */}
            <div className="border rounded shadow-md bg-white">
              <SolChart />
            </div>
          </div>
        </div>
      </div>
    </div>
    </body>
  );
};

export default protectedRoute(Page);
