'use client';
import React from "react";
import Navbar from "@/app/components/Navbar";
import Eaul from "../liveData/Eaul";
import EauChart from "../charts/EauChart";
import Sections from "../components/Sections";
import protectedRoute from "../components/protectedRoute";
import { Control } from "../components/Control";
import Typewrite from "../components/Typewrite";
import Slider from "../components/slider";
const Page = () => {
  return (
    <body style={{paddingTop : "80px"}}>
      <div className="flex flex-col items-center justify-center bg-gray-100">
      <Navbar />
      <Typewrite />
      <div className="absolute top-3 left-10 ">
          <h2 className="font-bold text-4xl text-green-500">CR SEAPI</h2>
        </div>
      <div className="flex">
        
        <div className="flex flex-col w-full">
          <div className="grid grid-cols-1 gap- p-2 ">
            {/* First row: Eaul and GreenHouse Control side by side */}
            <div className="flex ">
              <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md bg-white">
                <Eaul />
              </div>
              <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md bg-green-500">
                <Slider />
              </div>
            </div>
            <div>
              <h2 className="p-2 font-bold text-2xl flex flex-col items-center">Agro exprimental intellignet station</h2>
            </div>
            {/* Second row: EauChart at the bottom, spanning full width */}
            <div className="p-4 border rounded shadow-md bg-white">
              <h2 className="text-xl font-bold">EauChart</h2>
              <EauChart />
            </div>
          </div>
        </div>
      </div>
    </div>
    </body>
    
  );
};

export default protectedRoute(Page);
