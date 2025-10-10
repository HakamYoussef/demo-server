"use client";

import { Button, Input, useToast } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuthContext } from "../context/authContext";
import { useCallback, useEffect, useRef, useState } from "react";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DEFAULT_API_BASE_URL = "http://213.199.35.129:5002";
const apiBaseUrl = (
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
const READINGS_ENDPOINT = `${apiBaseUrl}/api/v1/readings`;
const RADIATION_ENDPOINT = `${apiBaseUrl}/api/radiation`;
const WEBSOCKET_URL = process.env.NEXT_PUBLIC_WS_URL?.trim();

const getEntryTime = (entry) => entry?.time ?? entry?.timestamp ?? null;

const sortByTimestamp = (entries) =>
  [...entries].sort((a, b) => {
    const first = new Date(getEntryTime(a) || 0).getTime();
    const second = new Date(getEntryTime(b) || 0).getTime();
    return first - second;
  });

export default function RadiationDash() {
  const router = useRouter();
  const { logout, token } = useAuthContext();
  const toast = useToast();
  const [values, setValues] = useState({ Vbas: "", Vhaut: "" });
  const [radiationData, setRadiationData] = useState([]);
  const socketRef = useRef(null);
  const [isSending, setIsSending] = useState(false);

  const showToast = useCallback(
    (id, options) => {
      if (!toast.isActive(id)) {
        toast({
          id,
          duration: 5000,
          isClosable: true,
          position: "bottom",
          ...options,
        });
      }
    },
    [toast]
  );

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleChange = (field) => (e) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const applyIncomingData = useCallback((incoming) => {
    if (!incoming) {
      return;
    }

    if (Array.isArray(incoming)) {
      const sanitized = incoming.filter((entry) => entry && typeof entry === "object");
      setRadiationData(sortByTimestamp(sanitized));
      return;
    }

    if (typeof incoming !== "object") {
      return;
    }

    if ("message" in incoming && Object.keys(incoming).length === 1) {
      return;
    }

    setRadiationData((prev) => {
      const next = [...prev];
      const matchIndex = next.findIndex((item) => {
        if (item?._id && incoming?._id) {
          return item._id === incoming._id;
        }

        const itemTime = getEntryTime(item);
        const incomingTime = getEntryTime(incoming);

        if (itemTime && incomingTime) {
          return new Date(itemTime).getTime() === new Date(incomingTime).getTime();
        }

        return false;
      });

      if (matchIndex !== -1) {
        next[matchIndex] = incoming;
        return sortByTimestamp(next);
      }

      return sortByTimestamp([...next, incoming]);
    });
  }, []);

  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(READINGS_ENDPOINT);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = await response.json();
      applyIncomingData(payload);
    } catch (error) {
      console.error("Error fetching radiation readings:", error);
      showToast("readings-error", {
        title: "Unable to load radiation data",
        description: "Check the /api/v1/readings endpoint.",
        status: "error",
      });
    }
  }, [applyIncomingData, showToast]);

  const handleSend = async () => {
    if (!token) {
      showToast("missing-token", {
        title: "Authentication required",
        description: "You must be signed in to submit radiation values.",
        status: "error",
      });
      return;
    }

    if (values.Vbas === "" || values.Vhaut === "") {
      showToast("missing-fields", {
        title: "All fields are required",
        description: "Please provide Vbas and Vhaut before sending.",
        status: "warning",
      });
      return;
    }

    const parsedValues = {
      Vbas: Number(values.Vbas),
      Vhaut: Number(values.Vhaut),
    };

    if (Object.values(parsedValues).some((value) => Number.isNaN(value))) {
      showToast("invalid-numbers", {
        title: "Invalid values",
        description: "Vbas and Vhaut must be valid numbers.",
        status: "error",
      });
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch(RADIATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedValues),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => null);
        const errorMessage = errorBody?.message || "Unexpected error sending radiation values.";
        throw new Error(errorMessage);
      }

      toast({
        title: "Values sent successfully",
        status: "success",
        duration: 5000,
        isClosable: true,
        position: "bottom",
      });
      setValues({ Vbas: "", Vhaut: "" });
    } catch (error) {
      console.error("Error sending radiation values:", error);
      showToast("send-error", {
        title: "Failed to send values",
        description: error.message,
        status: "error",
      });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!WEBSOCKET_URL) {
      showToast("ws-missing", {
        title: "Live updates unavailable",
        description: "Configure NEXT_PUBLIC_WS_URL to enable the radiation stream.",
        status: "warning",
      });
      return;
    }

    const socket = new WebSocket(WEBSOCKET_URL);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log("WebSocket connection established");
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        applyIncomingData(data);
      } catch (err) {
        console.error("Error parsing message:", err);
      }
    };

    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
      showToast("ws-error", {
        title: "WebSocket error",
        description: "Live radiation updates may be unavailable.",
        status: "error",
      });
    };

    socket.onclose = () => {
      console.log("WebSocket connection closed");
      socketRef.current = null;
    };

    return () => {
      socket.close();
    };
  }, [applyIncomingData, showToast, WEBSOCKET_URL]);

  const asNumber = (value) => {
    const parsed = typeof value === "string" ? Number.parseFloat(value) : value;
    return Number.isFinite(parsed) ? parsed : null;
  };

  const timelinePoints = radiationData
    .map((entry) => ({
      time: getEntryTime(entry),
      comptage: asNumber(entry?.comptage),
    }))
    .filter((entry) => entry.time && entry.comptage !== null);

  const chartData = timelinePoints.length
    ? [
        {
          x: timelinePoints.map((d) => new Date(d.time).toLocaleTimeString()),
          y: timelinePoints.map((d) => d.comptage),
          type: "scatter",
          mode: "lines+markers",
          marker: { color: "green" },
        },
      ]
    : [];

  const picComptageEntries = radiationData
    .map((entry) => ({
      pic: asNumber(entry?.pic),
      comptage: asNumber(entry?.comptage),
    }))
    .filter((entry) => entry.pic !== null && entry.comptage !== null);

  const picChartData = picComptageEntries.length
    ? [
        {
          x: picComptageEntries.map((entry) => entry.pic),
          y: picComptageEntries.map((entry) => entry.comptage),
          type: "scatter",
          mode: "markers",
          marker: { color: "#2563eb" },
        },
      ]
    : [];

  const layout = {
    title: "Radiation Chart",
    xaxis: { title: "Time" },
    yaxis: { title: "Value" },
  };

  const picLayout = {
    title: "Comptage by Pic",
    xaxis: { title: "Pic" },
    yaxis: { title: "Comptage" },
  };

  return (
    <div className="min-h-screen bg-white p-2">
      <div className="flex justify-center mb-1">
        <img className="w-16 h-16" src="cnesten.png" alt="" />
      </div>
      <div className="flex justify-center mb-1">
        <p className="text-2xl font-bold">Radiation project dashboard</p>
      </div>
      <div className="flex justify-end mb-2">
        
        <Button colorScheme="red" onClick={handleLogout}>
          Logout
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <Input
          type="number"
          placeholder="LLD"
          value={values.Vbas}
          onChange={handleChange("Vbas")}
        />
        <Input
          type="number"
          placeholder="HLD"
          value={values.Vhaut}
          onChange={handleChange("Vhaut")}
        />
      </div>
      <div className="mb-2">
        <Button
          colorScheme="green"
          onClick={handleSend}
          isLoading={isSending}
          loadingText="Sending"
        >
          Send
        </Button>
      </div>
      <div className="border rounded shadow-md p-4">
        {chartData.length ? (
          <Plot data={chartData} layout={layout} className="w-full" />
        ) : (
          <p className="text-center text-sm text-gray-500">
            Aucun comptage valide à afficher pour la série temporelle.
          </p>
        )}
      </div>
      <div className="border rounded shadow-md p-4 mt-4">
        <h2 className="text-lg font-semibold mb-3">Comptage en fonction du Pic</h2>
        {picChartData.length ? (
          <Plot data={picChartData} layout={picLayout} className="w-full" />
        ) : (
          <p className="text-center text-sm text-gray-500">
            Les valeurs de pic et de comptage sont manquantes ou invalides.
          </p>
        )}
      </div>
      <footer className="text-center text-sm text-gray-500 mt-3">DERS/UDI Designed</footer>
    </div>
  );
}
