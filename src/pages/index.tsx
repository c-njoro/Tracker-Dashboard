"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import TechniciansList from "@/components/TechniciansList";
import StatsBar from "@/components/StatsBar";
import { EventSourcePolyfill } from "event-source-polyfill";
import { useRouter } from "next/navigation";

// ✅ Use the real Vehicle type everywhere
import type { Technician } from "@/types/technician";

const LiveMap = dynamic(() => import("@/components/LiveMap"), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function Dashboard() {
  const router = useRouter();
  // ✅ State: record of Vehicle objects, keyed by _id
  const [technicians, setTechnicians] = useState<Record<string, Technician>>(
    {},
  );
  const [toPassTechnicians, setToPassTechnicians] = useState<Technician[]>([]); // ✅ Derived array for passing to components
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sseStatus, setSseStatus] = useState<"connecting" | "live" | "error">(
    "connecting",
  );
  const eventSourceRef = useRef<EventSource | null>(null);

  // ── Load initial vehicle list + latest positions ─────────────────────────
  async function loadTechnicians() {
    try {
      const data = await fetch(`${API}/api/locations/latest`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      }).then((r) => r.json());
      // ✅ data is an array of Vehicle objects – convert to record
      const record = Object.fromEntries(
        data.map((v: Technician) => [v._id, v]),
      );
      setToPassTechnicians(Object.values(record)); // ✅ Set derived array for components
      setTechnicians(record);
    } catch (err) {
      console.error("Failed to load technicians:", err);
    }
  }

  useEffect(() => {
    loadTechnicians();
  }, []);

  // ── SSE live updates ─────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;

    const es = new EventSourcePolyfill(`${API}/api/live/stream`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });

    eventSourceRef.current = es;

    es.onopen = () => setSseStatus("live");
    es.onerror = () => setSseStatus("error");
    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        const update = JSON.parse(e.data);
        // ✅ update has flat fields: vehicleId, lat, lng, speed, heading, timestamp, ...
        setTechnicians((prev) => {
          const technician = prev[update.technicianId];
          if (!technician) return prev; // ignore unknown technician

          // ✅ Transform flat update into nested lastSeen object
          const updatedTechnician: Technician = {
            ...technician,
            // Update top‑level fields if provided (driverName, vehicleName, etc.)
            name: update.Name ?? technician.name,
            employeeId: update.vehicleemployeeId ?? technician.employeeId,

            userId: update.userId ?? technician.userId,
            inShift: update.inUse ?? technician.inShift, // if your SSE sends `inUse`
            // Update lastSeen – preserve existing fields if update doesn't include them
            lastSeen: {
              ...(technician.lastSeen || {}),
              lat: update.lat ?? technician.lastSeen?.lat,
              lng: update.lng ?? technician.lastSeen?.lng,
              speed: update.speed ?? technician.lastSeen?.speed,
              heading: update.heading ?? technician.lastSeen?.heading,
              timestamp: update.timestamp ?? technician.lastSeen?.timestamp,
            },
          };

          return {
            ...prev,
            [update.technicianId]: updatedTechnician,
          };
        });
      } catch (err) {
        // ignore malformed message
      }
    };

    return () => es.close();
  }, []);

  // ── Derived values ───────────────────────────────────────────────────────
  const selectedTechnician = selectedId ? technicians[selectedId] : null;
  const [deviceOfSelected, setDeviceOfSelected] = useState<string>("");

  useEffect(() => {
    if (selectedTechnician && selectedTechnician.userId) {
      const dv = toPassTechnicians.find(
        (t) => t._id === selectedTechnician._id,
      );
      setDeviceOfSelected(dv?.userId?.deviceId || "Unknown");
    }
  }, [selectedTechnician]);

  return (
    <div className="flex h-screen flex-col bg-[#0A0E1A] text-slate-200 font-mono overflow-hidden">
      {/* ── Top Bar ───────────────────────────────────────────── */}
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

        <StatsBar technicians={toPassTechnicians} />

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => router.push("/shifts")}
            className="rounded-md border border-[#1E2A45] px-3 py-1 text-[11px] tracking-wider text-slate-400 hover:border-sky-400 hover:text-sky-400 transition"
          >
            Shifts Management
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

      {/* ── Main Layout ───────────────────────────────────────── */}
      <main className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[280px] flex-shrink-0 border-r border-[#1E2A45] bg-[#0D1220] flex flex-col overflow-y-auto">
          <div className="border-b border-[#1E2A45] px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Fleet ({toPassTechnicians.length})
          </div>

          <TechniciansList
            technicians={toPassTechnicians}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setShowHistory(false); // close history when switching technicians
            }}
          />

          {/* ── Selected Vehicle Panel (now uses correct Vehicle fields) ── */}
          {selectedTechnician && (
            <div className="mt-auto border-t border-[#1E2A45] bg-[#0A0E1A] p-4">
              <div className="text-sm font-bold">{selectedTechnician.name}</div>

              {selectedTechnician.employeeId && (
                <div className="mt-1 inline-block rounded bg-[#1E2A45] px-2 py-0.5 text-[11px] tracking-widest text-slate-400">
                  {selectedTechnician.employeeId}
                </div>
              )}

              {/* Driver info – we only have userId, not name */}
              <div
                className={`mt-3 flex items-center gap-2 rounded-md border px-2.5 py-2 ${
                  selectedTechnician.userId
                    ? "border-emerald-500/30 bg-emerald-900/30"
                    : "border-[#1E2A45] bg-[#131929]"
                }`}
              >
                <span>📱</span>
                <span
                  className={`text-xs font-semibold ${
                    selectedTechnician.userId
                      ? "text-emerald-400"
                      : "text-slate-400"
                  }`}
                >
                  {selectedTechnician.userId
                    ? ` ${deviceOfSelected}`
                    : "No device assigned"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  [
                    "Speed",
                    `${selectedTechnician.lastSeen?.speed?.toFixed(0) ?? 0} km/h`,
                  ],
                  [
                    "Heading",
                    `${selectedTechnician.lastSeen?.heading?.toFixed(0) ?? "–"}°`,
                  ],
                  [
                    "Last Ping",
                    selectedTechnician.lastSeen?.timestamp
                      ? new Date(
                          selectedTechnician.lastSeen.timestamp,
                        ).toLocaleTimeString()
                      : "–",
                  ],
                  [
                    "Status",
                    selectedTechnician.inShift ? "On Shift" : "Available",
                  ],
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
            </div>
          )}
        </aside>

        {/* Map Section */}
        <section className="relative flex flex-1 flex-col overflow-hidden">
          <LiveMap
            technicians={toPassTechnicians}
            selectedId={selectedId}
            onTechnicianClick={setSelectedId}
          />
        </section>
      </main>
    </div>
  );
}
