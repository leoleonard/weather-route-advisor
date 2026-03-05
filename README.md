# Weather Route Advisor

An Angular 20 application for GPS route recommendation based on real-time weather conditions in Wrocław, Poland.

## Features

- **Live Weather**: Current conditions + 48h forecast from OpenWeatherMap with 15-minute auto-refresh
- **GPX Track Management**: Bulk upload (50+ files), DOMParser-based parsing, IndexedDB persistence
- **Smart Route Recommendations**: Scoring algorithm factoring rain, wind direction (headwind/tailwind), duration fit, and elevation preference
- **Interactive Map**: Leaflet map with color-coded tracks (gold/silver/bronze for top recommendations)
- **Dark/Light Theme**: Full Angular Material M3 theming
- **Standalone / Zoneless**: Angular 20 with `provideZonelessChangeDetection()`, signals everywhere

## Quick Start

### 1. Get a Free OpenWeatherMap API Key

1. Go to https://openweathermap.org/api and create a free account
2. Navigate to **API Keys** in your dashboard and copy your key
3. Free tier covers current weather + 5-day forecast — sufficient for this app

### 2. Configure the API Key

Edit `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  openWeatherMapApiKey: 'YOUR_ACTUAL_KEY_HERE',
};
```

### 3. Install & Run

```bash
npm install
ng serve
```

Open http://localhost:4200 — 3 sample Wrocław tracks load automatically for immediate preview.

## Building

```bash
ng build --configuration production   # production build
ng test --watch=false                 # run 16 unit tests
```

## Architecture

- **WeatherService**: OpenWeatherMap API with RxJS timer (15-min refresh) bridged to signals via `toSignal()`
- **GpxParserService**: Pure DOMParser-based GPX parsing, haversine distance, elevation gain/loss
- **RouteRecommenderService**: Scoring = 100 - rain_penalty - wind_penalty + duration_fit_bonus + elevation_bonus
- **TrackStorageService**: IndexedDB persistence with localStorage fallback
- **MapComponent**: Leaflet initialized in `afterNextRender()`, signal-driven track/recommendation updates
