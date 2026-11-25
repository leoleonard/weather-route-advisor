# Weather Route Advisor

Picks the best route for your next ride or run. Upload your GPX tracks, set how long you want to ride, and the app ranks the routes against the live wind and rain forecast for Wrocław.

**Live demo:** https://leoleonard.github.io/weather-route-advisor/ (three sample tracks load automatically)

## What it does

- **Route ranking** - each track gets a score from rain probability and intensity in the ride window, headwind vs tailwind along the route bearing, how well the duration fits, and elevation preference
- **Live weather** - current conditions and a 48-hour hourly forecast from [Open-Meteo](https://open-meteo.com), refreshed every 15 minutes
- **GPX tracks** - bulk upload, parsing in the browser, stored in IndexedDB (localStorage fallback)
- **Map** - Leaflet, top three recommendations colour-coded
- **Light and dark theme** - Angular Material 3

## Stack

Angular 22 · zoneless change detection · signals · standalone components · RxJS · Angular Material 3 · Leaflet · Jasmine/Karma

## Design notes

- **Zoneless, signals first.** No zone.js at runtime. Components use the default OnPush strategy and read state only from signals, `computed` and `input()`.
- **RxJS only at the edge.** The weather poll is one `timer` + `switchMap` stream, bridged to signals with `toSignal()`. Everything downstream is synchronous `computed` state.
- **Provider-independent weather model.** `WeatherService` maps the Open-Meteo response to the app's own model, so the UI and the recommender do not know which API is behind it. Open-Meteo needs no API key, which lets the app ship as a static site with no secrets in the bundle.
- **Pure scoring logic.** `RouteRecommenderService` is plain functions over tracks and a weather window: `100 - rain penalty - wind penalty + duration fit + elevation bonus`. Wind direction is averaged as a circular mean.
- **No GPX dependency.** `GpxParserService` uses `DOMParser`, haversine distance and cumulative elevation gain/loss.
- **Leaflet outside the render path.** The map is created in `afterNextRender()` and updated from an `effect()`.

## Run locally

```bash
npm install
npm start          # http://localhost:4200
npm test -- --watch=false
npm run build
```

No configuration or API key is required.

## Project structure

```
src/app/
  core/services/     weather, GPX parsing, recommender, track storage
  features/          map, weather-panel, track-list, recommendation
  shared/            models, pipes, weather-code mapping
```

## Deployment

`.github/workflows/ci.yml` runs tests and a production build on every push, and publishes `main` to GitHub Pages.

Weather data by [Open-Meteo](https://open-meteo.com) (CC BY 4.0). Map data © OpenStreetMap contributors.
