import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { timer, switchMap, catchError, of, shareReplay, tap, map } from 'rxjs';
import {
  CurrentWeatherResponse,
  ForecastResponse,
  OpenMeteoResponse,
  WeatherHourlyItem,
} from '../../shared/models/weather.model';
import { describeWeatherCode } from '../../shared/utils/weather-code';

const WROCLAW_LAT = 51.1079;
const WROCLAW_LON = 17.0385;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const FORECAST_HOURS = 48;

const CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'surface_pressure',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'is_day',
].join(',');

const HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'surface_pressure',
  'precipitation_probability',
  'precipitation',
  'weather_code',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'is_day',
].join(',');

/**
 * Weather for Wrocław from Open-Meteo (https://open-meteo.com).
 * The API is keyless, so the app runs as a static site with no secrets in the bundle.
 * Responses are mapped to the app's own weather model, which keeps the UI and the
 * recommender independent of the provider.
 */
@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${WROCLAW_LAT}&longitude=${WROCLAW_LON}` +
    `&current=${CURRENT_FIELDS}&hourly=${HOURLY_FIELDS}` +
    `&forecast_hours=${FORECAST_HOURS}&wind_speed_unit=ms&timeformat=unixtime&timezone=auto`;

  /** null = no error, otherwise the HTTP status of the last failed request (0 = offline) */
  readonly apiErrorCode = signal<number | null>(null);

  readonly apiError = computed(() => {
    const code = this.apiErrorCode();
    if (code === null) return null;
    if (code === 0) return 'Weather service unreachable. Will retry in 15 minutes.';
    return `Weather API error (${code}). Will retry in 15 minutes.`;
  });

  private readonly response$ = timer(0, REFRESH_INTERVAL_MS).pipe(
    switchMap(() =>
      this.http.get<OpenMeteoResponse>(this.url).pipe(
        tap(() => this.apiErrorCode.set(null)),
        catchError((err: HttpErrorResponse) => {
          this.apiErrorCode.set(err.status);
          return of(null);
        }),
      ),
    ),
    shareReplay(1),
  );

  readonly currentWeather = toSignal(
    this.response$.pipe(map((res) => (res ? toCurrentWeather(res) : null))),
    { initialValue: null },
  );

  readonly forecast = toSignal(
    this.response$.pipe(map((res) => (res ? toForecast(res) : null))),
    { initialValue: null },
  );

  readonly hourlyForecast = computed<WeatherHourlyItem[]>(() => {
    return this.forecast()?.list.slice(0, 12) ?? [];
  });

  readonly currentRainProbability = computed(() => {
    const first = this.forecast()?.list[0];
    return first ? Math.round(first.pop * 100) : 0;
  });

  getWeatherForWindow(
    startTime: Date,
    durationMinutes: number,
  ): {
    avgRainProbability: number;
    /** Peak precipitation in the window, mm per hour */
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
      (source.reduce((sum, i) => sum + i.pop, 0) / source.length) * 100,
    );
    const maxRainIntensity = Math.max(...source.map((i) => i.rain?.['1h'] ?? 0));
    const avgWindSpeed = source.reduce((sum, i) => sum + i.wind.speed * 3.6, 0) / source.length;
    const avgWindDeg = meanDirection(source.map((i) => i.wind.deg));

    return { avgRainProbability, maxRainIntensity, avgWindSpeed, avgWindDeg };
  }
}

/** Circular mean, so that 350° and 10° average to 0° rather than 180°. */
export function meanDirection(degrees: number[]): number {
  if (degrees.length === 0) return 0;
  const rad = degrees.map((d) => (d * Math.PI) / 180);
  const x = rad.reduce((sum, r) => sum + Math.cos(r), 0);
  const y = rad.reduce((sum, r) => sum + Math.sin(r), 0);
  const mean = (Math.atan2(y, x) * 180) / Math.PI;
  return Math.round((mean + 360) % 360);
}

export function toCurrentWeather(res: OpenMeteoResponse): CurrentWeatherResponse {
  const c = res.current;
  return {
    dt: c.time,
    main: {
      temp: c.temperature_2m,
      feels_like: c.apparent_temperature,
      humidity: c.relative_humidity_2m,
      pressure: c.surface_pressure,
    },
    wind: { speed: c.wind_speed_10m, deg: c.wind_direction_10m, gust: c.wind_gusts_10m },
    rain: c.precipitation > 0 ? { '1h': c.precipitation } : undefined,
    weather: [describeWeatherCode(c.weather_code, c.is_day === 1)],
    name: 'Wrocław',
  };
}

export function toForecast(res: OpenMeteoResponse): ForecastResponse {
  const h = res.hourly;
  const list: WeatherHourlyItem[] = h.time.map((time, i) => ({
    dt: time,
    main: {
      temp: h.temperature_2m[i],
      feels_like: h.apparent_temperature[i],
      humidity: h.relative_humidity_2m[i],
      pressure: h.surface_pressure[i],
    },
    wind: { speed: h.wind_speed_10m[i], deg: h.wind_direction_10m[i], gust: h.wind_gusts_10m[i] },
    pop: (h.precipitation_probability[i] ?? 0) / 100,
    rain: h.precipitation[i] > 0 ? { '1h': h.precipitation[i] } : undefined,
    weather: [describeWeatherCode(h.weather_code[i], h.is_day[i] === 1)],
  }));

  return {
    list,
    city: {
      name: 'Wrocław',
      coord: { lat: res.latitude, lon: res.longitude },
      timezone: res.utc_offset_seconds,
    },
  };
}
