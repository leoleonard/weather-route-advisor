export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
  /** Material Symbols ligature name */
  icon: string;
}

export interface WeatherMain {
  temp: number;
  feels_like: number;
  humidity: number;
  pressure: number;
}

export interface WeatherWind {
  speed: number; // m/s
  deg: number;
  gust?: number;
}

export interface WeatherPrecipitation {
  /** mm in the last hour */
  '1h'?: number;
}

export interface WeatherHourlyItem {
  dt: number;
  main: WeatherMain;
  wind: WeatherWind;
  pop: number; // 0-1 probability of precipitation
  rain?: WeatherPrecipitation;
  weather: WeatherCondition[];
}

export interface CurrentWeatherResponse {
  dt: number;
  main: WeatherMain;
  wind: WeatherWind;
  rain?: WeatherPrecipitation;
  weather: WeatherCondition[];
  name: string;
}

export interface ForecastResponse {
  list: WeatherHourlyItem[];
  city: {
    name: string;
    coord: { lat: number; lon: number };
    timezone: number;
  };
}

/** Subset of the Open-Meteo /v1/forecast response used by the app. */
export interface OpenMeteoResponse {
  latitude: number;
  longitude: number;
  utc_offset_seconds: number;
  current: {
    time: number;
    temperature_2m: number;
    apparent_temperature: number;
    relative_humidity_2m: number;
    surface_pressure: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    is_day: number;
  };
  hourly: {
    time: number[];
    temperature_2m: number[];
    apparent_temperature: number[];
    relative_humidity_2m: number[];
    surface_pressure: number[];
    precipitation_probability: (number | null)[];
    precipitation: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    is_day: number[];
  };
}
