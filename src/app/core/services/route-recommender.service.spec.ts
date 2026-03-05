import { TestBed } from '@angular/core/testing';
import { RouteRecommenderService } from './route-recommender.service';
import { GpxTrack } from '../../shared/models/track.model';
import { RecommendationParams } from '../../shared/models/recommendation.model';

describe('RouteRecommenderService', () => {
  let service: RouteRecommenderService;

  const mockTracks: GpxTrack[] = [
    {
      id: 'track-1',
      name: 'Short Flat Loop',
      waypoints: [
        { lat: 51.1079, lon: 17.0385, elevation: 120 },
        { lat: 51.1100, lon: 17.0400, elevation: 121 },
        { lat: 51.1079, lon: 17.0385, elevation: 120 },
      ],
      distance: 5.0,
      elevationGain: 5,
      elevationLoss: 5,
    },
    {
      id: 'track-2',
      name: 'Long Hilly Route',
      waypoints: [
        { lat: 51.1079, lon: 17.0385, elevation: 120 },
        { lat: 51.1200, lon: 17.0600, elevation: 250 },
        { lat: 51.1300, lon: 17.0800, elevation: 180 },
      ],
      distance: 15.0,
      elevationGain: 150,
      elevationLoss: 90,
    },
    {
      id: 'track-3',
      name: 'Medium City Route',
      waypoints: [
        { lat: 51.1079, lon: 17.0385, elevation: 115 },
        { lat: 51.1150, lon: 17.0500, elevation: 118 },
        { lat: 51.1200, lon: 17.0600, elevation: 116 },
      ],
      distance: 8.0,
      elevationGain: 25,
      elevationLoss: 24,
    },
  ];

  const goodWeather = {
    avgRainProbability: 5,
    maxRainIntensity: 0,
    avgWindSpeed: 10,
    avgWindDeg: 180,
  };

  const badWeather = {
    avgRainProbability: 90,
    maxRainIntensity: 5,
    avgWindSpeed: 40,
    avgWindDeg: 180,
  };

  const baseParams: RecommendationParams = {
    startTime: new Date(),
    durationMinutes: 60,
    activityType: 'cycling',
    rainTolerance: 'none',
    windSensitivity: 'medium',
    preferHilly: false,
    minDistanceKm: 0,
    maxDistanceKm: 100,
    customSpeedKmh: null,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RouteRecommenderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return top 3 recommendations', () => {
    const recs = service.recommend(mockTracks, baseParams, () => goodWeather);

    expect(recs.length).toBe(3);
    expect(recs[0].rank).toBe(1);
    expect(recs[1].rank).toBe(2);
    expect(recs[2].rank).toBe(3);
  });

  it('should rank tracks with lower scores in bad weather', () => {
    const params: RecommendationParams = {
      ...baseParams,
      windSensitivity: 'high',
    };

    const goodRecs = service.recommend(mockTracks, params, () => goodWeather);
    const badRecs = service.recommend(mockTracks, params, () => badWeather);

    expect(goodRecs[0].score).toBeGreaterThan(badRecs[0].score);
  });

  it('should sort results in descending score order', () => {
    const params: RecommendationParams = {
      ...baseParams,
      activityType: 'hiking',
      rainTolerance: 'light-rain-ok',
      preferHilly: true,
    };

    const recs = service.recommend(mockTracks, params, () => goodWeather);
    for (let i = 1; i < recs.length; i++) {
      expect(recs[i - 1].score).toBeGreaterThanOrEqual(recs[i].score);
    }
  });

  it('should return empty array when no tracks provided', () => {
    const recs = service.recommend([], baseParams, () => goodWeather);
    expect(recs.length).toBe(0);
  });

  it('should apply duration fit bonus for matching tracks', () => {
    const params: RecommendationParams = {
      ...baseParams,
      durationMinutes: 30,
      windSensitivity: 'low',
    };

    const recs = service.recommend(mockTracks, params, () => ({
      avgRainProbability: 0,
      maxRainIntensity: 0,
      avgWindSpeed: 0,
      avgWindDeg: 0,
    }));

    expect(recs.length).toBeGreaterThan(0);
    expect(recs[0].score).toBeGreaterThan(0);
  });

  it('should calculate estimated duration correctly with activity default speed', () => {
    const track = mockTracks[0]; // 5km, 5m gain
    const cyclingDuration = service.getEstimatedDuration(track, 'cycling');
    const walkingDuration = service.getEstimatedDuration(track, 'walking');

    expect(cyclingDuration).toBeLessThan(walkingDuration);
    // 5km / 20km/h = 15min + 0.5min elevation = 16
    expect(cyclingDuration).toBeCloseTo(16, 0);
  });

  it('should use custom speed override for duration calculation', () => {
    const track = mockTracks[0]; // 5km
    const defaultDuration = service.getEstimatedDuration(track, 'cycling', null);
    const fastDuration = service.getEstimatedDuration(track, 'cycling', 30);
    const slowDuration = service.getEstimatedDuration(track, 'cycling', 10);

    expect(fastDuration).toBeLessThan(defaultDuration);
    expect(slowDuration).toBeGreaterThan(defaultDuration);
    // 5km at 30km/h = 10min + 0.5 elevation = ~11
    expect(fastDuration).toBeCloseTo(11, 0);
  });

  it('should include speedUsedKmh in recommendation results', () => {
    const params: RecommendationParams = { ...baseParams, customSpeedKmh: 25 };
    const recs = service.recommend(mockTracks, params, () => goodWeather);
    recs.forEach((rec) => expect(rec.speedUsedKmh).toBe(25));
  });

  it('should use activity default speed when customSpeedKmh is null', () => {
    const params: RecommendationParams = { ...baseParams, customSpeedKmh: null };
    const recs = service.recommend(mockTracks, params, () => goodWeather);
    recs.forEach((rec) => expect(rec.speedUsedKmh).toBe(20)); // cycling default
  });

  it('should filter tracks by distance range', () => {
    const params: RecommendationParams = {
      ...baseParams,
      minDistanceKm: 6,
      maxDistanceKm: 12,
    };

    const recs = service.recommend(mockTracks, params, () => goodWeather);
    // Only track-3 (8km) falls in 6–12km range
    expect(recs.length).toBe(1);
    expect(recs[0].track.id).toBe('track-3');
  });

  it('should return empty when distance filter excludes all tracks', () => {
    const params: RecommendationParams = {
      ...baseParams,
      minDistanceKm: 50,
      maxDistanceKm: 100,
    };

    const recs = service.recommend(mockTracks, params, () => goodWeather);
    expect(recs.length).toBe(0);
  });

  it('should include explanation text in recommendations', () => {
    const recs = service.recommend(mockTracks, { ...baseParams, activityType: 'running' }, () => goodWeather);
    recs.forEach((rec) => {
      expect(rec.explanation).toBeTruthy();
      expect(rec.explanation.length).toBeGreaterThan(10);
    });
  });
});
