"use client";

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
  const [visualizationMode, setVisualizationMode] = useState("line");

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

  const latestTimelinePoint =
    timelinePoints.length > 0 ? timelinePoints[timelinePoints.length - 1] : null;

  const latestPicEntry = radiationData
    .slice()
    .reverse()
    .find((entry) => asNumber(entry?.pic) !== null);

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
          mode: "lines+markers",
          marker: { color: "green" },
        },
      ]
    : [];

  const gaugeChartData =
    latestTimelinePoint && maxComptage !== null && Number.isFinite(maxComptage)
      ? [
          {
            type: "indicator",
            mode: "gauge+number+delta",
            value: latestTimelinePoint.comptage,
            title: { text: "Comptage actuel" },
            delta:
              maxComptage > 0
                ? {
                    reference: maxComptage,
                    increasing: { color: "#dc2626" },
                    decreasing: { color: "#16a34a" },
                  }
                : undefined,
            gauge: {
              axis: { range: [0, Math.max(maxComptage, latestTimelinePoint.comptage || 0, 1)] },
              bar: { color: "#22c55e" },
              steps:
                maxComptage > 0
                  ? [
                      { range: [0, maxComptage * 0.5], color: "#dcfce7" },
                      { range: [maxComptage * 0.5, maxComptage * 0.8], color: "#bbf7d0" },
                      { range: [maxComptage * 0.8, Math.max(maxComptage, latestTimelinePoint.comptage)], color: "#fde68a" },
                    ]
                  : undefined,
              threshold:
                maxComptage > 0
                  ? {
                      line: { color: "#ef4444", width: 4 },
                      thickness: 0.75,
                      value: maxComptage,
                    }
                  : undefined,
            },
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
          mode: "lines+markers",
          marker: { color: "#2563eb" },
          line: { color: "#2563eb" },
        },
      ]
    : [];

  const basePlotLayout = {
    autosize: true,
    margin: { l: 40, r: 20, t: 40, b: 50, pad: 4 },
  };

  const layout = {
    ...basePlotLayout,
    title: "Radiation Chart",
    xaxis: { title: "Time" },
    yaxis: { title: "Value" },
  };

  const picLayout = {
    ...basePlotLayout,
    title: "Comptage by Pic",
    xaxis: { title: "Pic", rangemode: "tozero" },
    yaxis: { title: "Comptage", rangemode: "tozero" },
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <img className="h-14 w-14 rounded-lg border border-slate-800 bg-slate-900 p-2" src="cnesten.png" alt="CNESTEN logo" />
            <div>
              <p className="text-2xl font-semibold tracking-wide">Radiation project dashboard</p>
              <p className="text-sm text-slate-400">Suivi en temps réel des mesures et indicateurs critiques</p>
            </div>
          </div>
          <Button colorScheme="red" onClick={handleLogout} className="self-start sm:self-auto">
            Logout
          </Button>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl shadow-slate-950/40 backdrop-blur">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-slate-300">Control</h2>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium uppercase text-emerald-300">
                Manual override
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Ajustez les seuils bas et hauts pour affiner la surveillance des capteurs.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="radiation-lld">
                  LLD
                </label>
                <Input
                  id="radiation-lld"
                  type="number"
                  placeholder="Entrer la valeur LLD"
                  value={values.Vbas}
                  onChange={handleChange("Vbas")}
                  variant="filled"
                  size="md"
                  focusBorderColor="green.400"
                  className="bg-slate-950/70 text-slate-100"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="radiation-hld">
                  HLD
                </label>
                <Input
                  id="radiation-hld"
                  type="number"
                  placeholder="Entrer la valeur HLD"
                  value={values.Vhaut}
                  onChange={handleChange("Vhaut")}
                  variant="filled"
                  size="md"
                  focusBorderColor="green.400"
                  className="bg-slate-950/70 text-slate-100"
                />
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-slate-500">
                Les valeurs seront transmises immédiatement au système de contrôle.
              </p>
              <Button
                colorScheme="green"
                onClick={handleSend}
                isLoading={isSending}
                loadingText="Sending"
                className="min-w-[120px] justify-center"
              >
                Send
              </Button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/90 via-slate-900 to-slate-950 p-5 shadow-xl shadow-slate-950/40">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold uppercase tracking-[0.2em] text-slate-300">Indicator</h2>
              <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs font-medium uppercase text-blue-300">
                Live feed
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-400">
              Dernières mesures issues du flux de données temps réel.
            </p>
            <div className="mt-6 flex flex-col gap-4">
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Comptage CPS</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">
                  {latestTimelinePoint?.comptage ?? "N/A"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Valeur actuelle issue de la dernière mesure reçue.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950/70 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">Pic</p>
                <p className="mt-2 text-3xl font-semibold text-slate-100">
                  {latestPicEntry ? asNumber(latestPicEntry.pic) : "N/A"}
                </p>
                <p className="mt-1 text-xs text-slate-500">Dernier pic valide détecté dans l&apos;historique récent.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 pb-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-200">Visualisation des comptages</h2>
              <Select
                value={visualizationMode}
                onChange={(event) => setVisualizationMode(event.target.value)}
                maxW="240px"
                size="sm"
                focusBorderColor="green.400"
                className="bg-slate-950/80 text-slate-100"
              >
                <option value="line">Courbe temporelle</option>
                <option value="gauge">Jauge avec pic</option>
              </Select>
            </div>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              {visualizationMode === "line" ? (
                chartData.length ? (
                  <Plot
                    data={chartData}
                    layout={layout}
                    className="w-full"
                    useResizeHandler
                    style={{ width: "100%", height: "400px" }}
                  />
                ) : (
                  <p className="text-center text-sm text-slate-500">
                    Aucun comptage valide à afficher pour la série temporelle.
                  </p>
                )
              ) : gaugeChartData.length ? (
                <Plot
                  data={gaugeChartData}
                  layout={{ ...basePlotLayout, margin: { l: 40, r: 40, t: 60, b: 30, pad: 4 } }}
                  className="w-full"
                  useResizeHandler
                  style={{ width: "100%", height: "400px" }}
                />
              ) : (
                <p className="text-center text-sm text-slate-500">
                  Pas de données suffisantes pour afficher la jauge et le pic.
                </p>
              )}
            </div>
            {visualizationMode === "gauge" && maxComptage !== null && Number.isFinite(maxComptage) ? (
              <p className="mt-4 text-xs text-slate-500 sm:text-center">
                Pic enregistré&nbsp;: <span className="font-semibold text-slate-200">{maxComptage}</span> &mdash; Dernier comptage&nbsp;:
                <span className="font-semibold text-slate-200"> {latestTimelinePoint?.comptage ?? "N/A"}</span>
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 shadow-xl shadow-slate-950/40">
            <h2 className="text-lg font-semibold text-slate-200">Comptage en fonction du Pic</h2>
            <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/50 p-3">
              {picChartData.length ? (
                <Plot
                  data={picChartData}
                  layout={picLayout}
                  className="w-full"
                  useResizeHandler
                  style={{ width: "100%", height: "400px" }}
                />
              ) : (
                <p className="text-center text-sm text-slate-500">
                  Les valeurs de pic et de comptage sont manquantes ou invalides.
                </p>
              )}
            </div>
          </div>
        </section>

        <footer className="pb-4 text-center text-xs uppercase tracking-[0.35em] text-slate-600">
          DERS/UDI Designed
        </footer>
      </div>
    </div>
  );
}
