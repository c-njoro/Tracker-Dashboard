"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false });

interface Ping {
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: string;
}

interface Props {
  technicianId: string;
  apiBase: string;
  from?: string; // ISO start date (optional – overrides range)
  to?: string; // ISO end date (optional)
  shiftInfo?: {
    technicianName: string;
    employeeId?: string;
    userDevice?: string | null;
    isActive: boolean;
    startedAt: string;
    endedAt?: string | null;
  };
  onClose?: () => void;
}

export default function TripHistory({
  technicianId,
  apiBase,
  from,
  to,
  shiftInfo,
  onClose,
}: Props) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h"); // only used if from/to not provided

  // Determine effective from/to
  const effectiveFrom =
    from ||
    (() => {
      const hours = range === "1h" ? 1 : range === "6h" ? 6 : 24;
      return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    })();

  const effectiveTo = to || new Date().toISOString();

  useEffect(() => {
    setLoading(true);
    // Fetch with a very high limit to get all pings in the range
    fetch(
      `${apiBase}/api/locations/${technicianId}/history?from=${effectiveFrom}&to=${effectiveTo}&limit=10000`,
      { headers: { "ngrok-skip-browser-warning": "true" } },
    )
      .then((r) => r.json())
      .then((data) => {
        setPings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [technicianId]);

  // Stats calculations (unchanged)
  const maxSpeed = Math.max(...pings.map((p) => p.speedKmh ?? 0), 1);
  const avgSpeed = pings.length
    ? (pings.reduce((s, p) => s + (p.speedKmh ?? 0), 0) / pings.length).toFixed(
        1,
      )
    : "–";
  const distance =
    pings.length < 2
      ? 0
      : pings
          .reduce((total, ping, i) => {
            if (i === 0) return 0;
            const prev = pings[i - 1];
            const dx =
              (ping.lng - prev.lng) *
              111320 *
              Math.cos((ping.lat * Math.PI) / 180);
            const dy = (ping.lat - prev.lat) * 110574;
            return total + Math.sqrt(dx * dx + dy * dy) / 1000;
          }, 0)
          .toFixed(1);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "#0A0E1A",
        zIndex: 1000,
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}
    >
      {/* Header with shift info and close button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          {shiftInfo ? (
            <>
              <h2
                style={{ fontSize: 20, fontWeight: "bold", color: "#E2E8F0" }}
              >
                {shiftInfo.technicianName} ·{" "}
                {shiftInfo.employeeId || "No Employee ID"}
              </h2>
              <p style={{ fontSize: 14, color: "#94A3B8", marginTop: 4 }}>
                Device: {shiftInfo.userDevice} ·{" "}
                {shiftInfo.isActive ? (
                  <span style={{ color: "#10B981" }}>● Active</span>
                ) : (
                  <span style={{ color: "#64748B" }}>● Ended</span>
                )}
              </p>
              <p style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                Started: {new Date(shiftInfo.startedAt).toLocaleString()}
                {shiftInfo.endedAt &&
                  ` · Ended: ${new Date(shiftInfo.endedAt).toLocaleString()}`}
              </p>
            </>
          ) : (
            <h2 style={{ fontSize: 20, fontWeight: "bold", color: "#E2E8F0" }}>
              Trip History
            </h2>
          )}
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "#94A3B8",
              fontSize: 24,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Range selector – only show if no custom from/to */}
      {!from && !to && (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {(["1h", "6h", "24h"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              style={{
                background: range === r ? "#1E2A45" : "transparent",
                border: "1px solid",
                borderColor: range === r ? "#38BDF8" : "#1E2A45",
                color: range === r ? "#38BDF8" : "#475569",
                padding: "4px 12px",
                borderRadius: 4,
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              {r}
            </button>
          ))}
        </div>
      )}

      {/* Stats pills */}
      <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
        <StatPill label="PINGS" value={String(pings.length)} />
        <StatPill label="AVG SPEED" value={`${avgSpeed} km/h`} />
        <StatPill label="DISTANCE" value={`${distance} km`} />
      </div>

      {/* Mini‑map */}
      <div style={{ flex: 1, minHeight: 0, marginBottom: 16 }}>
        {!loading && pings.length > 0 && (
          <MiniMap pings={pings} interactive={true} />
        )}
        {!loading && pings.length === 0 && (
          <div style={{ color: "#334155", fontSize: 12, paddingTop: 16 }}>
            No location data for this period.
          </div>
        )}
      </div>

      {/* Speed chart */}
      <div style={{ height: 80, overflow: "hidden" }}>
        {loading ? (
          <div style={{ color: "#334155", fontSize: 12 }}>Loading…</div>
        ) : pings.length === 0 ? null : (
          <svg width="100%" height="100%" style={{ overflow: "visible" }}>
            <defs>
              <linearGradient id="speedGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38BDF8" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#38BDF8" stopOpacity="0" />
              </linearGradient>
            </defs>
            <polyline
              points={pings
                .map((p, i) => {
                  const x = (i / (pings.length - 1)) * 100 + "%";
                  const y = (1 - (p.speedKmh ?? 0) / maxSpeed) * 80 + "%";
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="url(#speedGrad)"
              stroke="none"
            />
            <polyline
              points={pings
                .map((p, i) => {
                  const x = (i / (pings.length - 1)) * 100 + "%";
                  const y = (1 - (p.speedKmh ?? 0) / maxSpeed) * 80 + "%";
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="#38BDF8"
              strokeWidth="1.5"
            />
          </svg>
        )}
      </div>
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: 1,
          color: "#334155",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 13,
          fontWeight: 700,
          color: "#38BDF8",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
