import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer, switchMap, catchError, of, shareReplay, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CurrentWeatherResponse, ForecastResponse, WeatherHourlyItem } from '../../shared/models/weather.model';

const WROCLAW_LAT = 51.1079;
const WROCLAW_LON = 17.0385;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly apiKey = environment.openWeatherMapApiKey;
  private readonly baseUrl = 'https://api.openweathermap.org/data/2.5';

  readonly isConfigured = signal(
    !!this.apiKey && this.apiKey !== 'YOUR_KEY_HERE'
  );

  /** null = no error, 401 = key not yet active / invalid, other number = API down */
  readonly apiErrorCode = signal<number | null>(null);

  readonly apiError = computed(() => {
    const code = this.apiErrorCode();
    if (code === 401) return 'API key not activated yet — new keys take up to 2 hours. Check your key at openweathermap.org';
    if (code !== null) return `Weather API error (${code}). Will retry in 15 minutes.`;
    return null;
  });

  private readonly currentWeather$ = timer(0, REFRESH_INTERVAL_MS).pipe(
    switchMap(() =>
      this.http
        .get<CurrentWeatherResponse>(
          `${this.baseUrl}/weather?lat=${WROCLAW_LAT}&lon=${WROCLAW_LON}&appid=${this.apiKey}&units=metric`
        )
        .pipe(
          tap(() => this.apiErrorCode.set(null)),
          catchError((err: HttpErrorResponse) => {
            this.apiErrorCode.set(err.status);
            return of(null);
          })
        )
    ),
    shareReplay(1)
  );

  private readonly forecast$ = timer(0, REFRESH_INTERVAL_MS).pipe(
    switchMap(() =>
      this.http
        .get<ForecastResponse>(
          `${this.baseUrl}/forecast?lat=${WROCLAW_LAT}&lon=${WROCLAW_LON}&appid=${this.apiKey}&units=metric&cnt=16`
        )
        .pipe(
          catchError((err: HttpErrorResponse) => {
            this.apiErrorCode.set(err.status);
            return of(null);
          })
        )
    ),
    shareReplay(1)
  );

  readonly currentWeather = toSignal(this.currentWeather$, { initialValue: null });
  readonly forecast = toSignal(this.forecast$, { initialValue: null });

  readonly hourlyForecast = computed<WeatherHourlyItem[]>(() => {
    return this.forecast()?.list.slice(0, 12) ?? [];
  });

  readonly currentRainProbability = computed(() => {
    const first = this.forecast()?.list[0];
    return first ? Math.round(first.pop * 100) : 0;
  });

  getWeatherForWindow(
    startTime: Date,
    durationMinutes: number
  ): {
    avgRainProbability: number;
    maxRainIntensity: number;
    avgWindSpeed: number;
    avgWindDeg: number;
  } {
    const list = this.forecast()?.list ?? [];
    const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

    const relevant = list.filter((item) => {
      const d = new Date(item.dt * 1000);
      return d >= startTime && d <= endTime;
    });

    const source = relevant.length > 0 ? relevant : list.slice(0, 2);
    if (source.length === 0) {
      return { avgRainProbability: 0, maxRainIntensity: 0, avgWindSpeed: 0, avgWindDeg: 0 };
    }

    const avgRainProbability = Math.round(
      (source.reduce((sum, i) => sum + i.pop, 0) / source.length) * 100
    );
    const maxRainIntensity = Math.max(...source.map((i) => i.rain?.['3h'] ?? 0));
    const avgWindSpeed =
      source.reduce((sum, i) => sum + i.wind.speed * 3.6, 0) / source.length;
    const avgWindDeg =
      source.reduce((sum, i) => sum + i.wind.deg, 0) / source.length;

    return { avgRainProbability, maxRainIntensity, avgWindSpeed, avgWindDeg };
  }
}
