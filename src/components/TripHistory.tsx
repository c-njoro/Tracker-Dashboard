"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

// Dynamically import Leaflet components (no SSR)
const MiniMap = dynamic(() => import("./MiniMap"), { ssr: false });

interface Ping {
  lat: number;
  lng: number;
  speedKmh: number;
  timestamp: string;
}

interface Props {
  vehicleId: string;
  apiBase: string;
}

export default function TripHistory({ vehicleId, apiBase }: Props) {
  const [pings, setPings] = useState<Ping[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("24h");

  useEffect(() => {
    setLoading(true);
    const hours = range === "1h" ? 1 : range === "6h" ? 6 : 24;
    const from = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
    const to = new Date().toISOString();

    fetch(
      `${apiBase}/api/locations/${vehicleId}/history?from=${from}&to=${to}&limit=500`,
      { headers: { "ngrok-skip-browser-warning": "true" } },
    )
      .then((r) => r.json())
      .then((data) => {
        setPings(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [vehicleId, range, apiBase]);

  // --- stats calculations ---
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
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 300, // more room for mini‑map
        background: "#0D1220",
        borderTop: "1px solid #1E2A45",
        display: "flex",
        flexDirection: "column",
        zIndex: 500,
      }}
    >
      {/* ── Header (fixed height) ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "8px 16px",
          borderBottom: "1px solid #1E2A45",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: "#475569",
            textTransform: "uppercase",
          }}
        >
          Trip History
        </span>
        {(["1h", "6h", "24h"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            style={{
              background: range === r ? "#1E2A45" : "transparent",
              border: "1px solid",
              borderColor: range === r ? "#38BDF8" : "#1E2A45",
              color: range === r ? "#38BDF8" : "#475569",
              padding: "2px 10px",
              borderRadius: 4,
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            {r}
          </button>
        ))}
        <div style={{ display: "flex", gap: 20, marginLeft: "auto" }}>
          <StatPill label="PINGS" value={String(pings.length)} />
          <StatPill label="AVG SPEED" value={`${avgSpeed} km/h`} />
          <StatPill label="DISTANCE" value={`${distance} km`} />
        </div>
      </div>

      {/* 🗺️ Mini‑Map – takes ALL remaining vertical space */}
      <div style={{ flex: 1, minHeight: 0, padding: "8px 16px" }}>
        {!loading && pings.length > 0 && <MiniMap pings={pings} />}
        {!loading && pings.length === 0 && (
          <div style={{ color: "#334155", fontSize: 12, paddingTop: 16 }}>
            No location data for this period.
          </div>
        )}
      </div>

      {/* 📈 Speed Chart – fixed height (80px) */}
      <div
        style={{ height: 80, padding: "0 16px 8px 16px", overflow: "hidden" }}
      >
        {loading ? (
          <div style={{ color: "#334155", fontSize: 12, paddingTop: 16 }}>
            Loading…
          </div>
        ) : pings.length === 0 ? (
          <div style={{ color: "#334155", fontSize: 12, paddingTop: 16 }}>
            No data for this period.
          </div>
        ) : (
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
