// src/types/vehicle.ts
export type VehicleType = "truck" | "van" | "car" | "motorcycle" | "other";

export interface LastSeen {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp?: string; // ISO string from API
}

export interface Vehicle {
  _id: string;

  deviceId: string;

  driverId: string | null;

  name: string;
  plateNumber?: string;

  type: VehicleType;

  speedLimitKmh: number;
  isActive: boolean;
  inShift: boolean;

  lastSeen?: LastSeen | null;
}
