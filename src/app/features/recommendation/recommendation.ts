import {
  Component,
  inject,
  signal,
  computed,
  input,
  output
} from '@angular/core';
import { ReactiveFormsModule, FormGroup, FormControl, NonNullableFormBuilder } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatTooltipModule } from '@angular/material/tooltip';
import { DecimalPipe } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouteRecommenderService } from '../../core/services/route-recommender.service';
import { WeatherService } from '../../core/services/weather.service';
import { GpxTrack } from '../../shared/models/track.model';
import {
  ActivityType,
  RainTolerance,
  RecommendationParams,
  TrackRecommendation,
  WindSensitivity,
} from '../../shared/models/recommendation.model';
import { DurationPipe } from '../../shared/pipes/duration.pipe';

const RANK_ICONS: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

const DEFAULT_SPEEDS: Record<ActivityType, number> = {
  cycling: 20,
  running: 10,
  hiking: 4,
  walking: 5,
};

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface FilterForm {
  activityType: FormControl<ActivityType>;
  rainTolerance: FormControl<RainTolerance>;
  windSensitivity: FormControl<WindSensitivity>;
  startDayOffset: FormControl<number>;
  startHour: FormControl<number>;
  minDistanceKm: FormControl<number>;
  maxDistanceKm: FormControl<number>;
  useCustomSpeed: FormControl<boolean>;
  customSpeedKmh: FormControl<number>;
  preferHilly: FormControl<boolean>;
}

@Component({
  selector: 'app-recommendation',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatSliderModule,
    MatChipsModule,
    MatIconModule,
    MatDividerModule,
    MatTooltipModule,
    DecimalPipe,
    DurationPipe,
  ],
  templateUrl: './recommendation.html',
  styleUrl: './recommendation.scss',
})
export class RecommendationComponent {
  private readonly recommender = inject(RouteRecommenderService);
  private readonly weatherService = inject(WeatherService);
  private readonly fb = inject(NonNullableFormBuilder);

  tracks = input<GpxTrack[]>([]);
  recommendationsChanged = output<TrackRecommendation[]>();

  readonly form: FormGroup<FilterForm> = this.fb.group<FilterForm>({
    activityType: this.fb.control<ActivityType>('cycling'),
    rainTolerance: this.fb.control<RainTolerance>('none'),
    windSensitivity: this.fb.control<WindSensitivity>('medium'),
    startDayOffset: this.fb.control(0),
    startHour: this.fb.control(9),
    minDistanceKm: this.fb.control(0),
    maxDistanceKm: this.fb.control(100),
    useCustomSpeed: this.fb.control(false),
    customSpeedKmh: this.fb.control(20),
    preferHilly: this.fb.control(false),
  });

  private readonly formValue = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  readonly effectiveSpeedKmh = computed(() => {
    const v = this.formValue();
    return v.useCustomSpeed ? (v.customSpeedKmh ?? 20) : DEFAULT_SPEEDS[v.activityType ?? 'cycling'];
  });

  readonly computedDurationMinutes = computed(() => {
    const v = this.formValue();
    const midKm = ((v.minDistanceKm ?? 0) + (v.maxDistanceKm ?? 100)) / 2;
    const speed = this.effectiveSpeedKmh();
    return speed > 0 ? Math.round((midKm / speed) * 60) : 0;
  });

  readonly dayOptions = computed(() => {
    const today = new Date();
    return [0, 1, 2].map((offset) => {
      const d = new Date(today);
      d.setDate(today.getDate() + offset);
      const dayName = DAY_NAMES[d.getDay()];
      const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : dayName;
      const sub = `${dayName} ${d.getDate()}/${d.getMonth() + 1}`;
      return { offset, label, sub };
    });
  });

  readonly startTimeLabel = computed(() => {
    const v = this.formValue();
    const day = this.dayOptions()[v.startDayOffset ?? 0];
    return `${day.label} at ${v.startHour ?? 9}:00`;
  });

  readonly recommendations = signal<TrackRecommendation[]>([]);
  readonly hasResults = computed(() => this.recommendations().length > 0);

  readonly filteredCount = computed(() => {
    const v = this.formValue();
    return this.tracks().filter(
      (t) => t.distance >= (v.minDistanceKm ?? 0) && t.distance <= (v.maxDistanceKm ?? 100)
    ).length;
  });

  readonly rankIcon = (rank: number): string => RANK_ICONS[rank] ?? '';

  compute(): void {
    const v = this.form.getRawValue();

    const startTime = new Date();
    startTime.setDate(startTime.getDate() + v.startDayOffset);
    startTime.setHours(v.startHour, 0, 0, 0);

    const params: RecommendationParams = {
      startTime,
      durationMinutes: this.computedDurationMinutes(),
      activityType: v.activityType,
      rainTolerance: v.rainTolerance,
      windSensitivity: v.windSensitivity,
      preferHilly: v.preferHilly,
      minDistanceKm: v.minDistanceKm,
      maxDistanceKm: v.maxDistanceKm,
      customSpeedKmh: v.useCustomSpeed ? v.customSpeedKmh : null,
    };

    const recs = this.recommender.recommend(
      this.tracks(),
      params,
      () => this.weatherService.getWeatherForWindow(startTime, params.durationMinutes)
    );

    this.recommendations.set(recs);
    this.recommendationsChanged.emit(recs);
  }

  clear(): void {
    this.recommendations.set([]);
    this.recommendationsChanged.emit([]);
  }

  onActivityChange(activity: ActivityType): void {
    this.form.patchValue({ activityType: activity });
    if (!this.form.value.useCustomSpeed) {
      this.form.patchValue({ customSpeedKmh: DEFAULT_SPEEDS[activity] });
    }
  }
}
