'use client'
import React, {useState} from "react";
import { useRouter } from "next/navigation";
import Airl from "../liveData/Airl";
import AirChart from "../charts/AirChart";
import Sections from "../components/Sections";
import protectedRoute from "../components/protectedRoute";
import { useAuthContext } from "../context/authContext";
import { Control } from "../components/Control";
import Navbar from "@/app/components/Navbar";
import Typewrite from "../components/Typewrite";
import Slider from "../components/slider";

const page = () => {
  const [selectedComponent, setSelectedComponent] = useState("Air");
  const { logout, token } = useAuthContext();
  const router = useRouter();
  const handleLogout = () => {
    logout();
    router.push("/");
  };
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
                <Airl />
              </div>
              <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md bg-green-500">
                <Slider />
              </div>
            </div>
            <div>
              <h2 className="p-2 font-bold text-2xl flex flex-col items-center">Agro exprimental intellignet station</h2>
            </div>
            {/* Second row: EauChart at the bottom, spanning full width */}
            <div className="border rounded shadow-md bg-white">
              <AirChart />
            </div>
          </div>
        </div>
      </div>
    </div>
    </body>
    
  );
};

export default protectedRoute(page);
