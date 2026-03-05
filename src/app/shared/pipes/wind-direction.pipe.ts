import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'windDirection', standalone: true })
export class WindDirectionPipe implements PipeTransform {
  transform(degrees: number): string {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((degrees % 360) + 360) % 360 / 45) % 8;
    return directions[index];
  }
}
