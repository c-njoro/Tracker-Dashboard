/**
 * Frontend Driver type
 * Mirrors models/Driver.js
 */

export type DriverSourceType = "mobile" | "gps_tracker";

export interface User {
  _id: string;
  name: string;
  employeeId: string;
  deviceId?: string | null;
  isActive: boolean;
  onShift: boolean;
  trackerDeviceId?: string | null;
  sourceType: DriverSourceType;
  createdAt: string;
  updatedAt: string;
}
