import { Component, signal, computed, inject } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { WeatherService } from './core/services/weather.service';
import { WeatherPanelComponent } from './features/weather-panel/weather-panel';
import { TrackListComponent } from './features/track-list/track-list';
import { RecommendationComponent } from './features/recommendation/recommendation';
import { MapComponent } from './features/map/map';
import { GpxTrack } from './shared/models/track.model';
import { TrackRecommendation } from './shared/models/recommendation.model';
import { WindDirectionPipe } from './shared/pipes/wind-direction.pipe';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    MatToolbarModule,
    MatSidenavModule,
    MatButtonModule,
    MatIconModule,
    MatTabsModule,
    MatBadgeModule,
    WeatherPanelComponent,
    TrackListComponent,
    RecommendationComponent,
    MapComponent,
    WindDirectionPipe,
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly weatherService = inject(WeatherService);

  protected readonly isDarkTheme = signal(false);
  protected readonly tracks = signal<GpxTrack[]>([]);
  protected readonly visibleTrackIds = signal<Set<string>>(new Set());
  protected readonly recommendations = signal<TrackRecommendation[]>([]);

  protected readonly currentTemp = computed(() => {
    const cw = this.weatherService.currentWeather();
    return cw ? Math.round(cw.main.temp) : null;
  });

  protected readonly currentWindDeg = computed(() => {
    return this.weatherService.currentWeather()?.wind.deg ?? 0;
  });

  protected readonly currentWindSpeed = computed(() => {
    const cw = this.weatherService.currentWeather();
    return cw ? Math.round(cw.wind.speed * 3.6) : null;
  });

  toggleTheme(): void {
    this.isDarkTheme.update((v) => !v);
    document.documentElement.classList.toggle('dark-theme', this.isDarkTheme());
  }

  onTracksChanged(tracks: GpxTrack[]): void {
    this.tracks.set(tracks);
  }

  onVisibilityChanged(ids: Set<string>): void {
    this.visibleTrackIds.set(ids);
  }

  onRecommendationsChanged(recs: TrackRecommendation[]): void {
    this.recommendations.set(recs);
  }
}
