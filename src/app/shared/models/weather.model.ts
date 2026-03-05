export interface WeatherCondition {
  id: number;
  main: string;
  description: string;
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
  '1h'?: number;
  '3h'?: number;
}

export interface WeatherHourlyItem {
  dt: number;
  main: WeatherMain;
  wind: WeatherWind;
  pop: number; // 0-1 probability of precipitation
  rain?: WeatherPrecipitation;
  weather: WeatherCondition[];
  dt_txt: string;
}

export interface CurrentWeatherResponse {
  dt: number;
  main: WeatherMain;
  wind: WeatherWind;
  rain?: WeatherPrecipitation;
  weather: WeatherCondition[];
  name: string;
  visibility: number;
}

export interface ForecastResponse {
  list: WeatherHourlyItem[];
  city: {
    name: string;
    coord: { lat: number; lon: number };
    timezone: number;
  };
}
