"use client";

import { Button, Input, useToast } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/authContext";
import { useState, useEffect } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function RadiationDash() {
  const router = useRouter();
  const { logout, token } = useAuthContext();
  const toast = useToast();
  const [values, setValues] = useState({ Vbas: "", Vhaut: "", Delta: "" });
  const [radiationData, setRadiationData] = useState([]);

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleChange = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const fetchData = async () => {
    try {
      const response = await fetch("http://localhost:5002/api/arduino/readings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setRadiationData(data);
      } else {
        console.error("Error fetching data:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleSend = async () => {
    try {
      const response = await fetch("http://localhost:5002/api/radiation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          Vbas: Number(values.Vbas),
          Vhaut: Number(values.Vhaut),
          Delta: Number(values.Delta),
        }),
      });
      const data = await response.json();
      if (response.ok) {
        toast({
          title: "Values sent successfully",
          status: "success",
          duration: 5000,
          isClosable: true,
          position: "bottom",
        });
        fetchData();
      } else {
        console.error("Error sending values:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const chartData = [
    {
      x: radiationData.map((d) => new Date(d.timestamp).toLocaleTimeString()),
      y: radiationData.map((d) => d.comptage),
      type: "scatter",
      mode: "lines+markers",
      marker: { color: "green" },
    },
  ];

  const layout = {
    title: "Radiation Chart",
    xaxis: { title: "Time" },
    yaxis: { title: "Value" },
  };

  return (
    <div className="min-h-screen bg-white p-2">
      <div className="flex justify-center mb-1">
        <p className="text-2xl font-bold">Radiation project dashboard</p>
      </div>
      <div className="flex justify-end mb-2">
        
        <Button colorScheme="red" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <Input
          type="number"
          placeholder="Vbas"
          value={values.Vbas}
          onChange={handleChange("Vbas")}
        />
        <Input
          type="number"
          placeholder="Vhaut"
          value={values.Vhaut}
          onChange={handleChange("Vhaut")}
        />
        <Input
          type="number"
          placeholder="Delta"
          value={values.Delta}
          onChange={handleChange("Delta")}
        />
      </div>
      <div className="mb-2">
        <Button colorScheme="green" onClick={handleSend}>
          Send
        </Button>
      </div>
      <div className="border rounded shadow-md p-4">
        <Plot data={chartData} layout={layout} className="w-full" />
      </div>
    </div>
  );
}