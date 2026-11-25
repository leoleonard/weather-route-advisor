import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WeatherService, meanDirection, toCurrentWeather, toForecast } from './weather.service';
import { OpenMeteoResponse } from '../../shared/models/weather.model';
import { describeWeatherCode } from '../../shared/utils/weather-code';

const HOUR = 3600;

function buildResponse(start: number, hours = 4): OpenMeteoResponse {
  const fill = <T>(fn: (i: number) => T) => Array.from({ length: hours }, (_, i) => fn(i));
  return {
    latitude: 51.1,
    longitude: 17.04,
    utc_offset_seconds: 3600,
    current: {
      time: start,
      temperature_2m: 8.4,
      apparent_temperature: 6.1,
      relative_humidity_2m: 75,
      surface_pressure: 1002,
      precipitation: 0,
      weather_code: 2,
      wind_speed_10m: 4,
      wind_direction_10m: 270,
      wind_gusts_10m: 9,
      is_day: 1,
    },
    hourly: {
      time: fill((i) => start + i * HOUR),
      temperature_2m: fill((i) => 8 + i),
      apparent_temperature: fill((i) => 6 + i),
      relative_humidity_2m: fill(() => 70),
      surface_pressure: fill(() => 1002),
      precipitation_probability: [20, 80, null, 40].slice(0, hours),
      precipitation: [0, 1.5, 0.2, 0].slice(0, hours),
      weather_code: fill(() => 61),
      wind_speed_10m: fill(() => 5),
      wind_direction_10m: [350, 10, 350, 10].slice(0, hours),
      wind_gusts_10m: fill(() => 10),
      is_day: fill(() => 1),
    },
  };
}

describe('Open-Meteo mapping', () => {
  const start = 1_780_000_000;
  const res = buildResponse(start);

  it('maps current conditions to the app model', () => {
    const current = toCurrentWeather(res);
    expect(current.main.temp).toBe(8.4);
    expect(current.wind).toEqual({ speed: 4, deg: 270, gust: 9 });
    expect(current.weather[0].description).toBe('partly cloudy');
    expect(current.rain).toBeUndefined();
  });

  it('maps hourly arrays to forecast items', () => {
    const { list } = toForecast(res);
    expect(list.length).toBe(4);
    expect(list[1].dt).toBe(start + HOUR);
    expect(list[1].pop).toBe(0.8);
    expect(list[1].rain).toEqual({ '1h': 1.5 });
    expect(list[0].rain).toBeUndefined();
  });

  it('treats a missing precipitation probability as 0', () => {
    expect(toForecast(res).list[2].pop).toBe(0);
  });

  it('uses night icons after dark and falls back for unknown codes', () => {
    expect(describeWeatherCode(0, true).icon).toBe('sunny');
    expect(describeWeatherCode(0, false).icon).toBe('bedtime');
    expect(describeWeatherCode(1234).main).toBe('Unknown');
  });

  it('averages wind direction across north without flipping south', () => {
    expect(meanDirection([350, 10])).toBe(0);
    expect(meanDirection([90, 180])).toBe(135);
    expect(meanDirection([])).toBe(0);
  });
});

describe('WeatherService', () => {
  let service: WeatherService;
  let http: HttpTestingController;
  const start = Math.floor(Date.now() / 1000);

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(WeatherService);
    http = TestBed.inject(HttpTestingController);
    // timer(0) emits on the next macrotask
    await new Promise((resolve) => setTimeout(resolve));
  });

  it('requests a keyless forecast and exposes it through signals', () => {
    const req = http.expectOne((r) => r.url.startsWith('https://api.open-meteo.com/v1/forecast'));
    expect(req.request.urlWithParams).not.toContain('appid');
    req.flush(buildResponse(start));

    expect(service.currentWeather()?.main.temp).toBe(8.4);
    expect(service.hourlyForecast().length).toBe(4);
    expect(service.currentRainProbability()).toBe(20);
    expect(service.apiError()).toBeNull();
  });

  it('summarises the ride window: peak rain, mean probability, wind in km/h', () => {
    http.expectOne(() => true).flush(buildResponse(start));

    const window = service.getWeatherForWindow(new Date(start * 1000), 120);
    expect(window.maxRainIntensity).toBe(1.5);
    expect(window.avgRainProbability).toBe(33);
    expect(window.avgWindSpeed).toBeCloseTo(18, 5);
    expect(window.avgWindDeg).toBe(357);
  });

  it('reports an API failure and keeps signals empty', () => {
    http.expectOne(() => true).flush('nope', { status: 503, statusText: 'Service Unavailable' });

    expect(service.currentWeather()).toBeNull();
    expect(service.apiError()).toContain('503');
  });
});
