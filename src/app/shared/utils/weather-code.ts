import { WeatherCondition } from '../models/weather.model';

/**
 * WMO weather interpretation codes, as returned by Open-Meteo.
 * `icon` is a Material Symbols ligature name.
 */
const WMO: Record<number, { main: string; description: string; icon: string; nightIcon?: string }> = {
  0: { main: 'Clear', description: 'clear sky', icon: 'sunny', nightIcon: 'bedtime' },
  1: { main: 'Clear', description: 'mainly clear', icon: 'sunny', nightIcon: 'bedtime' },
  2: { main: 'Clouds', description: 'partly cloudy', icon: 'partly_cloudy_day', nightIcon: 'nights_stay' },
  3: { main: 'Clouds', description: 'overcast', icon: 'cloud' },
  45: { main: 'Fog', description: 'fog', icon: 'foggy' },
  48: { main: 'Fog', description: 'rime fog', icon: 'foggy' },
  51: { main: 'Drizzle', description: 'light drizzle', icon: 'rainy' },
  53: { main: 'Drizzle', description: 'drizzle', icon: 'rainy' },
  55: { main: 'Drizzle', description: 'dense drizzle', icon: 'rainy' },
  56: { main: 'Drizzle', description: 'freezing drizzle', icon: 'rainy' },
  57: { main: 'Drizzle', description: 'dense freezing drizzle', icon: 'rainy' },
  61: { main: 'Rain', description: 'light rain', icon: 'rainy' },
  63: { main: 'Rain', description: 'rain', icon: 'rainy' },
  65: { main: 'Rain', description: 'heavy rain', icon: 'rainy' },
  66: { main: 'Rain', description: 'freezing rain', icon: 'rainy' },
  67: { main: 'Rain', description: 'heavy freezing rain', icon: 'rainy' },
  71: { main: 'Snow', description: 'light snow', icon: 'ac_unit' },
  73: { main: 'Snow', description: 'snow', icon: 'ac_unit' },
  75: { main: 'Snow', description: 'heavy snow', icon: 'ac_unit' },
  77: { main: 'Snow', description: 'snow grains', icon: 'ac_unit' },
  80: { main: 'Rain', description: 'light showers', icon: 'rainy' },
  81: { main: 'Rain', description: 'showers', icon: 'rainy' },
  82: { main: 'Rain', description: 'violent showers', icon: 'rainy' },
  85: { main: 'Snow', description: 'snow showers', icon: 'ac_unit' },
  86: { main: 'Snow', description: 'heavy snow showers', icon: 'ac_unit' },
  95: { main: 'Thunderstorm', description: 'thunderstorm', icon: 'thunderstorm' },
  96: { main: 'Thunderstorm', description: 'thunderstorm with hail', icon: 'thunderstorm' },
  99: { main: 'Thunderstorm', description: 'thunderstorm with heavy hail', icon: 'thunderstorm' },
};

export function describeWeatherCode(code: number, isDay = true): WeatherCondition {
  const entry = WMO[code];
  if (!entry) return { id: code, main: 'Unknown', description: 'unknown', icon: 'cloud' };
  return {
    id: code,
    main: entry.main,
    description: entry.description,
    icon: isDay ? entry.icon : (entry.nightIcon ?? entry.icon),
  };
}
