import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { WeatherPanelComponent } from './weather-panel';
import { WeatherService } from '../../core/services/weather.service';
import { CurrentWeatherResponse, ForecastResponse, WeatherHourlyItem } from '../../shared/models/weather.model';

describe('WeatherPanelComponent', () => {
  let component: WeatherPanelComponent;
  let fixture: ComponentFixture<WeatherPanelComponent>;

  const mockCurrentWeather: CurrentWeatherResponse = {
    dt: 1709600000,
    main: { temp: 8.5, feels_like: 6.2, humidity: 75, pressure: 1013 },
    wind: { speed: 3.5, deg: 270 },
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
    name: 'Wrocław',
    visibility: 10000,
  };

  const mockHourlyItem: WeatherHourlyItem = {
    dt: 1709600000,
    main: { temp: 9.0, feels_like: 7.0, humidity: 72, pressure: 1014 },
    wind: { speed: 3.0, deg: 260 },
    pop: 0.1,
    weather: [{ id: 800, main: 'Clear', description: 'clear sky', icon: '01d' }],
    dt_txt: '2024-03-05 12:00:00',
  };

  const mockForecast: ForecastResponse = {
    list: Array(12).fill(mockHourlyItem),
    city: { name: 'Wrocław', coord: { lat: 51.1079, lon: 17.0385 }, timezone: 3600 },
  };

  const mockWeatherService = {
    currentWeather: signal<CurrentWeatherResponse | null>(null),
    forecast: signal<ForecastResponse | null>(null),
    isConfigured: signal(true),
    currentRainProbability: signal(10),
    hourlyForecast: signal<WeatherHourlyItem[]>([]),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherPanelComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideAnimationsAsync(),
        { provide: WeatherService, useValue: mockWeatherService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeatherPanelComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show skeleton when no weather data', async () => {
    mockWeatherService.currentWeather.set(null);
    fixture.detectChanges();
    await fixture.whenStable();

    const skeleton = fixture.nativeElement.querySelector('.weather-skeleton');
    expect(skeleton).toBeTruthy();
  });

  it('should display temperature when weather data is available', async () => {
    mockWeatherService.currentWeather.set(mockCurrentWeather);
    mockWeatherService.hourlyForecast.set([mockHourlyItem]);
    fixture.detectChanges();
    await fixture.whenStable();

    const tempEl = fixture.nativeElement.querySelector('.temperature');
    expect(tempEl?.textContent).toContain('9'); // rounded from 8.5
  });

  it('should display hourly forecast blocks', async () => {
    mockWeatherService.currentWeather.set(mockCurrentWeather);
    mockWeatherService.hourlyForecast.set(Array(6).fill(mockHourlyItem));
    fixture.detectChanges();
    await fixture.whenStable();

    const hourBlocks = fixture.nativeElement.querySelectorAll('.hour-block:not(.skeleton)');
    expect(hourBlocks.length).toBe(6);
  });

  it('should show setup message when API not configured', async () => {
    mockWeatherService.currentWeather.set(null);
    mockWeatherService.isConfigured.set(false);
    fixture.detectChanges();
    await fixture.whenStable();

    const msgEl = fixture.nativeElement.querySelector('.no-key-msg');
    expect(msgEl?.textContent).toContain('Configure');
  });

  it('should correctly label rain intensity', () => {
    expect((component as unknown as { getRainIntensity: (p: number) => string }).getRainIntensity(0.1)).toBe('none');
    expect((component as unknown as { getRainIntensity: (p: number) => string }).getRainIntensity(0.3)).toBe('light');
    expect((component as unknown as { getRainIntensity: (p: number) => string }).getRainIntensity(0.6)).toBe('moderate');
    expect((component as unknown as { getRainIntensity: (p: number) => string }).getRainIntensity(0.9)).toBe('heavy');
  });

  it('should format hour label from unix timestamp', () => {
    const dt = new Date('2024-03-05T14:00:00').getTime() / 1000;
    const label = (component as unknown as { getHourLabel: (dt: number) => string }).getHourLabel(dt);
    expect(label).toMatch(/\d{2}:\d{2}/);
  });

  afterEach(() => {
    // Reset to defaults
    mockWeatherService.currentWeather.set(null);
    mockWeatherService.forecast.set(null);
    mockWeatherService.isConfigured.set(true);
    mockWeatherService.hourlyForecast.set([]);
    mockWeatherService.currentRainProbability.set(10);
  });
});
