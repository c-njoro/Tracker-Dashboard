"use client";

/**
 * components/LiveMap.tsx
 * Leaflet map showing all vehicles with directional arrows.
 * Smoothly animates marker positions when they update.
 * Now compatible with the actual API response (Vehicle model + lastSeen).
 */

import { useEffect, useRef } from "react";
import { Vehicle } from "@/types/vehicle";

let L: any = null;

const VEHICLE_COLORS: Record<string, string> = {
  truck: "#FF6B35",
  van: "#4ECDC4",
  car: "#38BDF8",
  motorcycle: "#A78BFA",
  other: "#94A3B8",
};

function createVehicleIcon(vehicle: Vehicle, selected: boolean) {
  const color = VEHICLE_COLORS[vehicle.type] || "#94A3B8";
  const size = selected ? 44 : 36;
  const heading = vehicle.lastSeen?.heading ?? 0;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      ${selected ? `<circle cx="22" cy="22" r="20" fill="${color}22" stroke="${color}55" stroke-width="1"/>` : ""}
      <circle cx="22" cy="22" r="12" fill="${color}" stroke="#0A0E1A" stroke-width="2"/>
      <path d="M22 10 L26 18 L22 15 L18 18 Z" fill="#0A0E1A" transform="rotate(${heading}, 22, 22)"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

interface Props {
  vehicles: Vehicle[]; // ✅ now uses the correct type
  selectedId: string | null;
  onVehicleClick: (id: string) => void;
}

export default function LiveMap({
  vehicles,
  selectedId,
  onVehicleClick,
}: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Initialize Map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    (async () => {
      const leaflet = await import("leaflet");
      L = leaflet.default;

      // Clean existing instance (prevents React‑Leaflet conflict)
      const container = containerRef.current as any;
      if (container._leaflet_id) {
        container._leaflet_id = null;
      }

      if (!isMounted) return;

      const map = L.map(container, {
        center: [-1.286389, 36.817223],
        zoom: 12,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png",
        {
          maxZoom: 19,
          attribution: "© OpenStreetMap, © CartoDB",
        },
      ).addTo(map);

      L.control.attribution({ prefix: false }).addTo(map);

      mapRef.current = map;
    })();

    return () => {
      isMounted = false;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // ── Update Markers ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;

    vehicles.forEach((vehicle) => {
      // Skip vehicles without a valid location
      // In the marker update useEffect, inside vehicles.forEach:
      if (!vehicle.lastSeen?.lat || !vehicle.lastSeen?.lng) return; // already present

      const latlng = [vehicle.lastSeen.lat, vehicle.lastSeen.lng];
      const icon = createVehicleIcon(vehicle, vehicle._id === selectedId);

      if (markersRef.current[vehicle._id]) {
        // Update existing marker
        const marker = markersRef.current[vehicle._id];
        marker.setLatLng(latlng as any);
        marker.setIcon(icon);
      } else {
        // Create new marker
        const marker = L.marker(latlng as any, { icon })
          .addTo(map)
          .on("click", () => onVehicleClick(vehicle._id));

        markersRef.current[vehicle._id] = marker;
      }

      // Update popup content (driver name removed – only driverId if present)
      const driverInfo = vehicle.driverId
        ? `<div style="font-size: 11px; color: #94A3B8;">👤 Driver: ${vehicle.driverId.slice(-4)}</div>`
        : '<div style="font-size: 11px; color: #64748B;">No driver</div>';

      const popup = `
        <div style="font-family: 'JetBrains Mono', monospace; background: #0D1220; color: #E2E8F0; padding: 10px; border-radius: 6px; min-width: 160px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: ${VEHICLE_COLORS[vehicle.type] || "#94A3B8"}">
            ${vehicle.name}
          </div>
          ${
            vehicle.plateNumber
              ? `<div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">${vehicle.plateNumber}</div>`
              : ""
          }
          <div style="font-size: 13px;">
            🏎 ${vehicle.lastSeen?.speed?.toFixed(0) ?? 0} km/h &nbsp; ↗ ${
              vehicle.lastSeen?.heading?.toFixed(0) ?? "–"
            }°
          </div>
          ${driverInfo}
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            ${vehicle.lastSeen?.timestamp ? new Date(vehicle.lastSeen.timestamp).toLocaleTimeString() : ""}
          </div>
        </div>`;

      markersRef.current[vehicle._id].bindPopup(popup, {
        className: "fleet-popup",
        closeButton: false,
      });
    });

    // Remove stale markers (vehicles no longer in list)
    Object.keys(markersRef.current).forEach((id) => {
      if (!vehicles.find((v) => v._id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [vehicles, selectedId, onVehicleClick]);

  // ── Pan to selected vehicle ─────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const vehicle = vehicles.find((v) => v._id === selectedId);
    if (vehicle?.lastSeen?.lat && vehicle?.lastSeen?.lng) {
      mapRef.current.flyTo([vehicle.lastSeen.lat, vehicle.lastSeen.lng], 15, {
        animate: true,
        duration: 0.8,
      });
    }
  }, [selectedId, vehicles]);

  return (
    <>
      <div
        ref={containerRef}
        style={{ flex: 1, width: "100%", minHeight: "400px" }}
      />
      <style jsx global>{`
        .fleet-popup .leaflet-popup-content-wrapper {
          background: transparent !important;
          border: 1px solid #1e2a45 !important;
          box-shadow: 0 4px 24px #00000088 !important;
          border-radius: 8px !important;
          padding: 0 !important;
        }
        .fleet-popup .leaflet-popup-content {
          margin: 0 !important;
        }
        .fleet-popup .leaflet-popup-tip {
          display: none;
        }
        .leaflet-control-zoom a {
          background: #0d1220 !important;
          color: #64748b !important;
          border-color: #1e2a45 !important;
        }
        .leaflet-control-zoom a:hover {
          color: #38bdf8 !important;
        }
      `}</style>
    </>
  );
}
