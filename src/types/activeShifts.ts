export interface ActiveShift {
  _id: string;

  driverId: Driver;
  vehicleId: Vehicle;

  isActive: boolean;

  timeStarted: string; // ISO date
  timeEnded: string | null;

  createdAt: string;
  updatedAt: string;

  __v: number;
}

export interface Driver {
  _id: string;

  name: string;
  employeeId: string;
  phone: string;
  deviceId: string;

  isActive: boolean;
  onShift: boolean;

  trackerDeviceId: string | null;
  sourceType: "mobile" | "gps_tracker";

  createdAt: string;
  updatedAt: string;

  __v: number;
}

export interface Vehicle {
  _id: string;

  driverId: string;
  name: string;
  plateNumber: string;

  type: "truck" | "van" | "car" | "motorcycle" | "other";

  speedLimitKmh: number;
  isActive: boolean;
  inShift: boolean;

  deviceId: string;

  lastSeen?: VehicleLastSeen;

  createdAt: string;
  updatedAt: string;

  __v: number;
}

export interface VehicleLastSeen {
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  timestamp: string;
}
