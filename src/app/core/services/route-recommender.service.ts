import { Injectable } from '@angular/core';
import { GpxTrack } from '../../shared/models/track.model';
import {
  ActivityType,
  RainTolerance,
  RecommendationParams,
  TrackRecommendation,
  WindSensitivity,
} from '../../shared/models/recommendation.model';
import { WindDirectionPipe } from '../../shared/pipes/wind-direction.pipe';

const DEFAULT_SPEEDS: Record<ActivityType, number> = {
  cycling: 20,
  running: 10,
  hiking: 4,
  walking: 5,
};

@Injectable({ providedIn: 'root' })
export class RouteRecommenderService {
  private readonly windPipe = new WindDirectionPipe();

  getEffectiveSpeed(activity: ActivityType, customSpeedKmh: number | null): number {
    return customSpeedKmh ?? DEFAULT_SPEEDS[activity];
  }

  getEstimatedDuration(track: GpxTrack, activity: ActivityType, customSpeedKmh: number | null = null): number {
    const speed = this.getEffectiveSpeed(activity, customSpeedKmh);
    const baseDuration = (track.distance / speed) * 60;
    const elevationPenalty = track.elevationGain / 10;
    return Math.round(baseDuration + elevationPenalty);
  }

  getTrackBearing(track: GpxTrack): number {
    if (track.waypoints.length < 2) return 0;
    const start = track.waypoints[0];
    const end = track.waypoints[track.waypoints.length - 1];
    const dLon = ((end.lon - start.lon) * Math.PI) / 180;
    const lat1 = (start.lat * Math.PI) / 180;
    const lat2 = (end.lat * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
    return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
  }

  scoreTrack(
    track: GpxTrack,
    params: RecommendationParams,
    weather: {
      avgRainProbability: number;
      maxRainIntensity: number;
      avgWindSpeed: number;
      avgWindDeg: number;
    }
  ): number {
    let score = 100;

    const rainWeights: Record<RainTolerance, number> = {
      none: 1.5,
      'light-rain-ok': 0.5,
      'any-weather': 0.1,
    };
    score -= weather.avgRainProbability * rainWeights[params.rainTolerance];
    score -= weather.maxRainIntensity * 10;

    const windMultipliers: Record<WindSensitivity, number> = {
      low: 0.1,
      medium: 0.5,
      high: 1.0,
    };
    const windMult = windMultipliers[params.windSensitivity];
    const trackBearing = this.getTrackBearing(track);
    const angle = Math.abs(
      ((weather.avgWindDeg - trackBearing + 540) % 360) - 180
    );
    const windFactor = (angle - 90) / 90;
    score -= weather.avgWindSpeed * windMult * windFactor;

    const estimatedDuration = this.getEstimatedDuration(track, params.activityType, params.customSpeedKmh);
    const durationDiff = Math.abs(estimatedDuration - params.durationMinutes);
    const durationFit = Math.max(0, 1 - durationDiff / Math.max(params.durationMinutes, 1));
    score += durationFit * 20;

    if (params.preferHilly) {
      score += Math.min(track.elevationGain / 100, 10);
    } else {
      score -= Math.min(track.elevationGain / 100, 5);
    }

    return Math.max(0, score);
  }

  recommend(
    tracks: GpxTrack[],
    params: RecommendationParams,
    weatherFn: (track: GpxTrack) => {
      avgRainProbability: number;
      maxRainIntensity: number;
      avgWindSpeed: number;
      avgWindDeg: number;
    }
  ): TrackRecommendation[] {
    if (tracks.length === 0) return [];

    // Filter by distance range
    const filtered = tracks.filter(
      (t) => t.distance >= params.minDistanceKm && t.distance <= params.maxDistanceKm
    );
    if (filtered.length === 0) return [];

    const speedUsedKmh = this.getEffectiveSpeed(params.activityType, params.customSpeedKmh);

    const scored = filtered.map((track) => {
      const weather = weatherFn(track);
      const score = this.scoreTrack(track, params, weather);
      const estimatedDurationMinutes = this.getEstimatedDuration(track, params.activityType, params.customSpeedKmh);
      const windSpeedKmh = Math.round(weather.avgWindSpeed);
      const windDirectionLabel = this.windPipe.transform(weather.avgWindDeg);

      const rainText =
        weather.avgRainProbability < 20
          ? `Low rain risk ${weather.avgRainProbability}%`
          : weather.avgRainProbability < 60
          ? `Moderate rain risk ${weather.avgRainProbability}%`
          : `High rain risk ${weather.avgRainProbability}%`;

      const windText =
        windSpeedKmh < 10
          ? `Calm wind ${windSpeedKmh} km/h ${windDirectionLabel}`
          : `Wind ${windSpeedKmh} km/h ${windDirectionLabel}`;

      const hours = Math.round((params.durationMinutes / 60) * 10) / 10;
      const durationText = `fits your ${hours}h window`;

      return {
        track,
        score,
        rank: 1 as 1 | 2 | 3,
        explanation: `${rainText}, ${windText}, ${durationText}`,
        rainProbability: weather.avgRainProbability,
        rainIntensity: weather.maxRainIntensity,
        windSpeedKmh,
        windDirectionLabel,
        estimatedDurationMinutes,
        speedUsedKmh,
      };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 3).map((item, index) => ({
      ...item,
      rank: (index + 1) as 1 | 2 | 3,
    }));
  }
}
