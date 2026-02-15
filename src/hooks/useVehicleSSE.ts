"use client";

import { useEffect, useRef, useState } from "react";
import { EventSourcePolyfill } from "event-source-polyfill";
import type { VehicleState } from "@/types/technician";

type SSEStatus = "connecting" | "live" | "error";

export function useVehicleSSE(apiBase: string) {
  const [vehicles, setVehicles] = useState<Record<string, VehicleState>>({});
  const [status, setStatus] = useState<SSEStatus>("connecting");
  const esRef = useRef<EventSourcePolyfill | null>(null);

  // Initial load
  useEffect(() => {
    fetch(`${apiBase}/api/locations/latest`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    })
      .then((r) => r.json())
      .then((data: VehicleState[]) => {
        const map: Record<string, VehicleState> = {};
        data.forEach((v) => (map[v.vehicleId] = v));
        setVehicles(map);
      })
      .catch(console.error);
  }, [apiBase]);

  // SSE stream
  useEffect(() => {
    const es = new EventSourcePolyfill(`${apiBase}/api/live/stream`, {
      headers: { "ngrok-skip-browser-warning": "true" },
    });
    esRef.current = es;

    es.onopen = () => setStatus("live");
    es.onerror = () => setStatus("error");

    es.onmessage = (e) => {
      if (!e.data || e.data.startsWith(":")) return;
      try {
        const update: VehicleState = JSON.parse(e.data);
        setVehicles((prev) => ({
          ...prev,
          [update.vehicleId]: { ...prev[update.vehicleId], ...update },
        }));
      } catch {}
    };

    return () => es.close();
  }, [apiBase]);

  return { vehicles, status };
}
