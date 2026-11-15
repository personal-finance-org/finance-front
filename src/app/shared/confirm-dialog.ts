import { Component, inject } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { TranslatePipe } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

/** Todos los textos son claves de traducción; `params` se interpola en título y mensaje. */
export interface ConfirmData { title: string; message: string; params?: Record<string, unknown>; confirm?: string; danger?: boolean; }

@Component({
  selector: 'app-confirm-dialog',
  imports: [MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ data.title | translate: data.params }}</h2>
    <mat-dialog-content>{{ data.message | translate: data.params }}</mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close(false)">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" [style.--mat-button-filled-container-color]="data.danger ? 'var(--expense)' : null"
        [style.--mat-button-filled-label-text-color]="data.danger ? '#fff' : null" (click)="ref.close(true)">
        {{ (data.confirm ?? 'common.accept') | translate }}
      </button>
    </mat-dialog-actions>
  `,
})
export class ConfirmDialog {
  protected readonly data = inject<ConfirmData>(MAT_DIALOG_DATA);
  protected readonly ref = inject(MatDialogRef<ConfirmDialog>);
}

export async function confirm(dialog: MatDialog, data: ConfirmData): Promise<boolean> {
  return !!(await firstValueFrom(dialog.open(ConfirmDialog, { data, width: '420px' }).afterClosed()));
}
