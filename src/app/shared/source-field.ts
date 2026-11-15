import { booleanAttribute, Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, FormControl, NG_VALUE_ACCESSOR, ReactiveFormsModule } from '@angular/forms';
import { MatOption, MatOptgroup } from '@angular/material/core';
import { MatFormField, MatHint, MatLabel } from '@angular/material/form-field';
import { MatSelect, MatSelectTrigger } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../core/format';
import { Account } from '../core/models';
import { parseSource } from '../core/source';

/**
 * Selector de "de dónde sale la plata": cada cuenta con su disponible y, debajo, sus bolsillos.
 * El valor es un texto "a:ID" (cuenta) o "p:ID" (bolsillo); ver core/source.ts. Vacío = ninguno.
 */
@Component({
  selector: 'app-source-field',
  imports: [ReactiveFormsModule, MatFormField, MatLabel, MatHint, MatSelect, MatSelectTrigger, MatOption, MatOptgroup, TranslatePipe, MoneyPipe],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SourceField), multi: true }],
  template: `
    <mat-form-field>
      <mat-label>{{ label() }}</mat-label>
      <mat-select [formControl]="ctrl" (closed)="touched()">
        <mat-select-trigger>
          @if (selected(); as s) { {{ s.text }} · {{ s.balance | money }} }
        </mat-select-trigger>
        @if (noneLabel()) { <mat-option value="">{{ noneLabel() }}</mat-option> }
        @for (g of groups(); track g.id) {
          <mat-optgroup [label]="g.name">
            @for (o of g.options; track o.value) {
              <mat-option [value]="o.value" [disabled]="o.disabled">
                @if (o.pocket) { {{ o.icon }} {{ o.name }} } @else { {{ 'pocket.available' | translate }} }
                · {{ o.balance | money }}@if (o.disabled) { · {{ 'tx.noBalanceShort' | translate }} }
              </mat-option>
            }
          </mat-optgroup>
        }
      </mat-select>
      @if (hint()) { <mat-hint [class.bad]="hintBad()">{{ hint() }}</mat-hint> }
    </mat-form-field>
  `,
  styles: `:host { display: block; } .bad { color: var(--expense); }`,
})
export class SourceField implements ControlValueAccessor {
  readonly accounts = input.required<Account[]>();
  readonly label = input('');
  /** Mostrar los bolsillos de cada cuenta (para gastos y pagos); false = solo cuentas. */
  readonly includePockets = input(true, { transform: booleanAttribute });
  /** Deshabilita las opciones sin plata (para cuando la plata sale de ahí). */
  readonly disableEmpty = input(false, { transform: booleanAttribute });
  /** Si se indica, agrega una opción vacía con este texto (ej. "No descontar de ninguna cuenta"). */
  readonly noneLabel = input('');
  readonly hint = input('');
  readonly hintBad = input(false, { transform: booleanAttribute });

  protected readonly ctrl = new FormControl('', { nonNullable: true });
  private readonly value = signal('');
  private onChange: (v: string) => void = () => {};
  protected touched: () => void = () => {};

  /** Opciones por cuenta: primero su disponible y luego sus bolsillos (en una sola lista para conservar el orden). */
  protected readonly groups = computed(() =>
    this.accounts().map((a) => ({
      id: a._id,
      name: a.name,
      options: [
        { value: `a:${a._id}`, pocket: false, icon: '', name: a.name, balance: a.balance, disabled: this.disableEmpty() && a.balance <= 0 },
        ...(this.includePockets()
          ? a.pockets.map((p) => ({ value: `p:${p._id}`, pocket: true, icon: p.icon || '👛', name: p.name, balance: p.balance, disabled: this.disableEmpty() && p.balance <= 0 }))
          : []),
      ],
    })),
  );

  /** Texto y saldo de la opción elegida (cuenta o bolsillo). */
  protected readonly selected = computed(() => {
    const v = this.value();
    const src = parseSource(v, this.accounts());
    if (!src) return null;
    const acc = this.accounts().find((a) => a._id === src.accountId)!;
    if (src.pocketId) {
      const p = acc.pockets.find((x) => x._id === src.pocketId)!;
      return { text: `${p.icon || '👛'} ${p.name} · ${acc.name}`, balance: p.balance };
    }
    return { text: acc.name, balance: acc.balance };
  });

  constructor() {
    this.ctrl.valueChanges.subscribe((v) => { this.value.set(v); this.onChange(v); });
  }

  writeValue(v: string | null): void { this.ctrl.setValue(v ?? '', { emitEvent: false }); this.value.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void) { this.onChange = fn; }
  registerOnTouched(fn: () => void) { this.touched = fn; }
  setDisabledState(d: boolean) { if (d) this.ctrl.disable({ emitEvent: false }); else this.ctrl.enable({ emitEvent: false }); }
}

