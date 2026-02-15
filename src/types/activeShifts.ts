import { Technician } from "./technician";
import { User } from "./user";

export interface ActiveShift {
  _id: string;
  userId: User;
  technicianId: Technician;
  isActive: boolean;
  timeStarted: string; // ISO date
  timeEnded: string | null;
  createdAt: string;
  updatedAt: string;
  __v: number;
}
