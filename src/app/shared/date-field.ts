import { booleanAttribute, Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatDatepicker, MatDatepickerInput, MatDatepickerToggle } from '@angular/material/datepicker';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { TranslatePipe } from '@ngx-translate/core';
import { toDateInput } from '../core/format';

/**
 * Campo de fecha con calendario desplegable (Angular Material).
 * Su valor en el formulario es un texto "YYYY-MM-DD" (o '' si está vacío), igual que antes con <input type="date">.
 */
@Component({
  selector: 'app-date-field',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatSuffix, MatInput, MatDatepicker, MatDatepickerInput, MatDatepickerToggle, MatIconButton, MatIcon, TranslatePipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => DateField), multi: true }],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <input matInput readonly [placeholder]="'common.datePlaceholder' | translate" [matDatepicker]="picker" [formControl]="ctrl" (click)="picker.open()" (blur)="touched()" />
      @if (clearable() && ctrl.value) {
        <button matIconButton matSuffix type="button" (click)="clear($event)" [attr.aria-label]="'common.clearDate' | translate"><mat-icon>close</mat-icon></button>
      }
      <mat-datepicker-toggle matIconSuffix [for]="picker" />
      <mat-datepicker #picker />
    </mat-form-field>
  `,
  styles: `:host { display: block; } input { cursor: pointer; }`,
})
export class DateField implements ControlValueAccessor {
  readonly label = input('');
  /** Muestra una "x" para vaciar el campo (útil en filtros). */
  readonly clearable = input(false, { transform: booleanAttribute });

  protected readonly ctrl = new FormControl<Date | null>(null);
  private readonly disabled = signal(false);
  private onChange: (v: string) => void = () => {};
  protected touched: () => void = () => {};

  constructor() {
    this.ctrl.valueChanges.subscribe((d) => this.onChange(d ? toDateInput(d) : ''));
  }

  writeValue(v: string | null): void {
    // "YYYY-MM-DD" → fecha local a medianoche (sin saltos por zona horaria)
    const [y, m, d] = (v ?? '').split('-').map(Number);
    this.ctrl.setValue(v && y ? new Date(y, m - 1, d) : null, { emitEvent: false });
  }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.touched = fn; }
  setDisabledState(isDisabled: boolean) {
    this.disabled.set(isDisabled);
    if (isDisabled) this.ctrl.disable({ emitEvent: false }); else this.ctrl.enable({ emitEvent: false });
  }

  protected clear(e: Event) { e.stopPropagation(); this.ctrl.setValue(null); }
}
