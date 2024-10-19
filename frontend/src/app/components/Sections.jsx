'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const Sections = () => {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    setActiveSection(window.location.pathname);
  }, []);

  const handleSectionClick = (section) => {
    setActiveSection(section);
    router.push(section);
  };

  return (
    <div className="">
      {/*<div className="flex gap-3 bg-green-800">
      <h1 className="text-5xl font-semibold mt-1 bg-green-800 text-white text-center pl-5">SMART GREENHOUSE MONITORING
      </h1> 
      </div>*/}
    <div className="flex gap-1">
      <div>

      </div>
      <div className="flex gap-2 p-2 m-auto mb-2 mt-1.25 border-2 rounded-md mr-5">
      <button
  className={`px-3 py-1.5 rounded-md ml-1.25 font-semibold border-2 ${
    activeSection === "/air"
      ? "bg-green-800 text-white border-green-800"
      : "bg-white text-black border-gray-300"
  } shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl`}
  onClick={() => handleSectionClick("/air")}
>
          Air
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ml-1.25 font-semibold border-2 border-black-950 ${
            activeSection === "/sol"
              ? "bg-green-800 text-white"
              : "bg-white text-black"
          }  shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl`}
          onClick={() => handleSectionClick("/sol")}
        >
          Soil
        </button>
        <button
          className={`px-3 py-1.5 rounded-md ml-1.25 font-semibold border-2 border-black-950 ${
            activeSection === "/eau"
              ? "bg-green-800 text-white"
              : "bg-white text-black"
          }  shadow-lg transition-transform transform hover:scale-105 hover:shadow-xl`}
          onClick={() => handleSectionClick("/eau")}
        >
          Water
        </button>
      </div>
    </div>
    </div>
  );
};

export default Sections;
