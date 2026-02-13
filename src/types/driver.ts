/**
 * Frontend Driver type
 * Mirrors models/Driver.js
 */

export type DriverSourceType = "mobile" | "gps_tracker";

export interface Driver {
  _id: string;

  name: string;
  employeeId?: string;
  phone?: string;

  /**
   * Unique device identifier for mobile app registration
   * May be undefined or null if not registered
   */
  deviceId?: string | null;

  isActive: boolean;
  onShift: boolean;

  /**
   * Future hardware tracker support
   */
  trackerDeviceId?: string | null;
  sourceType: DriverSourceType;

  createdAt: string; // ISO date string from API
  updatedAt: string; // ISO date string from API
}
