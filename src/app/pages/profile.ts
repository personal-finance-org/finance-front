import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatHint, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Auth } from '../core/auth';
import { CURRENCIES, I18n, LANGS } from '../core/i18n';
import { Notify } from '../core/notify';
import { strongPassword } from '../core/password';
import { PasswordRules } from '../shared/password-rules';

const sameAsNew = (g: AbstractControl): ValidationErrors | null =>
  g.get('newPassword')?.value === g.get('confirm')?.value ? null : { mismatch: true };

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatHint, MatSuffix, MatInput, MatSelect, MatOption, MatButton, MatIcon, TranslatePipe, PasswordRules],
  template: `
    <div class="page">
      <div class="page-header"><div><h1>{{ 'profile.title' | translate }}</h1><p>{{ 'profile.subtitle' | translate }}</p></div></div>

      <div class="grid cols-2">
        <section class="card">
          <h2><mat-icon>person</mat-icon> {{ 'profile.personal' | translate }}</h2>
          <form [formGroup]="profileForm" (ngSubmit)="saveProfile()" class="col">
            <mat-form-field><mat-label>{{ 'auth.name' | translate }}</mat-label><input matInput formControlName="name" autocomplete="name" /></mat-form-field>
            <mat-form-field><mat-label>{{ 'auth.email' | translate }}</mat-label><input matInput [value]="auth.user()?.email ?? ''" disabled />
              <mat-hint>{{ 'profile.emailHint' | translate }}</mat-hint></mat-form-field>
            <div class="actions"><button matButton="filled" [disabled]="profileForm.invalid || profileForm.pristine || savingProfile()">{{ 'common.save' | translate }}</button></div>
          </form>
        </section>

        <section class="card">
          <h2><mat-icon>language</mat-icon> {{ 'profile.preferences' | translate }}</h2>
          <div class="col">
            <mat-form-field>
              <mat-label>{{ 'profile.language' | translate }}</mat-label>
              <mat-select [value]="i18n.lang()" (selectionChange)="changeLanguage($event.value)">
                @for (l of langs; track l.code) { <mat-option [value]="l.code">{{ l.flag }} {{ l.label }}</mat-option> }
              </mat-select>
              <mat-hint>{{ 'profile.languageHint' | translate }}</mat-hint>
            </mat-form-field>
            <mat-form-field>
              <mat-label>{{ 'profile.currency' | translate }}</mat-label>
              <mat-select [value]="i18n.currency()" (selectionChange)="changeCurrency($event.value)">
                @for (c of currencies(); track c.code) { <mat-option [value]="c.code">{{ c.code }} · {{ c.name }}</mat-option> }
              </mat-select>
              <mat-hint>{{ 'profile.currencyHint' | translate }}</mat-hint>
            </mat-form-field>
          </div>
        </section>
      </div>

      <section class="card narrow">
        <h2><mat-icon>lock</mat-icon> {{ 'profile.changePassword' | translate }}</h2>
        <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="col">
          <mat-form-field>
            <mat-label>{{ 'profile.currentPassword' | translate }}</mat-label>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="currentPassword" autocomplete="current-password" />
            <button type="button" matSuffix class="eye" (click)="show.set(!show())" [attr.aria-label]="'auth.togglePassword' | translate"><mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
          </mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'profile.newPassword' | translate }}</mat-label>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="newPassword" autocomplete="new-password" />
          </mat-form-field>
          <app-password-rules [password]="newPw()" />
          <mat-form-field>
            <mat-label>{{ 'profile.confirmPassword' | translate }}</mat-label>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="confirm" autocomplete="new-password" />
            @if (passwordForm.hasError('mismatch') && passwordForm.controls.confirm.dirty) { <mat-hint class="bad">{{ 'profile.mismatch' | translate }}</mat-hint> }
          </mat-form-field>
          @if (passwordError()) { <div class="error" role="alert">{{ passwordError() }}</div> }
          <div class="actions"><button matButton="filled" [disabled]="passwordForm.invalid || savingPassword()">{{ 'profile.updatePassword' | translate }}</button></div>
        </form>
      </section>
    </div>
  `,
  styles: `
    .col { display: flex; flex-direction: column; gap: 20px; margin-top: 8px; }
    .actions { display: flex; justify-content: flex-end; }
    .narrow { max-width: 560px; }
    .error { background: var(--expense-bg); color: var(--expense); padding: 10px 14px; border-radius: 12px; font-size: 13px; }
    .bad { color: var(--expense); }
    .eye { background: none; border: 0; cursor: pointer; color: var(--mat-sys-on-surface-variant); margin-right: 8px; }
  `,
})
export class ProfilePage {
  protected readonly auth = inject(Auth);
  protected readonly i18n = inject(I18n);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly langs = LANGS;

  /** Monedas con su nombre en el idioma activo (ej. "COP · peso colombiano"). */
  protected readonly currencies = computed(() => {
    const names = new Intl.DisplayNames(this.i18n.locale(), { type: 'currency' });
    return CURRENCIES.map((code) => ({ code, name: names.of(code) ?? code }));
  });

  protected readonly savingProfile = signal(false);
  protected readonly savingPassword = signal(false);
  protected readonly passwordError = signal('');
  protected readonly show = signal(false);

  protected readonly profileForm = this.fb.group({ name: [this.auth.user()?.name ?? '', [Validators.required, Validators.minLength(2)]] });

  protected readonly passwordForm = this.fb.group(
    { currentPassword: ['', Validators.required], newPassword: ['', [Validators.required, strongPassword]], confirm: ['', Validators.required] },
    { validators: sameAsNew },
  );
  protected readonly newPw = toSignal(this.passwordForm.controls.newPassword.valueChanges, { initialValue: '' });

  protected async saveProfile() {
    this.savingProfile.set(true);
    const ok = await this.notify.attempt(() => this.auth.updateProfile({ name: this.profileForm.getRawValue().name.trim() }), 'profile.saved');
    this.savingProfile.set(false);
    if (ok) this.profileForm.markAsPristine();
  }

  /** El idioma se guarda en el perfil y se aplica al instante. */
  protected async changeLanguage(language: string) {
    await this.notify.attempt(() => this.auth.updateProfile({ language }), 'profile.saved');
  }

  protected async changeCurrency(currency: string) {
    await this.notify.attempt(() => this.auth.updateProfile({ currency }), 'profile.saved');
  }

  protected async savePassword() {
    const { currentPassword, newPassword } = this.passwordForm.getRawValue();
    this.passwordError.set('');
    this.savingPassword.set(true);
    try {
      await this.auth.changePassword(currentPassword, newPassword);
      this.notify.info('profile.passwordChanged');
      this.passwordForm.reset({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (e) {
      this.passwordError.set(this.notify.message(e));
    } finally {
      this.savingPassword.set(false);
    }
  }
}
