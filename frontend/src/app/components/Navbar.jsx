"use client";
import React, { useState, useEffect } from "react";
import { IoPieChartSharp } from "react-icons/io5";
import { FaHistory } from "react-icons/fa";
import { IoMdSettings } from "react-icons/io";
import { useRouter } from "next/navigation";
import { IoLogOut } from "react-icons/io5";
import { useAuthContext } from "../context/authContext";
import { AiFillControl } from "react-icons/ai";
const Navbar = () => {
  const { logout } = useAuthContext();
  const [activeSection, setActiveSection] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); // State for dropdown visibility
  const router = useRouter();

  const handleLogout = () => {
    const confirmLogout = window.confirm("Are you sure you want to log out?");
    if (confirmLogout) {
      logout();
      router.push("/");
    }
  };

  useEffect(() => {
    setActiveSection(window.location.pathname);
  }, []);

  const handleSectionClick = (section) => {
    setActiveSection(section);
    router.push(section);
    setIsDropdownOpen(false); // Close dropdown after selecting an item
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className="bg-white shadow-lg w-full fixed top-0 z-50">
      <div>
        <div className="flex items-center">
          <div className="flex items-center">
            <img
              src="cnesten.png"
              alt=""
              className="mr-2 ml-1"
              style={{ width: "70px", height: "70px" }}
            />
          </div>
          <div className="ml-4 flex items-center space-x-2">
            <div className="relative">
              <NavItem
                icon={<IoPieChartSharp size={20} />}
                text="Dashboard"
                isActive={
                  activeSection === "/air" ||
                  activeSection === "/sol" ||
                  activeSection === "/eau"
                }
                onClick={toggleDropdown} // Toggle dropdown on click
              />
              {isDropdownOpen && (
                <div className="absolute bg-white shadow-lg rounded-md">
                  <DropdownItem
                    text="Air"
                    isActive={activeSection === "/air"}
                    onClick={() => handleSectionClick("/air")}
                  />
                  <DropdownItem
                    text="Soil"
                    isActive={activeSection === "/sol"}
                    onClick={() => handleSectionClick("/sol")}
                  />
                  <DropdownItem
                    text="Water"
                    isActive={activeSection === "/eau"}
                    onClick={() => handleSectionClick("/eau")}
                  />
                </div>
              )}
            </div>
            <NavItem
              icon={<AiFillControl size={20} />}
              text="Control"
              isActive={activeSection === "/Control"}
              onClick={() => handleSectionClick("/Control")}
            />
            <NavItem
              icon={<FaHistory size={20} />}
              text="Archive"
              isActive={activeSection === "/Historique"}
              onClick={() => handleSectionClick("/Historique")}
            />
            <NavItem
              icon={<IoMdSettings size={20} />}
              text="Settings"
              isActive={activeSection === "/settings"}
              onClick={() => handleSectionClick("/settings")}
            />
            <button
              className="flex items-center text-sm px-2 py-2 rounded-md text-gray-700 hover:bg-gray-100 transition duration-150"
              onClick={handleLogout}
            >
              <IoLogOut size={20} className="mr-2" aria-hidden="true" />
              <span>Logout</span>
            </button>
          </div>
          <div className=" ml-5 flex relative">
            <img
              src="iresen1.png"
              alt=""
              className="ml-4"
              style={{ width: "200px", height: "70px" }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

const NavItem = ({ icon, text, isActive, onClick }) => (
  <button
    className={`flex items-center text-sm px-2 py-2 rounded-md transition duration-150 ${
      isActive ? "bg-green-500 text-white" : "text-gray-700 hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    {icon}
    <span className="ml-2">{text}</span>
  </button>
);

const DropdownItem = ({ text, isActive, onClick }) => (
  <button
    className={`block w-full text-left px-4 py-2 text-sm transition duration-150 ${
      isActive ? "bg-green-500 text-white" : "text-gray-700 hover:bg-gray-100"
    }`}
    onClick={onClick}
  >
    {text}
  </button>
);

export default Navbar;
