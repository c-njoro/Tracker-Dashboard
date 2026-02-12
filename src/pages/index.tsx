"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import VehicleList from "@/components/VehicleList";
import StatsBar from "@/components/StatsBar";
import TripHistory from "@/components/TripHistory";
import AddVehicle from "@/components/AddVehicle";
import AddDriver from "@/components/AddDriver";

import { EventSourcePolyfill } from "event-source-polyfill";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export interface VehicleState {
  vehicleName: string;
  vehiclePlateNumber?: string;
  vehicleType: string;
  inUse: boolean;
  driverId?: string;
  driverName?: string;
  lat?: number;
  lng?: number;
  speed?: number;
  heading?: number;
  timestamp?: string;
}

export default function Dashboard() {
  const [vehicles, setVehicles] = useState<Record<string, VehicleState>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  async function loadVehicles() {
    const data = await fetch(`${API}/api/locations/latest`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    }).then((r) => r.json());
    console.log(data);
    setVehicles(data);
  }

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    // Ensure this runs only on the client (Next.js SSR safety)
    if (typeof window === "undefined") return;

    const es = new EventSourcePolyfill(`${API}/api/live/stream`, {
      headers: {
        "ngrok-skip-browser-warning": "true",
        // You can add other headers like Authorization if needed
      },
    });

    eventSourceRef.current = es;

    es.onopen = () => setSseStatus("live");
    es.onerror = () => setSseStatus("error");
    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        const update = JSON.parse(e.data);
        setVehicles((prev) => ({
          ...prev,
          [update.vehicleId]: { ...prev[update.vehicleId], ...update },
        }));
      } catch {}
    };

    return () => es.close();
  }, []);

  const vehicleList = Object.values(vehicles);
  const selectedVehicle = selectedId ? vehicles[selectedId] : null;

  return (
    <div className="flex h-screen flex-col bg-[#0A0E1A] text-slate-200 font-mono overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex h-[52px] items-center gap-4 border-b border-[#1E2A45] bg-[#0D1220] px-5">
        <div className="flex items-center gap-2">
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              sseStatus === "live"
                ? "bg-emerald-400 shadow-[0_0_8px_#00E67688] animate-pulse"
                : "bg-slate-600"
            }`}
          />
          <span className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">
            FleetTracker
          </span>
        </div>

        <StatsBar vehicles={vehicleList} />

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => setShowAddDriver(true)}
            className="rounded-md border border-[#1E2A45] px-3 py-1 text-[11px] tracking-wider text-slate-400 hover:border-sky-400 hover:text-sky-400 transition"
          >
            + Driver
          </button>
          <button
            onClick={() => setShowAddVehicle(true)}
            className="rounded-md border border-[#1E2A45] px-3 py-1 text-[11px] tracking-wider text-slate-400 hover:border-sky-400 hover:text-sky-400 transition"
          >
            + Vehicle
          </button>
        </div>

        <span
          className={`rounded px-2.5 py-1 text-[11px] font-semibold tracking-wider ${
            sseStatus === "live"
              ? "bg-emerald-400/10 text-emerald-400"
              : sseStatus === "connecting"
                ? "bg-amber-400/10 text-amber-400"
                : "bg-red-400/10 text-red-400"
          }`}
        >
          {sseStatus === "live"
            ? "● LIVE"
            : sseStatus === "connecting"
              ? "○ Connecting…"
              : "✕ Disconnected"}
        </span>
      </header>

      {/* ── Layout ── */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] flex-shrink-0 border-r border-[#1E2A45] bg-[#0D1220] flex flex-col overflow-y-auto">
          <div className="border-b border-[#1E2A45] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Fleet ({vehicleList.length})
          </div>

          <VehicleList
            vehicles={vehicleList}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setShowHistory(false);
            }}
          />

          {selectedVehicle && (
            <div className="mt-auto border-t border-[#1E2A45] bg-[#0A0E1A] p-4">
              <div className="text-sm font-bold">
                {selectedVehicle.vehicleName}
              </div>

              {selectedVehicle.vehiclePlateNumber && (
                <div className="mt-1 inline-block rounded bg-[#1E2A45] px-2 py-0.5 text-[11px] tracking-widest text-slate-400">
                  {selectedVehicle.vehiclePlateNumber}
                </div>
              )}

              <div
                className={`mt-3 flex items-center gap-2 rounded-md border px-2.5 py-2 ${
                  selectedVehicle.driverName
                    ? "border-emerald-500/30 bg-emerald-900/30"
                    : "border-[#1E2A45] bg-[#131929]"
                }`}
              >
                <span>👤</span>
                <span
                  className={`text-xs font-semibold ${
                    selectedVehicle.driverName
                      ? "text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {selectedVehicle.driverName ?? "No driver on shift"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  ["Speed", `${selectedVehicle.speed ?? 0} km/h`],
                  ["Heading", `${selectedVehicle.heading?.toFixed(0) ?? "–"}°`],
                  [
                    "Last Ping",
                    selectedVehicle.timestamp
                      ? new Date(selectedVehicle.timestamp).toLocaleTimeString()
                      : "–",
                  ],
                  ["Status", selectedVehicle.inUse ? "On Shift" : "Available"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-md bg-[#131929] p-2">
                    <div className="text-[9px] uppercase tracking-wider text-slate-500">
                      {label}
                    </div>
                    <div className="text-sm font-bold text-sky-400">
                      {value}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowHistory(!showHistory)}
                className="mt-3 w-full rounded-md border border-[#1E2A45] py-2 text-[11px] tracking-wider text-slate-400 hover:border-sky-400 hover:text-sky-400 transition"
              >
                {showHistory ? "Hide History" : "📍 View Trip History"}
              </button>
            </div>
          )}
        </aside>

        {/* Map */}
        <section className="relative flex flex-1 flex-col overflow-hidden">
          <LiveMap
            vehicles={vehicleList}
            selectedId={selectedId}
            onVehicleClick={setSelectedId}
          />
          {showHistory && selectedId && (
            <TripHistory vehicleId={selectedId} apiBase={API} />
          )}
        </section>
      </main>

      {showAddVehicle && (
        <AddVehicle
          apiBase={API}
          onAdded={loadVehicles}
          onClose={() => setShowAddVehicle(false)}
        />
      )}
      {showAddDriver && (
        <AddDriver
          apiBase={API}
          onAdded={loadVehicles}
          onClose={() => setShowAddDriver(false)}
        />
      )}
    </div>
  );
}
