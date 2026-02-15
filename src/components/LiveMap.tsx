"use client";

/**
 * components/LiveMap.tsx
 * Leaflet map showing all technicians with directional arrows.
 * Supports toggling between street map and satellite view.
 */

import { useEffect, useRef, useState } from "react";
import { Technician } from "@/types/technician";

let L: any = null;

const TECHNICIAN_COLORS = [
  "#FF6B35", // orange
  "#4ECDC4", // teal
  "#38BDF8", // blue
  "#A78BFA", // purple
  "#22C55E", // green
  "#F97316", // amber
  "#EC4899", // pink
  "#EAB308", // yellow
  "#06B6D4", // cyan
  "#8B5CF6", // violet
];

function hashStringToIndex(str: string, modulo: number) {
  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // force 32-bit
  }

  return Math.abs(hash) % modulo;
}

function getTechnicianColor(technicianId: string) {
  const index = hashStringToIndex(technicianId, TECHNICIAN_COLORS.length);
  return TECHNICIAN_COLORS[index];
}

function createTechnicianIcon(technician: Technician, selected: boolean) {
  const color = getTechnicianColor(technician._id);
  const size = selected ? 44 : 36;
  const heading = technician.lastSeen?.heading ?? 0;

  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg">
      ${
        selected
          ? `<circle cx="22" cy="22" r="20" fill="${color}22" stroke="${color}55" stroke-width="1"/>`
          : ""
      }
      <circle cx="22" cy="22" r="12" fill="${color}" stroke="#0A0E1A" stroke-width="2"/>
      <path d="M22 10 L26 18 L22 15 L18 18 Z"
            fill="#0A0E1A"
            transform="rotate(${heading}, 22, 22)"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -(size / 2)],
  });
}

// ── Tile layer definitions ─────────────────────────────────────────────────────
const TILE_LAYERS = {
  map: {
    url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png",
    attribution: "© OpenStreetMap, © CartoDB",
    maxZoom: 19,
  },
  satellite: {
    // ESRI World Imagery — free, no API key required
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "© Esri, Maxar, Earthstar Geographics",
    maxZoom: 19,
  },
  // Satellite + labels on top (hybrid feel)
  hybrid: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    labelsUrl:
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png",
    attribution: "© Esri, © OpenStreetMap, © CartoDB",
    maxZoom: 19,
  },
};

type LayerMode = "map" | "satellite" | "hybrid";

interface Props {
  technicians: Technician[];
  selectedId: string | null;
  onTechnicianClick: (id: string) => void;
}

