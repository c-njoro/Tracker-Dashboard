"use client";

import { MapContainer, TileLayer, Polyline, useMap } from "react-leaflet";
import { useEffect } from "react";
import L from "leaflet";

// Fix marker icons (if you ever add markers)
import "leaflet/dist/leaflet.css";
import icon from "leaflet/dist/images/marker-icon.png";
import iconShadow from "leaflet/dist/images/marker-shadow.png";

let DefaultIcon = L.icon({
  iconUrl: icon.src,
  shadowUrl: iconShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Props {
  pings: { lat: number; lng: number }[];
}

function FitBounds({ pings }: { pings: { lat: number; lng: number }[] }) {
  const map = useMap();
  useEffect(() => {
    if (pings.length > 0) {
      const bounds = L.latLngBounds(pings.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  }, [pings, map]);
  return null;
}

export default function MiniMap({ pings }: Props) {
  if (pings.length === 0) return null;

  return (
    <MapContainer
      style={{ width: "100%", height: "100%", borderRadius: 8 }}
      bounds={L.latLngBounds(pings.map((p) => [p.lat, p.lng]))}
      scrollWheelZoom={false}
      zoomControl={false}
      dragging={false}
      doubleClickZoom={false}
      attributionControl={false}
    >
      {/* ✅ Updated tile layer – matches LiveMap */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_labels_under/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, &copy; CartoDB'
      />
      <Polyline
        positions={pings.map((p) => [p.lat, p.lng])}
        color="#38BDF8"
        weight={3}
      />
      <FitBounds pings={pings} />
    </MapContainer>
  );
}
