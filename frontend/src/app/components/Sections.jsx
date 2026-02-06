'use client';
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaWind, FaSeedling, FaTint } from "react-icons/fa";

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

  const sections = [
    { path: "/air", label: "Air", icon: <FaWind size={16} />, activeColor: "from-green-500 to-green-600", activeShadow: "shadow-green-500/30", textHover: "hover:text-green-600" },
    { path: "/sol", label: "Soil", icon: <FaSeedling size={16} />, activeColor: "from-amber-500 to-orange-600", activeShadow: "shadow-amber-500/30", textHover: "hover:text-amber-600" },
    { path: "/eau", label: "Water", icon: <FaTint size={16} />, activeColor: "from-blue-500 to-cyan-600", activeShadow: "shadow-blue-500/30", textHover: "hover:text-blue-600" },
  ];

  return (
    <div className="flex justify-center py-4">
      <div className="inline-flex items-center gap-2 p-1.5 rounded-2xl bg-white shadow-lg border border-gray-100">
        {sections.map((section) => (
          <button
            key={section.path}
            className={`
              flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm
              transition-all duration-300 ease-out
              ${activeSection === section.path
                ? `bg-gradient-to-r ${section.activeColor} text-white shadow-lg ${section.activeShadow} scale-105`
                : `text-gray-600 hover:bg-gray-50 ${section.textHover}`
              }
            `}
            onClick={() => handleSectionClick(section.path)}
          >
            <span className={`transition-transform duration-300 ${activeSection === section.path ? "scale-110" : ""}`}>
              {section.icon}
            </span>
            <span>{section.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default Sections;
