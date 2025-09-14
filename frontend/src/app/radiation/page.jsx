"use client";

import { Button, Input, useToast } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/authContext";
import { useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

export default function RadiationDash() {
  const router = useRouter();
  const { logout, token } = useAuthContext();
  const toast = useToast();
  const [values, setValues] = useState({ Vbas: "", Vhaut: "", Delta: "" });

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleChange = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSend = async () => {
    try {
      const response = await fetch("http://localhost:5002/api/admin/control", {
        method: "PUT",
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
      } else {
        console.error("Error sending values:", data.message);
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const data = [
    {
      x: [1, 2, 3, 4],
      y: [1, 3, 2, 4],
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
          value={values.elv1}
          onChange={handleChange("Vbas")}
        />
        <Input
          type="number"
          placeholder="Vhaut"
          value={values.elv2}
          onChange={handleChange("Vhaut")}
        />
        <Input
          type="number"
          placeholder="Delta"
          value={values.elv3}
          onChange={handleChange("Delta")}
        />
      </div>
      <div className="mb-2">
        <Button colorScheme="green" onClick={handleSend}>
          Send
        </Button>
      </div>
      <div className="border rounded shadow-md p-4">
        <Plot data={data} layout={layout} className="w-full" />
      </div>
    </div>
  );
}