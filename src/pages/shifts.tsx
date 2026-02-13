"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Vehicle } from "@/types/vehicle";
import { Driver } from "@/types/driver";
import { Shift } from "@/types/shift";
import { ActiveShift } from "@/types/activeShifts";
import AddVehicle from "@/components/AddVehicle";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ShiftsDashboard() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  // ── Tab state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  // ── Date filter state ───────────────────────────────────────────────
  const [filterDate, setFilterDate] = useState("");

  // ── Filtered shifts based on date ───────────────────────────────────
  const filteredByDate = shifts.filter((shift) => {
    if (!filterDate) return true;
    const shiftDate = new Date(shift.timeStarted).toISOString().split("T")[0]; // YYYY-MM-DD
    return shiftDate === filterDate;
  });

  // ── Final list for current tab ──────────────────────────────────────
  const displayedShifts =
    activeTab === "active"
      ? filteredByDate.filter((s) => s.isActive)
      : filteredByDate;

  // ── Data loading ─────────────────────────────────────────────────────
  async function loadVehicles() {
    try {
      const res = await axios.get(`${API}/api/vehicles`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.data.success) setVehicles(res.data.data);
    } catch (err) {
      console.error("Failed to load vehicles:", err);
    }
  }

  async function loadDrivers() {
    try {
      const res = await axios.get(`${API}/api/drivers`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.data.success) setDrivers(res.data.data);
    } catch (err) {
      console.error("Failed to load drivers:", err);
    }
  }

  async function loadShifts() {
    try {
      const res = await axios.get(`${API}/api/shifts`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (res.data.success) setShifts(res.data.data);
    } catch (err) {
      console.error("Failed to load shifts:", err);
    }
  }

  useEffect(() => {
    loadVehicles();
    loadDrivers();
    loadShifts();
  }, []);

  // ── Shift actions ─────────────────────────────────────────────────────
  const startShift = async () => {
    if (!selectedVehicle || !selectedDriver) {
      alert("Please select both a vehicle and a driver.");
      return;
    }
    console.log("Starting shift with:", {
      vehicleId: selectedVehicle._id,
      driverId: selectedDriver._id,
      APIEndpoint: `${API}/api/shifts/newShift`,
    });

    try {
      setWaiting(true);
      const res = await axios.post(
        `${API}/api/shifts/newShift`,
        {
          vehicleId: selectedVehicle._id,
          driverId: selectedDriver._id,
        },
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (!res.data.success) {
        alert("Failed to start shift: " + res.data.message);
        return;
      }

      alert("Shift started successfully!");
      setSelectedVehicle(null);
      setSelectedDriver(null);
      loadVehicles();
      loadDrivers();
      loadShifts();
    } catch (err) {
      console.error("Error starting shift:", err);
      alert("An error occurred while starting the shift.");
    } finally {
      setWaiting(false);
    }
  };

  const endShift = async (shiftId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to end this shift?",
    );
    if (!confirmed) return;

    try {
      setWaiting(true);
      const res = await axios.post(
        `${API}/api/shifts/${shiftId}/endShift`,
        {},
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (!res.data.success) {
        alert("Failed to end shift: " + res.data.message);
        return;
      }

      alert("Shift ended successfully!");
      loadVehicles();
      loadDrivers();
      loadShifts();
    } catch (err) {
      console.error("Error ending shift:", err);
      alert("An error occurred while ending the shift.");
    } finally {
      setWaiting(false);
    }
  };

  const endAllShifts = async () => {
    const confirmed = window.confirm(
      "Are you sure you want to end ALL active shifts? This action cannot be undone.",
    );
    if (!confirmed) return;

    try {
      setWaiting(true);
      const res = await axios.post(
        `${API}/api/shifts/endAll`,
        {},
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (!res.data.success) {
        alert("Failed to end all shifts: " + res.data.message);
        return;
      }

      alert("All shifts ended successfully!");
      loadVehicles();
      loadDrivers();
      loadShifts();
    } catch (err) {
      console.error("Error ending all shifts:", err);
      alert("An error occurred while ending all shifts.");
    } finally {
      setWaiting(false);
    }
  };

  // ── Filter available vehicles and drivers ─────────────────────────────
  // Vehicles are available if they are NOT currently in a shift (driverId === null)
  const availableVehicles = vehicles.filter((v) => v.driverId === null);
  // Drivers are available if they are NOT on shift
  const availableDrivers = drivers.filter((d) => !d.onShift);

  // Active shifts (isActive === true)
  const activeShifts = shifts.filter((s) => s.isActive);

  return (
    <div className="flex h-screen bg-[#0A0E1A] text-slate-200 font-mono">
      {/* ── Sidebar ── */}
      <aside className="w-64 border-r border-[#1E2A45] bg-[#0D1220] p-6 flex flex-col gap-6">
        <div className="text-xs font-bold tracking-[0.3em] text-slate-400 uppercase">
          Skylink Networks
        </div>
        <nav className="flex flex-col gap-2">
          <button
            onClick={() => setShowAddVehicle(true)}
            className="w-full text-left px-4 py-2 rounded border border-[#1E2A45] text-sm hover:border-sky-400 hover:text-sky-400 transition"
          >
            + Add Vehicle
          </button>
          <button
            onClick={endAllShifts}
            disabled={waiting}
            className="w-full text-left px-4 py-2 rounded border border-[#1E2A45] text-sm hover:border-red-400 hover:text-red-400 transition disabled:opacity-50"
          >
            ⚠️ End All Shifts
          </button>
        </nav>
        <div className="mt-auto text-xs text-slate-500">Fleet Manager</div>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold mb-8">Shift Management</h1>

        {/* Create Shift Card */}
        <div className="bg-[#0D1220] border border-[#1E2A45] rounded-lg p-6 mb-8">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Create New Shift
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Vehicle dropdown */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Vehicle
              </label>
              <select
                className="w-full bg-[#131929] border border-[#1E2A45] rounded px-4 py-2 text-sm"
                value={selectedVehicle?._id || ""}
                onChange={(e) => {
                  const v = vehicles.find((v) => v._id === e.target.value);
                  setSelectedVehicle(v || null);
                }}
              >
                <option value="">Select a vehicle</option>
                {availableVehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.name} {v.plateNumber ? `(${v.plateNumber})` : ""}
                  </option>
                ))}
              </select>
              {availableVehicles.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  No vehicles available
                </p>
              )}
            </div>

            {/* Driver dropdown */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Driver
              </label>
              <select
                className="w-full bg-[#131929] border border-[#1E2A45] rounded px-4 py-2 text-sm"
                value={selectedDriver?._id || ""}
                onChange={(e) => {
                  const d = drivers.find((d) => d._id === e.target.value);
                  setSelectedDriver(d || null);
                }}
              >
                <option value="">Select a driver</option>
                {availableDrivers.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name} {d.employeeId ? `(${d.employeeId})` : ""}
                  </option>
                ))}
              </select>
              {availableDrivers.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  No drivers available
                </p>
              )}
            </div>
          </div>

          <button
            onClick={startShift}
            disabled={waiting || !selectedVehicle || !selectedDriver}
            className="mt-6 px-6 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-sm font-semibold transition"
          >
            {waiting ? "Processing…" : "Start Shift"}
          </button>
        </div>

        {/* Tabs and Filter Bar */}
        <div className="mb-6 flex items-center justify-between">
          {/* Manual Tabs */}
          <div className="flex gap-2 border-b border-[#1E2A45]">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "active"
                  ? "border-b-2 border-sky-400 text-sky-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Active Shifts
            </button>
            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === "all"
                  ? "border-b-2 border-sky-400 text-sky-400"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              All Shifts
            </button>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-400">
              Filter by start date:
            </label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="bg-[#131929] border border-[#1E2A45] rounded px-3 py-1 text-sm text-slate-200"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate("")}
                className="text-xs text-slate-400 hover:text-slate-200"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Shifts List */}
        {displayedShifts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No {activeTab === "active" ? "active" : ""} shifts
            {filterDate ? " for selected date" : ""}.
          </p>
        ) : (
          <div className="space-y-3">
            {displayedShifts.map((shift) => (
              <div
                key={shift._id}
                className="flex items-center justify-between bg-[#131929] border border-[#1E2A45] rounded p-4"
              >
                <div>
                  <p className="text-sm font-medium">
                    {shift.vehicleId?.name || "Unknown vehicle"} ·{" "}
                    {shift.vehicleId?.plateNumber || "Unknown plate"} ·{" "}
                    {shift.driverId?.name || "Unknown driver"}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Started: {new Date(shift.timeStarted).toLocaleString()}
                    {!shift.isActive && shift.timeEnded && (
                      <>
                        {" "}
                        · Ended: {new Date(shift.timeEnded).toLocaleString()}
                      </>
                    )}
                  </p>
                </div>
                {shift.isActive && (
                  <button
                    onClick={() => endShift(shift._id)}
                    disabled={waiting}
                    className="px-4 py-1 border border-red-500/30 text-red-400 hover:bg-red-950 rounded text-xs disabled:opacity-50 transition"
                  >
                    End
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Add Vehicle Modal */}
      {showAddVehicle && (
        <AddVehicle
          apiBase={API}
          onAdded={() => {
            loadVehicles();
            setShowAddVehicle(false);
          }}
          onClose={() => setShowAddVehicle(false)}
        />
      )}
    </div>
  );
}
