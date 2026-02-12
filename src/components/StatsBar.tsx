'use client';

/**
 * components/StatsBar.tsx
 * Summary counts in the top bar.
 */

import type { VehicleState } from '@/types/vehicle';

export default function StatsBar({ vehicles }: { vehicles: VehicleState[] }) {
  const online = vehicles.filter(v => {
    if (!v.timestamp) return false;
    return Date.now() - new Date(v.timestamp).getTime() < 2 * 60 * 1000;
  }).length;

  const moving = vehicles.filter(v => (v.speed ?? 0) > 2).length;
  const maxSpeed = vehicles.reduce((mx, v) => Math.max(mx, v.speed ?? 0), 0);

  return (
    <div style={{ display: 'flex', gap: 24, flex: 1 }}>
      <Stat label="ONLINE" value={`${online}/${vehicles.length}`} color="#10B981" />
      <Stat label="MOVING" value={String(moving)} color="#38BDF8" />
      <Stat label="TOP SPEED" value={`${maxSpeed} km/h`} color="#F59E0B" />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
      <span style={{ fontSize: 9, letterSpacing: 2, color: '#334155', textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color, fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </span>
    </div>
  );
}