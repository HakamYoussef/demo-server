"use client";

import { io } from "socket.io-client";
import { Button, Input, Select, useToast } from "@chakra-ui/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import protectedRoute from "../components/protectedRoute";
import { useAuthContext } from "../context/authContext";
import { FaRadiation, FaSignOutAlt, FaChartLine } from "react-icons/fa";
import { MdSensors, MdOutlineTune, MdGpsFixed } from "react-icons/md";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DEFAULT_API_BASE_URL = "http://213.199.35.129:5002";
const apiBaseUrl = (
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : DEFAULT_API_BASE_URL
).replace(/\/+$/, "");
const READINGS_ENDPOINT = `${apiBaseUrl}/api/v1/readings`;
const RADIATION_ENDPOINT = `${apiBaseUrl}/api/radiation`;

const deriveWsUrl = (base) => {
  try {
    const u = new URL(base);
    u.protocol = u.protocol === "https:" ? "wss:" : "ws:";
    u.pathname = '';
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

function RadiationDash() {
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
    if (!incoming) return;

    if (Array.isArray(incoming)) {
      const sanitized = incoming.filter((entry) => entry && typeof entry === "object");
      setRadiationData(sortByTimestamp(sanitized));
      return;
    }

    if (typeof incoming !== "object") return;

    if ("message" in incoming && Object.keys(incoming).length === 1) return;

    setRadiationData((prev) => {
      const next = [...prev];
      const matchIndex = next.findIndex((item) => {
        if (item?._id && incoming?._id) return item._id === incoming._id;
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
      if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
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
        title: "LLD and ΔV are required",
        description: "Please provide LLD (Vbas) and ΔV before sending.",
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
        description: "LLD (Vbas) and ΔV must be valid numbers.",
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
      setValues({ Vbas: "", Vhaut: "", deltaV: "" });
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

    socket.on('connect', () => console.log("WebSocket connection established"));
    socket.on('radiationData', (data) => applyIncomingData(data));
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

    return () => socket.disconnect();
  }, [applyIncomingData, showToast]);

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

  const latestTimelinePoint = timelinePoints.length > 0 ? timelinePoints[timelinePoints.length - 1] : null;

  const chartData = timelinePoints.length
    ? [{
      x: timelinePoints.map((d) => new Date(d.time).toLocaleTimeString()),
      y: timelinePoints.map((d) => d.comptage),
      type: "scatter",
      mode: "lines",
      marker: { color: "#10b981" },
      line: { width: 2, shape: "spline" },
    }]
    : [];

  const picComptageEntries = radiationData
    .map((entry) => ({
      pic: asNumber(entry?.pic),
      comptage: asNumber(entry?.comptage),
    }))
    .filter((entry) => entry.pic !== null && entry.comptage !== null);

  const sortedPicComptageEntries = picComptageEntries.slice().sort((a, b) => a.pic - b.pic);

  const picChartData = sortedPicComptageEntries.length
    ? [{
      x: sortedPicComptageEntries.map((entry) => entry.pic),
      y: sortedPicComptageEntries.map((entry) => entry.comptage),
      type: "scatter",
      mode: "markers",
      marker: { color: "#6366f1", size: 8 },
    }]
    : [];

  const basePlotLayout = {
    autosize: true,
    margin: { l: 50, r: 20, t: 20, b: 50, pad: 4 },
    paper_bgcolor: 'transparent',
    plot_bgcolor: 'transparent',
    font: { family: 'Inter, system-ui, sans-serif', color: '#374151' },
  };

  const layout = {
    ...basePlotLayout,
    xaxis: { title: "Time", gridcolor: '#e5e7eb' },
    yaxis: { title: "Value", gridcolor: '#e5e7eb' },
  };

  const picLayout = {
    ...basePlotLayout,
    xaxis: { title: "Signal Amplitude", rangemode: "tozero", gridcolor: '#e5e7eb' },
    yaxis: { title: "Comptage", rangemode: "tozero", gridcolor: '#e5e7eb' },
  };

  const latestEntry = radiationData.length ? radiationData[radiationData.length - 1] : null;
  const latestComptageValue = asNumber(latestTimelinePoint?.comptage);
  const latestIntensityValue = latestComptageValue === null
    ? null
    : countInterval === "second"
      ? latestComptageValue
      : latestComptageValue * 60;
  const latestPicValue = asNumber(latestEntry?.pic);
  const lldValue = asNumber(values.Vbas);
  const deltaVValue = asNumber(values.deltaV);
  const computedHldValue = lldValue !== null && deltaVValue !== null ? lldValue + deltaVValue : null;
  const formatIndicatorValue = (value) =>
    value === null || Number.isNaN(value) ? "N/A" : value.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50">
      {/* Radiation-specific Header (NOT the agriculture Navbar) */}
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* Left Logo */}
            <div className="flex items-center gap-3">
              <img
                src="cnesten.png"
                alt="CNESTEN Logo"
                className="w-14 h-14 object-contain"
              />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-800">CNESTEN</h1>
                <p className="text-xs text-gray-500">DERS/UDI</p>
              </div>
            </div>

            {/* Center Title */}
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600">
                <FaRadiation className="text-white" size={24} />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-800">SCA IoT-Monitoring V1.0</h1>
                <p className="text-sm text-gray-500">Radiation Dashboard</p>
              </div>
            </div>

            {/* Right - Switch Dashboard & Logout */}
            <div className="flex items-center gap-2">
              <img
                src="radioactivite.png"
                alt="Radioactive"
                className="w-12 h-12 object-contain hidden sm:block"
              />

              {/* Switch to Agriculture Button */}
              <button
                onClick={() => router.push("/air")}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-100 text-green-600 hover:bg-green-200 transition-all duration-300"
                title="Switch to Agriculture Dashboard"
              >
                <span className="text-lg">🌿</span>
                <span className="font-medium text-sm hidden lg:inline">Agriculture</span>
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600 hover:text-red-500 hover:bg-red-50 transition-all duration-300"
              >
                <FaSignOutAlt size={18} />
                <span className="font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6" style={{ paddingTop: "100px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Control Panel */}
          <div className="modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                <MdSensors size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800 leading-tight">Control Panel</h2>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Threshold Manager</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Lower Level Discriminator (LLD)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-500 transition-colors">
                    <MdGpsFixed size={18} />
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter LLD value"
                    value={values.Vbas}
                    onChange={handleChange("Vbas")}
                    className="modern-input !pl-10"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ΔV (Delta V)</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400 group-focus-within:text-purple-500 transition-colors">
                    <MdOutlineTune size={18} />
                  </div>
                  <Input
                    type="number"
                    placeholder="Enter ΔV value"
                    value={values.deltaV}
                    onChange={handleChange("deltaV")}
                    className="modern-input !pl-10"
                  />
                </div>
              </div>

              <Button
                colorScheme="purple"
                onClick={handleSend}
                isLoading={isSending}
                loadingText="Sending"
                className="w-full"
                size="lg"
              >
                Send Values
              </Button>
            </div>

            {/* Indicators */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                  <FaChartLine size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800 leading-tight">Live Indicators</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                    Real-time Data
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                {/* Radiation Intensity Card */}
                <div className="relative group overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"></div>
                  <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100 group-hover:border-purple-200 transition-all relative z-10">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-white shadow-sm text-purple-600">
                        <FaRadiation size={18} className="animate-spin-slow" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Intensity</p>
                        <Select
                          size="xs"
                          variant="unstyled"
                          value={countInterval}
                          onChange={(e) => setCountInterval(e.target.value)}
                          className="text-gray-600 font-medium cursor-pointer hover:text-purple-600 transition-colors"
                          width="auto"
                        >
                          <option value="second">per second</option>
                          <option value="minute">per minute</option>
                        </Select>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-gray-800 tabular-nums">
                        {formatIndicatorValue(latestIntensityValue)}
                      </p>
                      <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest">
                        {countInterval === "second" ? "CPS" : "CPM"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signal Amplitude Card */}
                <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm text-blue-500">
                      <MdSensors size={18} />
                    </div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-tight">Amplitude</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-bold text-gray-800 tabular-nums">{formatIndicatorValue(latestPicValue)}<span className="text-sm text-gray-400 ml-1">V</span></p>
                  </div>
                </div>

                {/* Discriminator Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                    <p className="text-[10px] font-bold text-indigo-400 uppercase mb-1">LLD Threshold</p>
                    <p className="text-lg font-bold text-indigo-700 tabular-nums">
                      {values.Vbas !== "" ? formatIndicatorValue(lldValue) : "---"}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-50/50 rounded-xl border border-purple-100">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-purple-400 uppercase">HLD (Limit)</p>
                      <span className="text-[8px] font-medium text-purple-300">LLD+ΔV</span>
                    </div>
                    <p className="text-lg font-bold text-purple-700 tabular-nums">
                      {computedHldValue !== null ? formatIndicatorValue(computedHldValue) : "---"}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="lg:col-span-3 space-y-6">
            {/* Integral Mode Chart */}
            <div className="modern-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-green-400 to-emerald-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">Integral Mode</h2>
                <div className="ml-auto flex items-center gap-2">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  <span className="text-sm text-gray-500 font-medium">Live</span>
                </div>
              </div>
              {chartData.length ? (
                <Plot
                  data={chartData}
                  layout={layout}
                  useResizeHandler
                  style={{ width: "100%", height: "280px" }}
                  config={{ displayModeBar: false }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>No valid data to display for the time series.</p>
                </div>
              )}
            </div>

            {/* Differential Mode Chart */}
            <div className="modern-card p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-2 h-8 bg-gradient-to-b from-indigo-400 to-purple-600 rounded-full"></div>
                <h2 className="text-xl font-bold text-gray-800">Differential Mode</h2>
              </div>
              {picChartData.length ? (
                <Plot
                  data={picChartData}
                  layout={picLayout}
                  useResizeHandler
                  style={{ width: "100%", height: "280px" }}
                  config={{ displayModeBar: false }}
                />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-400">
                  <p>Pic and comptage values are missing or invalid.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="text-center">
              <p className="text-sm text-gray-400">© 2025 CNESTEN - All rights reserved</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default protectedRoute(RadiationDash);