export default function LiveMap({
  technicians,
  selectedId,
  onTechnicianClick,
}: Props) {
  const mapRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const tileLayerRef = useRef<any>(null); // base satellite/map tile
  const labelLayerRef = useRef<any>(null); // labels overlay (hybrid only)

  const [layerMode, setLayerMode] = useState<LayerMode>("map");

  // ── Initialize Map ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    let isMounted = true;

    (async () => {
      const leaflet = await import("leaflet");
      L = leaflet.default;

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

      // Start with street map
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.map.url, {
        maxZoom: TILE_LAYERS.map.maxZoom,
        attribution: TILE_LAYERS.map.attribution,
      }).addTo(map);

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

  // ── Switch tile layer when layerMode changes ────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;

    // Remove current base layer
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    // Remove label overlay if any
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current);
      labelLayerRef.current = null;
    }

    if (layerMode === "map") {
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.map.url, {
        maxZoom: TILE_LAYERS.map.maxZoom,
        attribution: TILE_LAYERS.map.attribution,
      }).addTo(map);
    } else if (layerMode === "satellite") {
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.satellite.url, {
        maxZoom: TILE_LAYERS.satellite.maxZoom,
        attribution: TILE_LAYERS.satellite.attribution,
      }).addTo(map);
    } else {
      // Hybrid: satellite base + labels on top
      tileLayerRef.current = L.tileLayer(TILE_LAYERS.hybrid.url, {
        maxZoom: TILE_LAYERS.hybrid.maxZoom,
        attribution: TILE_LAYERS.hybrid.attribution,
      }).addTo(map);

      labelLayerRef.current = L.tileLayer(TILE_LAYERS.hybrid.labelsUrl!, {
        maxZoom: TILE_LAYERS.hybrid.maxZoom,
        opacity: 1,
      }).addTo(map);
    }

    // Bring all technician markers back to front after layer swap
    Object.values(markersRef.current).forEach((marker) => {
      marker.bringToFront?.();
    });
  }, [layerMode]);

  // ── Update Markers ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !L) return;
    const map = mapRef.current;

    technicians.forEach((technician) => {
      if (!technician.lastSeen?.lat || !technician.lastSeen?.lng) return;

      const latlng = [technician.lastSeen.lat, technician.lastSeen.lng];
      const icon = createTechnicianIcon(
        technician,
        technician._id === selectedId,
      );

      if (markersRef.current[technician._id]) {
        const marker = markersRef.current[technician._id];
        marker.setLatLng(latlng as any);
        marker.setIcon(icon);
      } else {
        const marker = L.marker(latlng as any, { icon })
          .addTo(map)
          .on("click", () => onTechnicianClick(technician._id));
        markersRef.current[technician._id] = marker;
      }

      const userInfo = technician.userId
        ? `<div style="font-size: 11px; color: #94A3B8;">Devie: ${technician.userId.deviceId}</div>`
        : '<div style="font-size: 11px; color: #64748B;">No driver</div>';

      const popup = `
        <div style="font-family: 'JetBrains Mono', monospace; background: #0D1220; color: #E2E8F0; padding: 10px; border-radius: 6px; min-width: 160px;">
          <div style="font-weight: 700; margin-bottom: 6px; color: ${getTechnicianColor(technician._id)}">
            ${technician.name}
          </div>
          ${technician.employeeId ? `<div style="font-size: 11px; color: #64748B; margin-bottom: 4px;">${technician.employeeId}</div>` : ""}
          <div style="font-size: 13px;">
            🎯 ${technician.lastSeen?.speed?.toFixed(0) ?? 0} km/h &nbsp; ↗ ${technician.lastSeen?.heading?.toFixed(0) ?? "—"}°
          </div>
          ${userInfo}
          <div style="font-size: 11px; color: #475569; margin-top: 4px;">
            ${technician.lastSeen?.timestamp ? new Date(technician.lastSeen.timestamp).toLocaleTimeString() : ""}
          </div>
        </div>`;

      markersRef.current[technician._id].bindPopup(popup, {
        className: "fleet-popup",
        closeButton: false,
      });
    });

    // Remove stale markers
    Object.keys(markersRef.current).forEach((id) => {
      if (!technicians.find((v) => v._id === id)) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });
  }, [technicians, selectedId, onTechnicianClick]);

  // ── Pan to selected technician ─────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || !selectedId) return;
    const technician = technicians.find((v) => v._id === selectedId);
    if (technician?.lastSeen?.lat && technician?.lastSeen?.lng) {
      mapRef.current.flyTo(
        [technician.lastSeen.lat, technician.lastSeen.lng],
        15,
        {
          animate: true,
          duration: 0.8,
        },
      );
    }
  }, [selectedId, technicians]);

  // ── Layer toggle button labels ──────────────────────────────────────────────
  const LAYER_CYCLE: LayerMode[] = ["map", "satellite", "hybrid"];
  const LAYER_LABELS: Record<LayerMode, string> = {
    map: "🗺 Map",
    satellite: "🛰 Satellite",
    hybrid: "🛰 Hybrid",
  };
  const LAYER_NEXT: Record<LayerMode, LayerMode> = {
    map: "satellite",
    satellite: "hybrid",
    hybrid: "map",
  };

  return (
    <>
      <div
        style={{
          position: "relative",
          flex: 1,
          width: "100%",
          minHeight: "400px",
        }}
      >
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />

        {/* Layer toggle button — top right, above Leaflet zoom controls */}
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            zIndex: 1000,
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          {LAYER_CYCLE.map((mode) => (
            <button
              key={mode}
              onClick={() => setLayerMode(mode)}
              style={{
                padding: "6px 12px",
                borderRadius: 6,
                border: `1px solid ${layerMode === mode ? "#38BDF8" : "#1E2A45"}`,
                background: layerMode === mode ? "#0D2137" : "#0D1220CC",
                color: layerMode === mode ? "#38BDF8" : "#64748B",
                fontSize: 11,
                fontFamily: "inherit",
                fontWeight: layerMode === mode ? 700 : 400,
                cursor: "pointer",
                backdropFilter: "blur(4px)",
                letterSpacing: "0.5px",
                whiteSpace: "nowrap",
                transition: "all 0.15s",
              }}
            >
              {LAYER_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

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
