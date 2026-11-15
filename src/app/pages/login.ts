import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';
import { Auth } from '../core/auth';
import { I18n, LANGS, Lang } from '../core/i18n';
import { Notify } from '../core/notify';
import { passwordChecks, strongPassword } from '../core/password';
import { InstallButton } from '../shared/install-button';
import { PasswordRules } from '../shared/password-rules';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatInput, MatButton, MatIcon, MatSuffix, MatProgressSpinner, TranslatePipe, PasswordRules, InstallButton],
  template: `
    <main>
      <section class="hero">
        <div class="logo"><mat-icon>trending_up</mat-icon></div>
        <span class="brand">Mis Finanzas</span>
        <h1>{{ 'auth.heroTitle1' | translate }}<br />{{ 'auth.heroTitle2' | translate }}</h1>
        <p>{{ 'auth.heroText' | translate }}</p>
        <ul>
          <li><mat-icon>account_balance_wallet</mat-icon> {{ 'auth.feature1' | translate }}</li>
          <li><mat-icon>event_repeat</mat-icon> {{ 'auth.feature2' | translate }}</li>
          <li><mat-icon>credit_score</mat-icon> {{ 'auth.feature3' | translate }}</li>
          <li><mat-icon>monitoring</mat-icon> {{ 'auth.feature4' | translate }}</li>
        </ul>
      </section>

      <section class="panel">
        <div class="top">
        <app-install-button />
        <div class="langs" role="group" [attr.aria-label]="'profile.language' | translate">
          @for (l of langs; track l.code) {
            <button type="button" [class.on]="i18n.lang() === l.code" (click)="setLang(l.code)" [title]="l.label">{{ l.flag }} {{ l.code === 'pt-BR' ? 'PT' : l.code.toUpperCase() }}</button>
          }
        </div>
        </div>

        <h2>{{ (mode() === 'login' ? 'auth.welcomeBack' : 'auth.createAccount') | translate }}</h2>
        <p class="muted">{{ (mode() === 'login' ? 'auth.loginSubtitle' : 'auth.registerSubtitle') | translate }}</p>

        <form [formGroup]="form" (ngSubmit)="submit()">
          @if (mode() === 'register') {
            <mat-form-field><mat-label>{{ 'auth.name' | translate }}</mat-label><input matInput formControlName="name" autocomplete="name" /></mat-form-field>
          }
          <mat-form-field><mat-label>{{ 'auth.email' | translate }}</mat-label><input matInput type="email" formControlName="email" autocomplete="email" /></mat-form-field>
          <mat-form-field>
            <mat-label>{{ 'auth.password' | translate }}</mat-label>
            <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" [autocomplete]="mode() === 'login' ? 'current-password' : 'new-password'" />
            <button type="button" matSuffix class="eye" (click)="show.set(!show())" [attr.aria-label]="'auth.togglePassword' | translate"><mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon></button>
          </mat-form-field>

          @if (mode() === 'register') { <app-password-rules [password]="pw()" /> }

          @if (error()) { <div class="error" role="alert">{{ error() }}</div> }

          <button matButton="filled" class="submit" [disabled]="loading()">
            @if (loading()) { <mat-spinner diameter="20" /> } @else { {{ (mode() === 'login' ? 'auth.login' : 'auth.register') | translate }} }
          </button>
        </form>

        <p class="switch">
          {{ (mode() === 'login' ? 'auth.noAccount' : 'auth.haveAccount') | translate }}
          <a href="javascript:void 0" (click)="toggle()">{{ (mode() === 'login' ? 'auth.goRegister' : 'auth.goLogin') | translate }}</a>
        </p>
      </section>
    </main>
  `,
  styles: `
    main { min-height: 100dvh; display: grid; grid-template-columns: 1.1fr 1fr; }
    .hero { padding: 64px 56px; color: #eafff6; display: flex; flex-direction: column; justify-content: center; gap: 18px;
      background: radial-gradient(1200px 600px at 0% 0%, #1c8a69 0%, transparent 60%), linear-gradient(160deg, #0b3d2f, #0f5c47 60%, #0a2f26); }
    .logo { width: 56px; height: 56px; border-radius: 18px; display: grid; place-items: center; background: rgba(255,255,255,.14); color: #7ff0c0;
      mat-icon { font-size: 30px; width: 30px; height: 30px; } }
    h1 { font-size: clamp(34px, 4.5vw, 52px); line-height: 1.05; margin: 0; letter-spacing: -.03em; }
    .hero p { max-width: 460px; opacity: .85; font-size: 16px; line-height: 1.55; margin: 0; }
    ul { list-style: none; padding: 0; margin: 8px 0 0; display: grid; gap: 12px; }
    li { display: flex; align-items: center; gap: 12px; opacity: .92; mat-icon { color: #7ff0c0; } }
    .hero, .panel { box-sizing: border-box; }
    .panel { padding: 32px 40px 48px; min-width: 0; display: flex; flex-direction: column; justify-content: center; max-width: 440px; width: 100%; margin: 0 auto; }
    .top { display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap; margin-bottom: 28px; }
    .brand { font: 700 18px/1 Inter, sans-serif; letter-spacing: -.01em; margin-top: -6px; opacity: .9; }
    .langs { display: flex; gap: 6px; margin-left: auto;
      button { border: 1px solid var(--mat-sys-outline-variant); background: transparent; color: var(--mat-sys-on-surface-variant); border-radius: 99px; padding: 5px 12px; font: var(--mat-sys-label-medium); cursor: pointer; }
      button.on { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); border-color: transparent; } }
    h2 { margin: 0; font: var(--mat-sys-headline-small); }
    form { display: flex; flex-direction: column; gap: 20px; margin-top: 24px; }
    .submit { height: 48px; margin-top: 6px; }
    .error { background: var(--expense-bg); color: var(--expense); padding: 10px 14px; border-radius: 12px; font-size: 13px; }
    .switch { text-align: center; margin-top: 22px; a { color: var(--mat-sys-primary); font-weight: 600; margin-left: 4px; cursor: pointer; } }
    .eye { background: none; border: 0; cursor: pointer; color: var(--mat-sys-on-surface-variant); margin-right: 8px; }
    @media (max-width: 860px) { main { grid-template-columns: 1fr; } .hero { padding: 32px 24px; } .hero ul, .hero p { display: none; } .panel { padding: 24px 20px 40px; } }
  `,
})
export class LoginPage {
  private readonly auth = inject(Auth);
  private readonly notify = inject(Notify);
  private readonly tr = inject(TranslateService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly i18n = inject(I18n);
  protected readonly langs = LANGS;
  protected readonly mode = signal<'login' | 'register'>('login');
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly show = signal(false);

  protected readonly form = this.fb.group({
    name: [''],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });
  protected readonly pw = toSignal(this.form.controls.password.valueChanges, { initialValue: '' });
  private readonly weak = computed(() => this.mode() === 'register' && !Object.values(passwordChecks(this.pw())).every(Boolean));

  protected setLang(l: Lang) { this.i18n.use(l); }

  protected toggle() {
    this.mode.update((m) => (m === 'login' ? 'register' : 'login'));
    this.error.set('');
    this.form.controls.name.setValidators(this.mode() === 'register' ? [Validators.required, Validators.minLength(2)] : []);
    this.form.controls.name.updateValueAndValidity();
    // En el registro se exige contraseña segura; al ingresar solo que no esté vacía (cuentas antiguas).
    this.form.controls.password.setValidators(this.mode() === 'register' ? [Validators.required, strongPassword] : [Validators.required]);
    this.form.controls.password.updateValueAndValidity();
  }

  protected async submit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.error.set(this.tr.instant(this.weak() ? 'auth.weakPassword' : 'auth.checkFields'));
      return;
    }
    const { name, email, password } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    try {
      if (this.mode() === 'login') await this.auth.login(email, password);
      else await this.auth.register(name, email, password);
    } catch (e) {
      this.error.set(this.notify.message(e));
    } finally {
      this.loading.set(false);
    }
  }
}
