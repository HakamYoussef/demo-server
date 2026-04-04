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

// --- CONFIGURATION DES ENDPOINTS ---
const DEFAULT_API_BASE_URL = "http://213.199.35.129:5002";
const apiBaseUrl = (
  typeof process.env.NEXT_PUBLIC_API_BASE_URL === "string"
    ? process.env.NEXT_PUBLIC_API_BASE_URL
    : DEFAULT_API_BASE_URL
).replace(/\/+$/, "");

const READINGS_ENDPOINT = `${apiBaseUrl}/api/v1/readings`;
const RADIATION_ENDPOINT = `${apiBaseUrl}/api/radiation`;
const WEBSOCKET_URL = apiBaseUrl; // Socket.io se connecte à la racine du serveur

// --- FONCTIONS UTILITAIRES ---
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
  const [isSending, setIsSending] = useState(false);
  const [countInterval, setCountInterval] = useState("second");
  const socketRef = useRef(null);

  // --- LOGIQUE DE RÉCEPTION DES DONNÉES (TEMPS RÉEL) ---
  const applyIncomingData = useCallback((incoming) => {
    if (!incoming) return;

    // Cas 1 : Réception d'un tableau (Fetch initial au chargement)
    if (Array.isArray(incoming)) {
      const sanitized = incoming.filter((entry) => entry && typeof entry === "object");
      setRadiationData(sortByTimestamp(sanitized));
      return;
    }

    // Cas 2 : Réception d'un objet unique (Via Socket.io)
    setRadiationData((prev) => {
      const incomingTime = new Date(getEntryTime(incoming)).getTime();
      
      // Vérifier si la donnée existe déjà pour éviter les doublons visuels
      const exists = prev.some(item => new Date(getEntryTime(item)).getTime() === incomingTime);
      if (exists) return prev;

      // Ajouter la nouvelle donnée et limiter à 100 points pour la fluidité du graphique
      const updatedList = [...prev, incoming];
      return sortByTimestamp(updatedList).slice(-100); 
    });
  }, []);

  // --- RÉCUPÉRATION INITIALE (API REST) ---
  const fetchData = useCallback(async () => {
    try {
      const response = await fetch(READINGS_ENDPOINT);
      if (!response.ok) throw new Error(`Status ${response.status}`);
      const payload = await response.json();
      applyIncomingData(payload);
    } catch (error) {
      console.error("Fetch error:", error);
    }
  }, [applyIncomingData]);

  // --- CONNEXION WEBSOCKET (SOCKET.IO) ---
  useEffect(() => {
    fetchData();

    const socket = io(WEBSOCKET_URL, {
      transports: ["websocket"],
      reconnection: true
    });
    socketRef.current = socket;

    socket.on('connect', () => console.log("Connected to Real-time Stream"));
    
    // Écoute l'événement émis par le backend lors du POST de l'ESP32
    socket.on('radiationData', (data) => {
      console.log("Real-time data received:", data);
      applyIncomingData(data);
    });

    socket.on('disconnect', () => console.log("Disconnected from Stream"));

    return () => socket.disconnect();
  }, [fetchData, applyIncomingData]);

  // --- ENVOI DES SEUILS (POST) ---
  const handleSend = async () => {
    if (!token || values.Vbas === "" || values.deltaV === "") return;

    setIsSending(true);
    const parsedValues = {
      Vbas: Number(values.Vbas),
      Vhaut: Number(values.Vbas) + Number(values.deltaV),
    };

    try {
      const response = await fetch(RADIATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(parsedValues),
      });

      if (response.ok) {
        toast({ title: "Seuils envoyés à l'ESP32", status: "success" });
        setValues({ Vbas: "", Vhaut: "", deltaV: "" });
      }
    } catch (error) {
      console.error("Send error:", error);
    } finally {
      setIsSending(false);
    }
  };

  // --- PRÉPARATION DES DONNÉES GRAPHIQUES ---
  const asNumber = (val) => (isNaN(parseFloat(val)) ? null : parseFloat(val));

  const timelinePoints = radiationData.map((d) => ({
    x: new Date(getEntryTime(d)).toLocaleTimeString(),
    y: asNumber(d.comptage),
  })).filter(p => p.y !== null);

  const chartData = [{
    x: timelinePoints.map(p => p.x),
    y: timelinePoints.map(p => p.y),
    type: "scatter",
    mode: "lines+markers",
    marker: { color: "#10b981" },
    line: { shape: "spline", width: 3 }
  }];

  const latestEntry = radiationData[radiationData.length - 1] || {};
  const currentCPS = asNumber(latestEntry.comptage) || 0;
  const currentPIC = asNumber(latestEntry.pic) || 0;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm h-20 flex items-center px-6 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <FaRadiation className="text-purple-600" size={30} />
          <h1 className="text-xl font-bold text-gray-800">SCA IoT-Monitoring</h1>
        </div>
        <Button ml="auto" leftIcon={<FaSignOutAlt />} onClick={() => { logout(); router.push("/"); }}>
          Logout
        </Button>
      </header>

      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Panneau de Contrôle */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h2 className="font-bold mb-4 flex items-center gap-2"><MdOutlineTune /> Configuration</h2>
          <Input placeholder="Vbas (LLD)" mb={3} type="number" value={values.Vbas} onChange={(e) => setValues({...values, Vbas: e.target.value})} />
          <Input placeholder="Delta V" mb={4} type="number" value={values.deltaV} onChange={(e) => setValues({...values, deltaV: e.target.value})} />
          <Button colorScheme="purple" w="full" onClick={handleSend} isLoading={isSending}>Confirme</Button>

          <div className="mt-8 space-y-4">
             <div className="p-4 bg-purple-50 rounded-xl">
                <p className="text-xs font-bold text-purple-400 uppercase">Intensité</p>
                <p className="text-3xl font-black text-purple-700">{countInterval === "second" ? currentCPS : currentCPS * 60} <span className="text-sm">{countInterval === "second" ? "CPS" : "CPM"}</span></p>
                <Select size="xs" variant="unstyled" value={countInterval} onChange={(e) => setCountInterval(e.target.value)}>
                    <option value="second">Par seconde</option>
                    <option value="minute">Par minute</option>
                </Select>
             </div>
             <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-xs font-bold text-blue-400 uppercase">Amplitude (PIC)</p>
                <p className="text-3xl font-black text-blue-700">{currentPIC.toFixed(3)} <span className="text-sm">V</span></p>
             </div>
          </div>
        </div>

        {/* Graphiques */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FaChartLine className="text-green-500" /> Flux de Radiation (Temps Réel)
            </h2>
            {timelinePoints.length > 0 ? (
              <Plot
                data={chartData}
                layout={{ autosize: true, margin: { l: 40, r: 20, t: 10, b: 40 }, xaxis: { gridcolor: "#f0f0f0" }, yaxis: { gridcolor: "#f0f0f0" } }}
                style={{ width: "100%", height: "400px" }}
                useResizeHandler
              />
            ) : (
              <div className="h-[400px] flex items-center justify-center text-gray-400 italic">En attente de données de l'ESP32...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default protectedRoute(RadiationDash);
