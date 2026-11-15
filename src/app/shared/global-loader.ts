import { Component, inject } from '@angular/core';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe } from '@ngx-translate/core';
import { Loading } from '../core/loading';

/** Loader global: aparece mientras haya peticiones a la API en curso. */
@Component({
  selector: 'app-global-loader',
  imports: [MatProgressSpinner, TranslatePipe],
  template: `
    @if (loading.visible()) {
      <div class="busy" role="status" aria-live="polite">
        <div class="busy-card">
          <mat-spinner diameter="56" />
          <strong>{{ 'common.loading' | translate }}</strong>
          @if (loading.slow()) { <p>{{ 'common.busySlow' | translate }}</p> }
        </div>
      </div>
    }
  `,
  styles: `
    .busy { position: fixed; inset: 0; z-index: 1100; display: grid; place-items: center; padding: 20px; background: color-mix(in srgb, var(--mat-sys-scrim) 45%, transparent); backdrop-filter: blur(3px); }
    .busy-card { background: var(--mat-sys-surface); color: var(--mat-sys-on-surface); border-radius: 24px; padding: 28px 32px; max-width: 360px; width: 100%; box-sizing: border-box; text-align: center;
      display: flex; flex-direction: column; align-items: center; gap: 16px; box-shadow: var(--mat-sys-level3);
      strong { font: var(--mat-sys-title-medium); } p { margin: 0; font-size: 13px; line-height: 1.5; color: var(--mat-sys-on-surface-variant); } }
  `,
})
export class GlobalLoader {
  protected readonly loading = inject(Loading);
}
