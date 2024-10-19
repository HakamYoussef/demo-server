"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@chakra-ui/react";
import { useAuthContext } from "../context/authContext";
import Image from "next/image";
import Sidebar from "@/app/components/Navbar";
import protectedRoute from "../components/protectedRoute";

const Page = () => {
  const [data, setData] = useState({});
  const [compare, setCompare] = useState(false);
  const [thresholdTemp, setThresholdTemp] = useState(""); 
  const router = useRouter();
  const { token } = useAuthContext();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmpassword, setConfirmpassword] = useState("");

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
      console.log("Close event code:", event.code);
      console.log("Close event reason:", event.reason);
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

    const formData = {
      email,
      password,
    };

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
        router.push("/settings");
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
        headers: {
          "Content-Type": "application/json",
        },
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

  return (
    <body style={{paddingTop : "80px"}}>  
    <div className="flex flex-col">
      <Sidebar />
      <div className="flex">
        <div className="flex flex-col w-full">
            <div className="grid grid-cols-1 gap2 p-2">
              <div className="flex gap-1">
                <div className="flex flex-col px-2 py-2 border rounded shadow-md h-52">
                <h2 className="text-2xl font-semibold m-1">Set Max Temperature:</h2>
                    <input
                        type="number"
                        value={thresholdTemp}
                        onChange={(e) => setThresholdTemp(e.target.value)}
                        placeholder="Enter threshold temperature"
                        className="border-2 border-brd hover:border-blue rounded-mdd p-2 mb-1"
                    />
                    
                    <button
                        onClick={handleSaveThreshold}
                        className="mt-1 p-1 bg-blue-500 text-white rounded"
                    >
                      Save Threshold
                    </button>
                </div>
                  <div className="flex flex-col flex-1 px-3 py-2 border rounded shadow-md">
                    <h1 className="text-3xl font-semibold px-1 py-2">Create an account</h1>
                    <div className=" bg-white border-gray2 border-3 px-6 rounded-llg shadow-lg p-2 ">
                    <div className="flex flex-col gap-1 bg-white">
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email"
                      className="border-2 border-brd hover:border-blue rounded-mdd p-1.5"
                    />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="border-2 border-brd hover:border-blue rounded-mdd p-1.5"
                    />
                    <input
                      type="password"
                      value={confirmpassword}
                      onChange={(e) => setConfirmpassword(e.target.value)}
                      placeholder="Confirm password"
                      className="border-2 border-brd hover:border-blue rounded-mdd p-1.5"
                    />
                    <button
                      onClick={submitHandler}
                      className="text-white border-2 rounded-mdd py-1.5 mt-1.5 bg-blue-500 hover:bg-green-600"
                    >
                      Create
                    </button>
                  </div>
                </div>
              </div>
              </div>
            </div>
        </div>
      </div>
    </div>
    </body>
  );
};

export default protectedRoute(Page);
