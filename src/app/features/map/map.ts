import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  input,
  output,
  effect,
  signal,
  afterNextRender,
  OnDestroy,
} from '@angular/core';
import * as L from 'leaflet';
import { GpxTrack } from '../../shared/models/track.model';
import { TrackRecommendation } from '../../shared/models/recommendation.model';
import { DurationPipe } from '../../shared/pipes/duration.pipe';

// DurationPipe is used programmatically in popup content, not in the template
const RANK_COLORS: Record<number, string> = {
  1: '#E53935', // red — best route
  2: '#C0C0C0', // silver
  3: '#CD7F32', // bronze
};
const DEFAULT_COLOR = '#9E9E9E';

@Component({
  selector: 'app-map',
  standalone: true,
  imports: [],
  templateUrl: './map.html',
  styleUrl: './map.scss',
})
export class MapComponent implements OnDestroy {
  tracks = input<GpxTrack[]>([]);
  visibleTrackIds = input<Set<string>>(new Set());
  recommendations = input<TrackRecommendation[]>([]);
  windDeg = input<number>(0);
  trackSelected = output<GpxTrack>();

  @ViewChild('mapContainer', { static: true }) mapContainer!: ElementRef<HTMLDivElement>;

  private map: L.Map | null = null;
  private polylines = new Map<string, L.Polyline>();
  private readonly durationPipe = new DurationPipe();

  readonly mapReady = signal(false);

  constructor() {
    afterNextRender(() => {
      this.initMap();
      this.mapReady.set(true);
    });

    effect(() => {
      const tracks = this.tracks();
      const visible = this.visibleTrackIds();
      const recs = this.recommendations();
      if (this.map) this.updateTracks(tracks, visible, recs);
    });
  }

  ngOnDestroy(): void {
    this.map?.remove();
  }

  private initMap(): void {
    this.map = L.map(this.mapContainer.nativeElement, {
      center: [51.1079, 17.0385],
      zoom: 13,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(this.map);
  }

  private updateTracks(
    tracks: GpxTrack[],
    visible: Set<string>,
    recs: TrackRecommendation[]
  ): void {
    if (!this.map) return;

    // Remove old polylines
    this.polylines.forEach((pl) => pl.remove());
    this.polylines.clear();

    tracks.forEach((track) => {
      if (track.waypoints.length < 2) return;

      const rec = recs.find((r) => r.track.id === track.id);
      const color = rec ? (RANK_COLORS[rec.rank] ?? DEFAULT_COLOR) : (track.color ?? DEFAULT_COLOR);
      const weight = rec ? 5 : 3;

      const latlngs = track.waypoints.map(
        (wp) => [wp.lat, wp.lon] as [number, number]
      );

      const polyline = L.polyline(latlngs, {
        color,
        weight,
        opacity: visible.has(track.id) ? 1 : 0.2,
      });

      const estimatedDuration = this.durationPipe.transform(
        Math.round((track.distance / 10) * 60)
      );
      const rankLabel = rec ? ` #${rec.rank} Recommended` : '';
      polyline.bindPopup(
        `<strong>${track.name}${rankLabel}</strong><br>
         Distance: ${track.distance} km<br>
         Est. duration: ${estimatedDuration}<br>
         Elevation gain: ${track.elevationGain}m<br>
         ${rec ? `Score: ${Math.round(rec.score)}<br>${rec.explanation}` : ''}`
      );

      polyline.on('click', () => this.trackSelected.emit(track));
      polyline.addTo(this.map!);
      this.polylines.set(track.id, polyline);
    });
  }
}
