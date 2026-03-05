import { Injectable } from '@angular/core';
import { GpxTrack, Waypoint } from '../../shared/models/track.model';

@Injectable({ providedIn: 'root' })
export class GpxParserService {
  parse(gpxContent: string, id: string): GpxTrack | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(gpxContent, 'application/xml');

      if (doc.querySelector('parsererror')) return null;

      const name =
        doc.querySelector('trk > name')?.textContent ??
        doc.querySelector('metadata > name')?.textContent ??
        'Unnamed Track';

      const trkpts = Array.from(doc.querySelectorAll('trkpt'));
      if (trkpts.length === 0) return null;

      const waypoints: Waypoint[] = trkpts.map((pt) => ({
        lat: parseFloat(pt.getAttribute('lat') ?? '0'),
        lon: parseFloat(pt.getAttribute('lon') ?? '0'),
        elevation: parseFloat(pt.querySelector('ele')?.textContent ?? '0'),
      }));

      const distance = this.calculateDistance(waypoints);
      const { gain, loss } = this.calculateElevation(waypoints);

      return { id, name, waypoints, distance, elevationGain: gain, elevationLoss: loss };
    } catch {
      return null;
    }
  }

  private calculateDistance(waypoints: Waypoint[]): number {
    let total = 0;
    for (let i = 1; i < waypoints.length; i++) {
      total += this.haversine(waypoints[i - 1], waypoints[i]);
    }
    return Math.round(total * 100) / 100;
  }

  private haversine(a: Waypoint, b: Waypoint): number {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLon = ((b.lon - a.lon) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }

  private calculateElevation(waypoints: Waypoint[]): { gain: number; loss: number } {
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < waypoints.length; i++) {
      const diff = waypoints[i].elevation - waypoints[i - 1].elevation;
      if (diff > 0) gain += diff;
      else loss += Math.abs(diff);
    }
    return { gain: Math.round(gain), loss: Math.round(loss) };
  }
}
