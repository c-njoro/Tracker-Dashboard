export interface Shift {
  _id: string;

  driverId: string;
  vehicleId: string;

  isActive: boolean;

  timeStarted: string; // ISO date string
  timeEnded?: string | null;

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
