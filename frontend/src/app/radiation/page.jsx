"use client";

import { io } from "socket.io-client";

import { Button, Input, Select, useToast } from "@chakra-ui/react";
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

// Derive a sensible WebSocket URL when NEXT_PUBLIC_WS_URL is not provided.
// Example: http://host:5002 -> ws://host:5002/ws, https -> wss
const deriveWsUrl = (base) => {
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = ''; // Remove pathname for socket.io
    return u.toString();
  } catch {
    return undefined;
  }
};

const WEBSOCKET_URL =
  (typeof process.env.NEXT_PUBLIC_WS_URL === "string" && process.env.NEXT_PUBLIC_WS_URL.trim()) ||
  deriveWsUrl(apiBaseUrl);

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
  const [values, setValues] = useState({ Vbas: "", Vhaut: "", deltaV: "" });
  const [radiationData, setRadiationData] = useState([]);
  const socketRef = useRef(null);
  const [isSending, setIsSending] = useState(false);
  const [countInterval, setCountInterval] = useState("second");

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

    if (values.Vbas === "" || values.deltaV === "") {
      showToast("missing-fields", {
        title: "LLD and Î”V are required",
        description: "Please provide LLD (Vbas) and Î”V before sending.",
        status: "warning",
      });
      return;
    }

    const parsedValues = {
      Vbas: Number(values.Vbas),
      Vhaut: Number(values.Vbas) + Number(values.deltaV),
    };

    if (Object.values(parsedValues).some((value) => Number.isNaN(value))) {
      showToast("invalid-numbers", {
        title: "Invalid values",
        description: "LLD (Vbas) and Î”V must be valid numbers.",
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

    const socket = io(WEBSOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log("WebSocket connection established");
    });

    socket.on('radiationData', (data) => {
      applyIncomingData(data);
    });

    socket.on('error', (error) => {
      console.error("WebSocket error:", error);
      showToast("ws-error", {
        title: "WebSocket error",
        description: "Live radiation updates may be unavailable.",
        status: "error",
      });
    });

    socket.on('disconnect', () => {
      console.log("WebSocket connection closed");
      socketRef.current = null;
    });

    return () => {
      socket.disconnect();
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

  const latestTimelinePoint =
    timelinePoints.length > 0 ? timelinePoints[timelinePoints.length - 1] : null;

  const maxComptage = timelinePoints.length
    ? timelinePoints.reduce(
        (maxValue, entry) => (entry.comptage > maxValue ? entry.comptage : maxValue),
        Number.NEGATIVE_INFINITY
      )
    : null;

  const chartData = timelinePoints.length
    ? [
        {
          x: timelinePoints.map((d) => new Date(d.time).toLocaleTimeString()),
          y: timelinePoints.map((d) => d.comptage),
          type: "scatter",
          mode: "lines",
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

  const sortedPicComptageEntries = picComptageEntries
    .slice()
    .sort((a, b) => a.pic - b.pic);

  const picChartData = sortedPicComptageEntries.length
    ? [
        {
          x: sortedPicComptageEntries.map((entry) => entry.pic),
          y: sortedPicComptageEntries.map((entry) => entry.comptage),
          type: "scatter",
          mode: "markers",
          marker: { color: "#2563eb" },
         
        },
      ]
    : [];

  const basePlotLayout = {
    autosize: true,
    margin: { l: 40, r: 20, t: 40, b: 50, pad: 4 },
  };

  const layout = {
    ...basePlotLayout,
    title: "",
    xaxis: { title: "Time" },
    yaxis: { title: "Value" },
  };

  const picLayout = {
    ...basePlotLayout,
    title: "",
    xaxis: { title: "Signal Amplitude", rangemode: "tozero" },
    yaxis: { title: "Comptage", rangemode: "tozero" },
  };

  const latestEntry = radiationData.length ? radiationData[radiationData.length - 1] : null;
  const latestComptageValue = asNumber(latestTimelinePoint?.comptage);
  const latestIntensityValue =
    latestComptageValue === null
      ? null
      : countInterval === "second"
      ? latestComptageValue
      : latestComptageValue * 60;
  const latestPicValue = asNumber(latestEntry?.pic);
  const lldValue = asNumber(values.Vbas);
  const deltaVValue = asNumber(values.deltaV);
  const computedHldValue =
    lldValue !== null && deltaVValue !== null ? lldValue + deltaVValue : null;
  const formatIndicatorValue = (value) =>
    value === null || Number.isNaN(value) ? "N/A" : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-white p-2">
      <div className="flex items-center justify-between gap-4 mb-1">
        <div className="flex flex-col items-center">
          <img
            className="w-12 h-12 object-contain"
            src="cnesten.png"
            alt="CNESTEN logo"
          />
          <p className="mt-1 text-sm font-semibold text-gray-700">CNESTEN</p>
        </div>
        <div className="flex-1">
          <div className="h-12 rounded-full bg-green-600 flex items-center justify-center px-4">
            <p className="text-lg md:text-xl font-semibold tracking-wide text-white text-center">
              SCA IoT-Monitoring V1.0
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <img
            className="w-12 h-12 object-contain"
            src="radioactivite.png"
            alt="Radioactive image"
          />
          <p className="mt-1 text-sm font-semibold text-gray-700">DERS/UDI</p>
        </div>
      </div>
<div className="flex flex-col mb-1 md:flex-row md:items-center md:justify-between">
      <div className="bg-green-600 w-full h-px shadow-md"></div>
      </div>
      <div className="md:grid md:grid-cols-4 gap-1">
              <div className="md:col-span-1">
          <div className="border rounded shadow-md p-2 flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-1 text-center">Control</h2>
            <div className="space-y-1 flex flex-col flex-1">
              <label className="block text-sm font-semibold text-gray-700 text-center">
                Lower Level Discriminator
                <Input
                  type="number"
                  placeholder="LLD"
                  value={values.Vbas}
                  onChange={handleChange("Vbas")}
                  className="mt-1"
                />
              </label>
              <label className="block text-sm font-semibold text-gray-700 text-center">
                ΔV
                <Input
                  type="number"
                  placeholder="ΔV"
                  value={values.deltaV}
                  onChange={handleChange("deltaV")}
                  className="mt-1"
                />
              </label>
              <Button
                  colorScheme="green"
                  onClick={handleSend}
                  isLoading={isSending}
                  loadingText="Sending"
                >
                  Send
                </Button>
              <div className="border-t border-gray-200 mt-2 pt-2">
                <h3 className="text-base font-semibold mb-1 text-center">Indicator</h3>
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-gray-600">Radiation intensity per</p>
                      <Select
                        size="sm"
                        value={countInterval}
                        onChange={(event) => setCountInterval(event.target.value)}
                        mt={1}
                      >
                        <option value="second">sec</option>
                        <option value="minute">min</option>
                      </Select>
                    </div>
                    <p className="text-lg font-semibold text-gray-900 text-right">
                      {formatIndicatorValue(latestIntensityValue)}
                      <span className="block text-sm font-medium text-gray-500">
                        {countInterval === "second" ? "CPS" : "CPM"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center justify-between ">
                    <p className="text-sm font-semibold text-gray-600">Signal Amplitude</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {formatIndicatorValue(latestPicValue)} Volts
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-600">LLD</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {values.Vbas !== "" ? formatIndicatorValue(lldValue) : "N/A"}
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-600">HLD</p>
                    <p className="text-lg font-semibold text-gray-900 text-right">
                      {computedHldValue !== null ? formatIndicatorValue(computedHldValue) : "N/A"}
                      <span className="block text-sm font-medium text-gray-500">HLD = LLD + ΔV</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div><div className="grid grid-cols-1 gap-0 mt-1 md:col-span-3">
        <div className="border rounded shadow-md p-2">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-semibold">Integral Mode</h2>
            
          </div>
          {chartData.length ? (
            <Plot
              data={chartData}
              layout={layout}
              className="w-full"
              useResizeHandler
              style={{ width: "100%", height: "220px" }}
            />
          ) : (
            <p className="text-center text-sm text-gray-500">
              Aucun comptage valide à afficher pour la série temporelle.
            </p>
          )}

        </div>
        <div className="border rounded shadow-md p-2">
          <h2 className="text-lg font-semibold mb-1">differentiel Mode</h2>
          {picChartData.length ? (
            <Plot
              data={picChartData}
              layout={picLayout}
              className="w-full"
              useResizeHandler
              style={{ width: "100%", height: "220px" }}
            />
          ) : (
            <p className="text-center text-sm text-gray-500">
              Les valeurs de pic et de comptage sont manquantes ou invalides.
            </p>
          )}
        </div>
        <div className="mt-auto flex justify-end gap-2">
                <Button colorScheme="red" onClick={handleLogout}>
                  Logout
                </Button>
        </div>
        <footer className="text-center text-sm text-gray-500">copyright©2025</footer>
      </div>
      </div>
    </div>
  );
}








