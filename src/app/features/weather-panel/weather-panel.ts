import { Component, inject, computed } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { WeatherService } from '../../core/services/weather.service';
import { WindDirectionPipe } from '../../shared/pipes/wind-direction.pipe';

@Component({
  selector: 'app-weather-panel',
  standalone: true,
  imports: [DecimalPipe, MatCardModule, MatChipsModule, MatIconModule, WindDirectionPipe],
  templateUrl: './weather-panel.html',
  styleUrl: './weather-panel.scss',
})
export class WeatherPanelComponent {
  protected readonly weatherService = inject(WeatherService);

  protected readonly currentTemp = computed(() => {
    const cw = this.weatherService.currentWeather();
    return cw ? Math.round(cw.main.temp) : null;
  });

  protected readonly feelsLike = computed(() => {
    const cw = this.weatherService.currentWeather();
    return cw ? Math.round(cw.main.feels_like) : null;
  });

  protected readonly windSpeedKmh = computed(() => {
    const cw = this.weatherService.currentWeather();
    return cw ? Math.round(cw.wind.speed * 3.6) : null;
  });

  protected readonly windDeg = computed(() => {
    return this.weatherService.currentWeather()?.wind.deg ?? 0;
  });

  protected readonly weatherDescription = computed(() => {
    return this.weatherService.currentWeather()?.weather[0]?.description ?? '';
  });

  protected readonly hourlyItems = computed(() => {
    return this.weatherService.hourlyForecast().slice(0, 12);
  });

  protected getHourLabel(dt: number): string {
    return new Date(dt * 1000).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  protected getRainIntensity(pop: number): string {
    if (pop < 0.2) return 'none';
    if (pop < 0.5) return 'light';
    if (pop < 0.8) return 'moderate';
    return 'heavy';
  }

  protected getWeatherIcon(iconCode: string): string {
    return `https://openweathermap.org/img/wn/${iconCode}.png`;
  }
}
