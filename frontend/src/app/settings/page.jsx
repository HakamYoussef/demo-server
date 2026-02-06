"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@chakra-ui/react";
import { useAuthContext } from "../context/authContext";
import Sidebar from "@/app/components/Navbar";
import protectedRoute from "../components/protectedRoute";
import { FaThermometerHalf, FaUserPlus, FaEnvelope, FaLock } from "react-icons/fa";
import { PiPlantFill } from "react-icons/pi";
import { IoSave } from "react-icons/io5";
import { Popover, PopoverTrigger, PopoverContent, PopoverHeader, PopoverBody, PopoverCloseButton, PopoverArrow } from "@chakra-ui/react";

const Page = () => {
  const [data, setData] = useState({});
  const [compare, setCompare] = useState(false);
  const [thresholdTemp, setThresholdTemp] = useState("");
  const router = useRouter();
  const { token } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");

  // Serre Configuration State
  const [numberOfTables, setNumberOfTables] = useState(5);
  const [matrixRows, setMatrixRows] = useState(4);
  const [matrixColumns, setMatrixColumns] = useState(3);
  const [potConfigs, setPotConfigs] = useState({});
  const [selectedPot, setSelectedPot] = useState(null);
  const [tempPotId, setTempPotId] = useState("");
  const [tempPlantType, setTempPlantType] = useState("");

  const toast = useToast();

  useEffect(() => {
    const fetchThreshold = async () => {
      try {
        const response = await fetch("http://213.199.35.129:5002/api/admin/threshold", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });

        if (!response.ok) {
          throw new Error("Failed to fetch threshold");
        }

        const tdata = await response.json();
        setThresholdTemp(tdata.temperatureThreshold);
      } catch (error) {
        toast({
          title: "Error fetching threshold",
          description: error.message,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      }
    };

    fetchThreshold();
  }, [token]);

  // Load Serre Configuration from localStorage
  useEffect(() => {
    const savedConfig = localStorage.getItem("serreConfig");
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig);
        setNumberOfTables(config.numberOfTables || 5);
        setMatrixRows(config.matrixRows || 4);
        setMatrixColumns(config.matrixColumns || 3);
        setPotConfigs(config.potConfigs || {});
      } catch (error) {
        console.error("Error loading serre config:", error);
      }
    }
  }, []);

  useEffect(() => {
    const socket = new WebSocket("ws://213.199.35.129:5002");

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const latestData = JSON.parse(event.data);
        setData(latestData);

        if (compare && thresholdTemp && latestData.T_A1 < parseFloat(thresholdTemp)) {
          toast({
            title: "Alert",
            description: `Temperature ${latestData.T_A1} is lower than the threshold ${thresholdTemp}`,
            status: "warning",
            duration: 5000,
            isClosable: true,
            position: "top-right",
          });
        }
      } catch (error) {
        console.error("Error parsing WebSocket message:", error);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    socket.onclose = (event) => {
      console.log("WebSocket connection closed:", event);
    };

    return () => {
      socket.close();
    };
  }, [compare, thresholdTemp]);

  const submitHandler = async () => {
    if (!email || !password || !confirmpassword) {
      toast({
        title: "Please fill all the fields",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    if (password !== confirmpassword) {
      toast({
        title: "Passwords do not match",
        status: "warning",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      return;
    }

    const formData = { email, password };

    try {
      const response = await fetch("http://213.199.35.129:5002/api/admin/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: "Registration successful",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        localStorage.setItem("userInfo", JSON.stringify(data));
        setEmail("");
        setPassword("");
        setConfirmpassword("");
      } else {
        toast({
          title: `Error: ${data.message || data}`,
          status: "error",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
    }
  };

  const handleSaveThreshold = async () => {
    try {
      const response = await fetch("http://213.199.35.129:5002/api/admin/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ temperatureThreshold: parseFloat(thresholdTemp) }),
      });

      if (response.ok) {
        const data = await response.json();
        toast({
          title: "Threshold updated",
          description: `New threshold: ${data.temperatureThreshold}`,
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "top-right",
        });
      } else {
        throw new Error("Failed to update threshold");
      }
    } catch (error) {
      toast({
        title: "Error updating threshold",
        status: "error",
        duration: 5000,
        isClosable: true,
        position: "top-right",
      });
    }
  };

  // Serre Configuration Handlers
  const handleSaveSerreConfig = () => {
    const config = {
      numberOfTables,
      matrixRows,
      matrixColumns,
      potConfigs,
    };

    localStorage.setItem("serreConfig", JSON.stringify(config));

    toast({
      title: "Serre Configuration Saved",
      description: `${numberOfTables} tables with ${matrixRows}×${matrixColumns} layout`,
      status: "success",
      duration: 5000,
      isClosable: true,
      position: "top-right",
    });
  };

  const handlePotClick = (tableIndex, potIndex) => {
    const key = `${tableIndex}-${potIndex}`;
    const existingConfig = potConfigs[key] || {};
    setSelectedPot(key);
    setTempPotId(existingConfig.id || `T${tableIndex + 1}-P${potIndex + 1}`);
    setTempPlantType(existingConfig.type || "");
  };

  const handleSavePotConfig = () => {
    if (!selectedPot) return;

    setPotConfigs(prev => ({
      ...prev,
      [selectedPot]: {
        id: tempPotId,
        type: tempPlantType,
      },
    }));

    toast({
      title: "Pot Configuration Saved",
      description: `${tempPotId}: ${tempPlantType}`,
      status: "success",
      duration: 3000,
      isClosable: true,
      position: "top-right",
    });

    setSelectedPot(null);
    setTempPotId("");
    setTempPlantType("");
  };

  return (
    <div className="min-h-screen" style={{ paddingTop: "90px" }}>
      <Sidebar />

      {/* Header */}
      <div className="bg-gradient-to-r from-gray-800 via-gray-700 to-gray-800 py-8 px-6">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-gray-300 mt-1">Configure system preferences and manage users</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Temperature Threshold Card */}
          <div className="modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-orange-400 to-red-500 text-white">
                <FaThermometerHalf size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Temperature Threshold</h2>
                <p className="text-sm text-gray-500">Set maximum temperature alert value</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Maximum Temperature (°C)
                </label>
                <input
                  type="number"
                  value={thresholdTemp}
                  onChange={(e) => setThresholdTemp(e.target.value)}
                  placeholder="Enter threshold temperature"
                  className="modern-input"
                />
              </div>

              <button
                onClick={handleSaveThreshold}
                className="w-full modern-btn modern-btn-primary flex items-center justify-center gap-2"
              >
                <IoSave size={18} />
                Save Threshold
              </button>
            </div>
          </div>

          {/* Create Account Card */}
          <div className="modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-green-400 to-emerald-500 text-white">
                <FaUserPlus size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Create Account</h2>
                <p className="text-sm text-gray-500">Add a new user to the system</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaEnvelope size={16} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email"
                    className="w-full py-3 px-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaLock size={16} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full py-3 px-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    <FaLock size={16} />
                  </div>
                  <input
                    type="password"
                    value={confirmpassword}
                    onChange={(e) => setConfirmpassword(e.target.value)}
                    placeholder="Confirm password"
                    className="w-full py-3 px-12 border-2 border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-green-400 focus:bg-white transition-all duration-300"
                  />
                </div>
              </div>

              <button
                onClick={submitHandler}
                className="w-full modern-btn modern-btn-primary flex items-center justify-center gap-2"
              >
                <FaUserPlus size={18} />
                Create Account
              </button>
            </div>
          </div>

          {/* Serre Configuration Card */}
          <div className="modern-card p-6 lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 rounded-xl bg-gradient-to-r from-violet-400 to-indigo-500 text-white">
                <PiPlantFill size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800">Serre Configuration</h2>
                <p className="text-sm text-gray-500">Configure greenhouse layout and pot details</p>
              </div>
            </div>

            {/* Layout Configuration */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Number of Tables
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={numberOfTables}
                  onChange={(e) => setNumberOfTables(parseInt(e.target.value))}
                  className="modern-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Matrix Rows
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matrixRows}
                  onChange={(e) => setMatrixRows(parseInt(e.target.value))}
                  className="modern-input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  Matrix Columns
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={matrixColumns}
                  onChange={(e) => setMatrixColumns(parseInt(e.target.value))}
                  className="modern-input"
                />
              </div>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Preview - Click a pot to configure
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {Array.from({ length: numberOfTables }).map((_, tableIndex) => (
                  <div key={tableIndex} className="bg-white p-3 rounded-lg border border-gray-200">
                    <div className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                      <span className="w-5 h-5 bg-violet-100 text-violet-700 rounded flex items-center justify-center text-[10px]">
                        T{tableIndex + 1}
                      </span>
                      Table {tableIndex + 1}
                    </div>
                    <div
                      className="grid gap-1"
                      style={{
                        gridTemplateColumns: `repeat(${matrixColumns}, minmax(0, 1fr))`,
                      }}
                    >
                      {Array.from({ length: matrixRows * matrixColumns }).map((_, potIndex) => {
                        const key = `${tableIndex}-${potIndex}`;
                        const config = potConfigs[key];
                        const isConfigured = !!config;

                        return (
                          <Popover key={potIndex} isOpen={selectedPot === key} onClose={() => setSelectedPot(null)}>
                            <PopoverTrigger>
                              <button
                                onClick={() => handlePotClick(tableIndex, potIndex)}
                                className={`aspect-square rounded-md flex items-center justify-center text-lg transition-all duration-200 hover:scale-110 ${isConfigured
                                  ? "bg-violet-100 border-2 border-violet-400"
                                  : "bg-gray-100 border border-gray-300"
                                  }`}
                                title={config ? `${config.id}: ${config.type}` : "Click to configure"}
                              >
                                🌱
                              </button>
                            </PopoverTrigger>
                            <PopoverContent>
                              <PopoverArrow />
                              <PopoverCloseButton />
                              <PopoverHeader fontWeight="bold">Configure Pot</PopoverHeader>
                              <PopoverBody>
                                <div className="space-y-3">
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Pot ID
                                    </label>
                                    <input
                                      type="text"
                                      value={tempPotId}
                                      onChange={(e) => setTempPotId(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="e.g., T1-P1"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-gray-600 mb-1">
                                      Plant Type
                                    </label>
                                    <input
                                      type="text"
                                      value={tempPlantType}
                                      onChange={(e) => setTempPlantType(e.target.value)}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                      placeholder="e.g., Tomato"
                                    />
                                  </div>
                                  <button
                                    onClick={handleSavePotConfig}
                                    className="w-full bg-violet-500 hover:bg-violet-600 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                  >
                                    Save Pot
                                  </button>
                                </div>
                              </PopoverBody>
                            </PopoverContent>
                          </Popover>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSerreConfig}
              className="w-full modern-btn modern-btn-primary flex items-center justify-center gap-2"
            >
              <IoSave size={18} />
              Save Serre Configuration
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default protectedRoute(Page);
