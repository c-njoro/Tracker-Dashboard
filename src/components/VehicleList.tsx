"use client";

import type { Vehicle } from "@/types/vehicle";

const TYPE_EMOJI: Record<Vehicle["type"], string> = {
  truck: "🚛",
  van: "🚐",
  car: "🚗",
  motorcycle: "🏍",
  other: "🚙",
};

interface Props {
  vehicles: Vehicle[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function VehicleList({ vehicles, selectedId, onSelect }: Props) {
  if (vehicles.length === 0) {
    return (
      <div className="px-4 py-6 text-center text-xs text-slate-400">
        No vehicles online
      </div>
    );
  }

  return (
    <div>
      {vehicles.map((v) => {
        const isSelected = v._id === selectedId;

        const lastSeen = v.lastSeen;
        const speed = lastSeen?.speed ?? 0;

        const age = lastSeen?.timestamp
          ? Math.floor(
              (Date.now() - new Date(lastSeen.timestamp).getTime()) / 1000,
            )
          : null;

        const isStale = age !== null && age > 120;

        return (
          <button
            key={v._id}
            onClick={() => onSelect(v._id)}
            className={[
              "block w-full text-left px-4 py-3 border-b border-slate-800 transition",
              isSelected
                ? "bg-slate-900 border-l-4 border-sky-400"
                : "hover:bg-slate-900",
            ].join(" ")}
          >
            <div className="flex items-center gap-3">
              {/* Vehicle type */}
              <span className="text-lg">{TYPE_EMOJI[v.type] ?? "🚙"}</span>

              {/* Name + plate */}
              <div className="flex-1 min-w-0">
                <div
                  className={[
                    "truncate text-sm font-semibold",
                    isSelected ? "text-sky-400" : "text-slate-200",
                  ].join(" ")}
                >
                  {v.name}
                </div>

                {v.plateNumber && (
                  <div className="text-[10px] tracking-widest text-slate-500">
                    {v.plateNumber}
                  </div>
                )}
              </div>

              {/* Speed + freshness */}
              <div className="flex flex-col items-end">
                <div className="font-mono text-sm font-bold text-sky-400">
                  {Math.round(speed)}
                  <span className="ml-1 text-[9px] text-slate-500">km/h</span>
                </div>

                <div
                  className={[
                    "text-[10px] font-semibold tracking-wide",
                    isStale
                      ? "text-amber-400"
                      : age !== null
                        ? "text-emerald-400"
                        : "text-slate-500",
                  ].join(" ")}
                >
                  {age === null
                    ? "NO DATA"
                    : isStale
                      ? age < 300
                        ? `${age}s ago`
                        : "STALE"
                      : `${age}s ago`}
                </div>

                <div>
                  <p className={`text-xs`}>
                    {v.isActive ? "In Use" : "Not Active"}
                  </p>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
