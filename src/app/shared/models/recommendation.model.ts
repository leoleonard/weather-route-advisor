import { GpxTrack } from './track.model';

export type ActivityType = 'cycling' | 'running' | 'hiking' | 'walking';
export type RainTolerance = 'none' | 'light-rain-ok' | 'any-weather';
export type WindSensitivity = 'low' | 'medium' | 'high';

export interface RecommendationParams {
  startTime: Date;
  durationMinutes: number;
  activityType: ActivityType;
  rainTolerance: RainTolerance;
  windSensitivity: WindSensitivity;
  preferHilly: boolean;
  minDistanceKm: number;
  maxDistanceKm: number;
  customSpeedKmh: number | null; // null = use activity default
}

export interface TrackRecommendation {
  track: GpxTrack;
  score: number;
  rank: 1 | 2 | 3;
  explanation: string;
  rainProbability: number;
  rainIntensity: number;
  windSpeedKmh: number;
  windDirectionLabel: string;
  estimatedDurationMinutes: number;
  speedUsedKmh: number;
}
