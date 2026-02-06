"use client";
import React, { useState, useEffect } from "react";
import { IoPieChartSharp } from "react-icons/io5";
import { FaHistory } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { useRouter, usePathname } from "next/navigation";
import { IoLogOut } from "react-icons/io5";
import { useAuthContext } from "../context/authContext";
import { AiFillControl } from "react-icons/ai";
import { PiPlantFill } from "react-icons/pi";

const Navbar = () => {
  const { logout } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      logout();
      router.push("/");
    }
  };

  const handleSectionClick = (section) => {
    router.push(section);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/20">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Left Logo */}
          <div className="flex items-center">
            <img
              src="cnesten.png"
              alt="CNESTEN Logo"
              className="w-16 h-16 object-contain transition-transform hover:scale-105"
            />
          </div>

          {/* Navigation Items */}
          <div className="flex items-center gap-2">
            <NavItem
              icon={<IoPieChartSharp size={18} />}
              text="Dashboard"
              isActive={
                pathname === "/air" ||
                pathname === "/sol" ||
                pathname === "/eau"
              }
              onClick={() => handleSectionClick("/air")}
            />
            <NavItem
              icon={<AiFillControl size={18} />}
              text="Control"
              isActive={pathname === "/Control"}
              onClick={() => handleSectionClick("/Control")}
            />
            <NavItem
              icon={<FaHistory size={18} />}
              text="Archive"
              isActive={pathname === "/Historique"}
              onClick={() => handleSectionClick("/Historique")}
            />
            <NavItem
              icon={<IoMdSettings size={18} />}
              text="Settings"
              isActive={pathname === "/settings"}
              onClick={() => handleSectionClick("/settings")}
            />
            <NavItem
              icon={<PiPlantFill size={18} />}
              text="Our Serre"
              isActive={pathname === "/Serre"}
              onClick={() => handleSectionClick("/Serre")}
            />

            {/* Switch Dashboard Button */}
            <button
              className="flex items-center gap-2 px-3 py-2 ml-1 rounded-xl bg-purple-100 text-purple-600 hover:bg-purple-200 transition-all duration-300"
              onClick={() => router.push("/radiation")}
              title="Switch to Radiation Dashboard"
            >
              <span className="text-lg">☢️</span>
              <span className="font-medium text-sm hidden lg:inline">Radiation</span>
            </button>

            {/* Logout Button */}
            <button
              className="flex items-center gap-2 px-4 py-2 ml-2 rounded-xl text-gray-600 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
              onClick={handleLogout}
            >
              <IoLogOut size={18} />
              <span className="font-medium">Logout</span>
            </button>
          </div>

          {/* Right Logo */}
          <div className="flex items-center">
            <img
              src="iresen1.png"
              alt="IRESEN Logo"
              className="h-14 object-contain transition-transform hover:scale-105"
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ icon, text, isActive, onClick }) => (
  <button
    className={`
      flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium
      transition-all duration-300 ease-out
      ${isActive
        ? "bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg shadow-green-500/30"
        : "text-gray-600 hover:bg-gray-100/80 hover:text-gray-900"
      }
    `}
    onClick={onClick}
  >
    <span className={`transition-transform duration-300 ${isActive ? "scale-110" : ""}`}>
      {icon}
    </span>
    <span>{text}</span>
  </button>
);

export default Navbar;
