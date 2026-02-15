import { User } from "./user";

export interface LastSeen {
  lat: number;
  lng: number;
  speed?: number;
  heading?: number;
  timestamp?: string; // ISO string from API
}

export interface Technician {
  _id: string;
  name: string;
  employeeId: string;
  userId?: User;
  isActive: boolean;
  inShift: boolean;
  lastSeen?: LastSeen | null;
}
