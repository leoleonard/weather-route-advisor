import {
  Component,
  inject,
  signal,
  output,
  computed,
  OnInit
} from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { GpxParserService } from '../../core/services/gpx-parser.service';
import { TrackStorageService } from '../../core/services/track-storage.service';
import { GpxTrack } from '../../shared/models/track.model';

const TRACK_COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#E91E63', '#9C27B0', '#00BCD4'];

@Component({
  selector: 'app-track-list',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatChipsModule,
  ],
  templateUrl: './track-list.html',
  styleUrl: './track-list.scss',
})
export class TrackListComponent implements OnInit {
  private readonly gpxParser = inject(GpxParserService);
  private readonly trackStorage = inject(TrackStorageService);

  tracksChanged = output<GpxTrack[]>();
  visibilityChanged = output<Set<string>>();

  readonly tracks = signal<GpxTrack[]>([]);
  readonly visibleIds = signal<Set<string>>(new Set());
  readonly loading = signal(false);
  readonly isDragOver = signal(false);

  readonly trackCount = computed(() => this.tracks().length);

  async ngOnInit(): Promise<void> {
    this.loading.set(true);
    try {
      const stored = await this.trackStorage.getAll();
      if (stored.length > 0) {
        this.tracks.set(stored);
        const ids = new Set(stored.map((t) => t.id));
        this.visibleIds.set(ids);
        this.tracksChanged.emit(stored);
        this.visibilityChanged.emit(ids);
      } else {
        await this.loadSampleTracks();
      }
    } finally {
      this.loading.set(false);
    }
  }

  private async loadSampleTracks(): Promise<void> {
    const sampleFiles = [
      'assets/sample-tracks/wroclaw-track-1.json',
      'assets/sample-tracks/wroclaw-track-2.json',
      'assets/sample-tracks/wroclaw-track-3.json',
    ];
    const loaded: GpxTrack[] = [];
    for (const file of sampleFiles) {
      try {
        const resp = await fetch(file);
        if (resp.ok) {
          const track = (await resp.json()) as GpxTrack;
          loaded.push(track);
        }
      } catch { /* skip */ }
    }
    if (loaded.length > 0) {
      this.tracks.set(loaded);
      const ids = new Set(loaded.map((t) => t.id));
      this.visibleIds.set(ids);
      this.tracksChanged.emit(loaded);
      this.visibilityChanged.emit(ids);
    }
  }

  onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.isDragOver.set(true);
  }

  onDragLeave(): void {
    this.isDragOver.set(false);
  }

  async onDrop(event: DragEvent): Promise<void> {
    event.preventDefault();
    this.isDragOver.set(false);
    const files = Array.from(event.dataTransfer?.files ?? []);
    await this.processFiles(files);
  }

  async onFileInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const files = Array.from(input.files ?? []);
    await this.processFiles(files);
    input.value = '';
  }

  private async processFiles(files: File[]): Promise<void> {
    this.loading.set(true);
    const gpxFiles = files.filter((f) =>
      f.name.toLowerCase().endsWith('.gpx')
    );

    const newTracks: GpxTrack[] = [];
    for (const file of gpxFiles) {
      const content = await file.text();
      const id = `track-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const colorIdx = this.tracks().length % TRACK_COLORS.length;
      const track = this.gpxParser.parse(content, id);
      if (track) {
        track.color = TRACK_COLORS[colorIdx];
        await this.trackStorage.save(track);
        newTracks.push(track);
      }
    }

    if (newTracks.length > 0) {
      const updated = [...this.tracks(), ...newTracks];
      this.tracks.set(updated);
      const ids = new Set([...this.visibleIds(), ...newTracks.map((t) => t.id)]);
      this.visibleIds.set(ids);
      this.tracksChanged.emit(updated);
      this.visibilityChanged.emit(ids);
    }
    this.loading.set(false);
  }

  toggleVisibility(track: GpxTrack): void {
    const ids = new Set(this.visibleIds());
    if (ids.has(track.id)) ids.delete(track.id);
    else ids.add(track.id);
    this.visibleIds.set(ids);
    this.visibilityChanged.emit(ids);
  }

  async removeTrack(track: GpxTrack): Promise<void> {
    await this.trackStorage.delete(track.id);
    const updated = this.tracks().filter((t) => t.id !== track.id);
    this.tracks.set(updated);
    const ids = new Set(this.visibleIds());
    ids.delete(track.id);
    this.visibleIds.set(ids);
    this.tracksChanged.emit(updated);
    this.visibilityChanged.emit(ids);
  }

  isVisible(trackId: string): boolean {
    return this.visibleIds().has(trackId);
  }
}
