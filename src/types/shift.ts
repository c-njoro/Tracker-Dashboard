export interface Shift {
  _id: string;

  userId: string;
  technicianId: string;

  isActive: boolean;

  timeStarted: string; // ISO date string
  timeEnded?: string | null;

  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}
