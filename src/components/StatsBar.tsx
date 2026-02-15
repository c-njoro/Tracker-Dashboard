"use client";

/**
 * components/StatsBar.tsx
 * Summary counts in the top bar.
 * Now compatible with Vehicle type (lastSeen.speed).
 */

import type { Technician } from "@/types/technician";

export default function StatsBar({
  technicians,
}: {
  technicians: Technician[];
}) {
  const online = technicians.filter((v) => v.inShift === true).length;

  const moving = technicians.filter((v) => (v.lastSeen?.speed ?? 0) > 2).length;
  const maxSpeed = technicians.reduce(
    (mx, v) => Math.max(mx, v.lastSeen?.speed ?? 0),
    0,
  );

  return (
    <div style={{ display: "flex", gap: 24, flex: 1 }}>
      <Stat
        label="ONLINE"
        value={`${online}/${technicians.length}`}
        color="#10B981"
      />
      <Stat label="MOVING" value={String(moving)} color="#38BDF8" />
      <Stat
        label="TOP SPEED"
        value={`${maxSpeed.toFixed(0)} km/h`}
        color="#F59E0B"
      />
    </div>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span
        style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "#334155",
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 14,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </span>
    </div>
  );
}
