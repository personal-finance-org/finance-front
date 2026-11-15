import { Component, computed, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { passwordChecks } from '../core/password';

/** Requisitos de la contraseña con círculo (check al cumplirse) y avisos de secuencias (solo si se incumplen). */
@Component({
  selector: 'app-password-rules',
  imports: [MatIcon, TranslatePipe],
  template: `
    <ul class="rules" [attr.aria-label]="'pw.title' | translate">
      @for (r of rules(); track r.key) {
        <li [class.ok]="r.ok"><mat-icon>{{ r.ok ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>{{ r.key | translate }}</li>
      }
    </ul>
    @for (w of warnings(); track w) {
      <div class="warn" role="alert"><mat-icon>error</mat-icon>{{ w | translate }}</div>
    }
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 14px; }
    .rules { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 12px; }
    li { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--mat-sys-on-surface-variant); transition: color .2s; }
    li mat-icon { font-size: 20px; width: 20px; height: 20px; flex: none; }
    li.ok { color: var(--income); } li.ok mat-icon { font-variation-settings: 'FILL' 1, 'wght' 400; }
    .warn { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--expense); background: var(--expense-bg); padding: 8px 12px; border-radius: 12px; }
    .warn mat-icon { font-size: 18px; width: 18px; height: 18px; flex: none; }
    @media (max-width: 420px) { .rules { grid-template-columns: 1fr; } }
  `,
})
export class PasswordRules {
  readonly password = input('');
  private readonly checks = computed(() => passwordChecks(this.password()));
  protected readonly rules = computed(() => {
    const c = this.checks();
    return [
      { key: 'pw.length', ok: c.length }, { key: 'pw.upper', ok: c.upper }, { key: 'pw.lower', ok: c.lower },
      { key: 'pw.digit', ok: c.digit }, { key: 'pw.special', ok: c.special },
    ];
  });
  protected readonly warnings = computed(() => {
    const c = this.checks();
    return [!c.noNumericRun && 'pw.warnNumeric', !c.noAlphaRun && 'pw.warnAlpha', !c.noCharRun && 'pw.warnChars'].filter((m): m is string => !!m);
  });
}
