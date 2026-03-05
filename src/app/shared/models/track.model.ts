export interface Waypoint {
  lat: number;
  lon: number;
  elevation: number;
}

export interface GpxTrack {
  id: string;
  name: string;
  waypoints: Waypoint[];
  distance: number; // km
  elevationGain: number; // meters
  elevationLoss: number; // meters
  color?: string;
}
