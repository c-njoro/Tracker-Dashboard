"use client";

import {
  GoogleMap,
  Polyline,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import simplify from "simplify-js";
import { useEffect, useMemo, useState } from "react";

type Ping = {
  lat: number;
  lng: number;
  timestamp: string;
  speedKmh?: number;
};

type MiniMapProps = {
  pings: Ping[];
  interactive?: boolean;
};

/* ------------------ DISTANCE ------------------ */
function haversine(a: Ping, b: Ping) {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

/* ------------------ CLEAN GPS ------------------ */
function cleanPings(pings: Ping[], minDistance = 8) {
  if (pings.length < 2) return pings;

  const cleaned: Ping[] = [pings[0]];

  for (let i = 1; i < pings.length; i++) {
    const last = cleaned[cleaned.length - 1];
    const curr = pings[i];

    if (haversine(last, curr) >= minDistance) {
      cleaned.push(curr);
    }
  }

  return cleaned;
}

/* ------------------ SPEED COLOR ------------------ */
function speedToColor(speed = 0) {
  if (speed < 10) return "#00ff99"; // slow
  if (speed < 40) return "#ffd000"; // medium
  return "#ff4d4d"; // fast
}

/* ------------------ DARK MAP STYLE ------------------ */
const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1d" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#2a2a2a" }],
  },
];

/* ------------------ COMPONENT ------------------ */
export default function MiniMap({ pings, interactive = false }: MiniMapProps) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
  });

  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "hybrid">(
    "hybrid",
  );

  /* Remember map type */
  useEffect(() => {
    const saved = localStorage.getItem("miniMapType");
    if (saved === "roadmap" || saved === "satellite" || saved === "hybrid") {
      setMapType(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("miniMapType", mapType);
  }, [mapType]);

  const path = useMemo(() => {
    if (!pings || pings.length < 2) return [];

    const ordered = [...pings].sort(
      (a, b) =>
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );

    const cleaned = cleanPings(ordered);

    const simplified = simplify(
      cleaned.map((p) => ({ x: p.lng, y: p.lat, speed: p.speedKmh })),
      0.00003,
      true,
    );

    return simplified.map((p: any) => ({
      lat: p.y,
      lng: p.x,
      speed: p.speed,
    }));
  }, [pings]);

  if (!isLoaded || path.length === 0) return null;

  const start = path[0];
  const end = path[path.length - 1];

  return (
    <div style={{ position: "relative" }}>
      {/* MAP TYPE TOGGLE */}
      <div
        style={{
          position: "absolute",
          top: 8,
          right: 8,
          zIndex: 10,
          display: "flex",
          gap: 4,
        }}
      >
        {(["roadmap", "satellite", "hybrid"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setMapType(t)}
            style={{
              padding: "4px 6px",
              fontSize: 11,
              background: mapType === t ? "#00ff99" : "#222",
              color: "#000",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
            }}
          >
            {t[0].toUpperCase()}
          </button>
        ))}
      </div>

      <GoogleMap
        mapContainerStyle={{
          width: "100%",
          height: "200px",
          borderRadius: "12px",
        }}
        center={start}
        zoom={15}
        onZoomChanged={function () {
          const z = this.getZoom();
          if (z && z >= 18 && mapType === "roadmap") {
            setMapType("satellite");
          }
        }}
        options={{
          mapTypeId: mapType,
          styles: mapType === "roadmap" ? darkMapStyle : undefined,
          disableDefaultUI: !interactive,
          gestureHandling: interactive ? "auto" : "none",
          clickableIcons: false,
        }}
      >
        {/* SPEED-COLORED PATH */}
        {path.map((p, i) =>
          i === 0 ? null : (
            <Polyline
              key={i}
              path={[path[i - 1], p]}
              options={{
                strokeColor: speedToColor(p.speed),
                strokeOpacity: 0.9,
                strokeWeight: 4,
              }}
            />
          ),
        )}

        <Marker position={start} />
        <Marker position={end} />
      </GoogleMap>
    </div>
  );
}
