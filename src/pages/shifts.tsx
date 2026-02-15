"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { Technician } from "@/types/technician";
import { User } from "@/types/user";
import { ActiveShift } from "@/types/activeShifts";
import AddVehicle from "@/components/AddVehicle";
import TripHistory from "@/components/TripHistory";
import { Response } from "@/types/response";
import { useRouter } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function ShiftsDashboard() {
  const router = useRouter();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [selectedTechnician, setSelectedTechnician] =
    useState<Technician | null>(null);
  const [waiting, setWaiting] = useState(false);
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [selectedShiftForHistory, setSelectedShiftForHistory] =
    useState<ActiveShift | null>(null);

  // ── Tab state ────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"active" | "all">("active");

  // ── Date filter state ───────────────────────────────────────────────
  const [filterDate, setFilterDate] = useState("");

  // ── Filtered shifts based on date ───────────────────────────────────
  const filteredByDate = shifts.filter((shift) => {
    if (!filterDate) return true;
    const shiftDate = new Date(shift.timeStarted).toISOString().split("T")[0];
    return shiftDate === filterDate;
  });

  // ── Final list for current tab ──────────────────────────────────────
  const displayedShifts =
    activeTab === "active"
      ? filteredByDate.filter((s) => s.isActive)
      : filteredByDate;

  // ── Data loading ─────────────────────────────────────────────────────
  async function loadTechnicians() {
    try {
      const { data } = await axios.get<Response>(`${API}/api/technicians`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (data.success) setTechnicians(data.data);
    } catch (err) {
      console.error("Failed to load technicians:", err);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await axios.get<Response>(`${API}/api/users`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (data.success) setUsers(data.data);
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  }

  async function loadShifts() {
    try {
      const { data } = await axios.get<Response>(`${API}/api/shifts`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      if (data.success) setShifts(data.data);
    } catch (err) {
      console.error("Failed to load shifts:", err);
    }
  }

  useEffect(() => {
    loadTechnicians();
    loadUsers();
    loadShifts();
  }, []);

  useEffect(() => {
    console.log("Technicians:", technicians);
    console.log("Users:", users);
    console.log("Shifts:", shifts);
  }, [technicians, users, shifts]);

  // ── Shift actions ─────────────────────────────────────────────────────
  const startShift = async () => {
    if (!selectedTechnician) {
      alert("Please select a technician.");
      return;
    }
    if (!selectedTechnician.userId) {
      alert("Selected technician has not registered on the tracker app.");
      return;
    }

    try {
      setWaiting(true);
      const { data } = await axios.post<Response>(
        `${API}/api/shifts/newShift`,
        { employeeId: selectedTechnician.employeeId },
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (data.success) {
        alert("Shift started successfully!");
        setSelectedTechnician(null);
        await Promise.all([loadTechnicians(), loadUsers(), loadShifts()]);
      } else {
        alert("Failed to start shift: " + data.message);
      }
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
      const { data } = await axios.post<Response>(
        `${API}/api/shifts/${shiftId}/endShift`,
        {},
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (data.success) {
        alert("Shift ended successfully!");
        await Promise.all([loadTechnicians(), loadUsers(), loadShifts()]);
      } else {
        alert("Failed to end shift: " + data.message);
      }
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
      const { data } = await axios.post<Response>(
        `${API}/api/shifts/endAll`,
        {},
        { headers: { "ngrok-skip-browser-warning": "true" } },
      );

      if (data.success) {
        alert("All shifts ended successfully!");
        await Promise.all([loadTechnicians(), loadUsers(), loadShifts()]);
      } else {
        alert("Failed to end all shifts: " + data.message);
      }
    } catch (err) {
      console.error("Error ending all shifts:", err);
      alert("An error occurred while ending all shifts.");
    } finally {
      setWaiting(false);
    }
  };

  // ── Filter available technicians and users ─────────────────────────────
  // technicians are available if they are NOT currently in a shift (userId !== null)
  const registeredTechnicians =
    technicians?.filter(
      (v) => v.userId !== null && v.isActive === true && v.inShift === false,
    ) || [];

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
            onClick={() => router.push("/")}
            className="w-full text-left px-4 py-2 rounded border border-[#1E2A45] text-sm hover:border-sky-400 hover:text-sky-400 transition"
          >
            📍 Live Map
          </button>
          <button
            onClick={() => setShowAddVehicle(true)}
            className="w-full text-left px-4 py-2 rounded border border-[#1E2A45] text-sm hover:border-sky-400 hover:text-sky-400 transition"
          >
            + Add Technician
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
            Initiate A Shift Manually
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Technician dropdown */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-slate-500 mb-2">
                Technician
              </label>
              <select
                className="w-full bg-[#131929] border border-[#1E2A45] rounded px-4 py-2 text-sm"
                value={selectedTechnician?._id || ""}
                onChange={(e) => {
                  const tech = technicians.find(
                    (v) => v._id === e.target.value,
                  );
                  setSelectedTechnician(tech || null);
                }}
              >
                <option value="">Select a technician</option>
                {registeredTechnicians.map((tech) => (
                  <option key={tech._id} value={tech._id}>
                    {tech.name} | {tech.employeeId} |{" "}
                    {tech.userId?.deviceId || "Unknown Device"}
                  </option>
                ))}
              </select>
              {registeredTechnicians.length === 0 && (
                <p className="text-xs text-amber-400 mt-2">
                  No technicians available for a shift.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={startShift}
            disabled={waiting || !selectedTechnician}
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
                    {shift.technicianId?.name || "Unknown technician"} ·{" "}
                    {shift.technicianId?.employeeId || "Unknown EmployeeId"} ·{" "}
                    {shift.userId?.deviceId || "Unknown Device"}
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
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedShiftForHistory(shift)}
                    className="px-3 py-1 border border-sky-500/30 text-sky-400 hover:bg-sky-950 rounded text-xs"
                  >
                    📜 Trip
                  </button>
                  {shift.isActive && (
                    <button
                      onClick={() => endShift(shift._id)}
                      disabled={waiting}
                      className="px-4 py-1 border border-red-500/30 text-red-400 hover:bg-red-950 rounded text-xs disabled:opacity-50"
                    >
                      End
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Trip History Modal */}
      {selectedShiftForHistory && (
        <TripHistory
          technicianId={selectedShiftForHistory.technicianId._id}
          apiBase={API}
          from={selectedShiftForHistory.timeStarted}
          to={
            selectedShiftForHistory.isActive
              ? undefined
              : selectedShiftForHistory.timeEnded!
          }
          shiftInfo={{
            technicianName: selectedShiftForHistory.technicianId.name,
            employeeId: selectedShiftForHistory.technicianId.employeeId,
            userDevice: selectedShiftForHistory.userId.deviceId,
            isActive: selectedShiftForHistory.isActive,
            startedAt: selectedShiftForHistory.timeStarted,
            endedAt: selectedShiftForHistory.timeEnded,
          }}
          onClose={() => setSelectedShiftForHistory(null)}
        />
      )}

      {/* Add Technician Modal */}
      {showAddVehicle && (
        <AddVehicle
          apiBase={API}
          onAdded={() => {
            loadTechnicians();
            setShowAddVehicle(false);
          }}
          onClose={() => setShowAddVehicle(false)}
        />
      )}
    </div>
  );
}
