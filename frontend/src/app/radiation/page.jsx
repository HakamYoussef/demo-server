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

  // --- MODIFICATION ICI POUR LE TEMPS RÉEL ---
  const applyIncomingData = useCallback((incoming) => {
    if (!incoming) return;

    // Si on reçoit un tableau (chargement initial)
    if (Array.isArray(incoming)) {
      const sanitized = incoming.filter((entry) => entry && typeof entry === "object");
      setRadiationData(sortByTimestamp(sanitized));
      return;
    }

    // Si on reçoit un objet unique (temps réel via Socket)
    if (typeof incoming !== "object") return;

    setRadiationData((prev) => {
      const incomingTime = new Date(getEntryTime(incoming)).getTime();
      
      // On vérifie si la donnée existe déjà pour éviter les doublons
      const exists = prev.some(item => new Date(getEntryTime(item)).getTime() === incomingTime);
      if (exists) return prev;

      // On ajoute la donnée et on garde les 100 derniers points pour la performance
      const next = [...prev, incoming];
      return sortByTimestamp(next).slice(-100); 
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
    }
  }, [applyIncomingData]);

  const handleSend = async () => {
    if (!token) return;
    setIsSending(true);
    const parsedValues = {
      Vbas: Number(values.Vbas),
      Vhaut: Number(values.Vbas) + Number(values.deltaV),
    };
    try {
      await fetch(RADIATION_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(parsedValues),
      });
      toast({ title: "Valeurs envoyées", status: "success" });
    } finally {
      setIsSending(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // --- MODIFICATION ICI POUR LA CONNEXION SOCKET ---
  useEffect(() => {
    if (!WEBSOCKET_URL) return;

    const socket = io(WEBSOCKET_URL, {
      transports: ["websocket"], // Force le websocket pour éviter les erreurs de polling
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log("Live stream connected"));
    
    // Écoute l'événement du serveur
    socket.on('radiationData', (data) => {
      applyIncomingData(data);
    });

    return () => socket.disconnect();
  }, [applyIncomingData]);

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
      mode: "lines+markers", // Ajout de markers pour mieux voir les points en temps réel
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
      <header className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-3">
              <img src="cnesten.png" alt="CNESTEN Logo" className="w-14 h-14 object-contain" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-gray-800">CNESTEN</h1>
                <p className="text-xs text-gray-500">DERS/UDI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600">
                <FaRadiation className="text-white" size={24} />
              </div>
              <div className="hidden md:block">
                <h1 className="text-xl font-bold text-gray-800">SCA IoT-Monitoring V1.0</h1>
                <p className="text-sm text-gray-500">Radiation Dashboard</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => router.push("/air")} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-100 text-green-600">
                🌿 <span className="font-medium text-sm hidden lg:inline">Agriculture</span>
              </button>
              <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 rounded-xl text-gray-600">
                <FaSignOutAlt size={18} />
                <span className="font-medium hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6" style={{ paddingTop: "100px" }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="modern-card p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white">
                <MdSensors size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-800">Control Panel</h2>
              </div>
            </div>
            <div className="space-y-4">
              <Input placeholder="Enter LLD value" value={values.Vbas} onChange={handleChange("Vbas")} />
              <Input placeholder="Enter ΔV value" value={values.deltaV} onChange={handleChange("deltaV")} />
              <Button colorScheme="purple" onClick={handleSend} isLoading={isSending} w="full">Confirm</Button>
              <div className="mt-6 pt-6 border-t border-gray-100 space-y-4">
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase">Intensity</p>
                  <Select size="xs" value={countInterval} onChange={(e) => setCountInterval(e.target.value)}>
                    <option value="second">per second</option>
                    <option value="minute">per minute</option>
                  </Select>
                  <p className="text-2xl font-black text-gray-800">{formatIndicatorValue(latestIntensityValue)}</p>
                </div>
                <div className="p-4 bg-gray-50/50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-400 uppercase">Amplitude</p>
                  <p className="text-xl font-bold text-gray-800">{formatIndicatorValue(latestPicValue)} V</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="modern-card p-6">
              <h2 className="text-xl font-bold text-gray-800">Integral Mode</h2>
              <Plot data={chartData} layout={layout} useResizeHandler style={{ width: "100%", height: "280px" }} />
            </div>
            <div className="modern-card p-6">
              <h2 className="text-xl font-bold text-gray-800">Differential Mode</h2>
              <Plot data={picChartData} layout={picLayout} useResizeHandler style={{ width: "100%", height: "280px" }} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default protectedRoute(RadiationDash);
