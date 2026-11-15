import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { PwaInstall } from '../core/pwa';

/** Pasos para instalar según el dispositivo/navegador (claves de traducción). */
const STEPS: Record<string, string[]> = {
  ios: ['pwa.ios1', 'pwa.ios2', 'pwa.ios3'],
  android: ['pwa.android1', 'pwa.android2', 'pwa.android3'],
  chromium: ['pwa.desktop1', 'pwa.desktop2'],
  'safari-mac': ['pwa.safariMac1'],
  firefox: ['pwa.firefox'],
};

@Component({
  selector: 'app-install-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'pwa.title' | translate }}</h2>
    <mat-dialog-content>
      <p class="intro">{{ 'pwa.intro' | translate }}</p>

      @if (!pwa.secure) { <div class="warn"><mat-icon>lock</mat-icon>{{ 'pwa.needsHttps' | translate }}</div> }

      @if (pwa.canPrompt()) {
        <button matButton="filled" class="now" (click)="install()"><mat-icon>install_mobile</mat-icon> {{ 'pwa.installNow' | translate }}</button>
        <p class="or">{{ 'pwa.orManual' | translate }}</p>
      }

      <ol>
        @for (k of steps; track k) { <li>{{ k | translate }}</li> }
      </ol>
      @if (pwa.platform === 'ios') { <p class="note"><mat-icon>info</mat-icon>{{ 'pwa.iosNote' | translate }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.close' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .intro { margin: 0 0 16px; color: var(--mat-sys-on-surface-variant); }
    ol { margin: 0; padding-left: 22px; display: grid; gap: 12px; line-height: 1.5; }
    .now { width: 100%; height: 48px; margin-bottom: 4px; } .or { text-align: center; color: var(--mat-sys-on-surface-variant); font-size: 13px; margin: 12px 0; }
    .warn, .note { display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 10px 14px; font-size: 13px; margin: 0 0 16px; }
    .warn { background: var(--warn-bg); color: var(--warn); } .note { background: var(--mat-sys-surface-container-high); margin: 16px 0 0; }
    mat-icon { flex: none; }
  `,
})
export class InstallDialog {
  protected readonly pwa = inject(PwaInstall);
  protected readonly ref = inject(MatDialogRef<InstallDialog>);
  protected readonly steps = STEPS[this.pwa.platform];

  protected async install() {
    if (await this.pwa.install()) this.ref.close();
  }
}

/** Botón "Instalar app": abre las instrucciones y desaparece cuando la app ya está instalada. */
@Component({
  selector: 'app-install-button',
  imports: [MatButton, MatIcon, TranslatePipe],
  template: `
    @if (!pwa.installed()) {
      <button matButton="tonal" class="install" (click)="open()">
        <mat-icon>install_mobile</mat-icon><span class="lbl">{{ 'pwa.install' | translate }}</span>
      </button>
    }
  `,
  styles: `@media (max-width: 640px) { .lbl { display: none; } .install { min-width: 0; padding: 0 12px; } .install mat-icon { margin: 0; } }`,
})
export class InstallButton {
  protected readonly pwa = inject(PwaInstall);
  private readonly dialog = inject(MatDialog);
  protected open() { this.dialog.open(InstallDialog, { width: '440px' }); }
}
