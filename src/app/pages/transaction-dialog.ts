import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { dateToIso, MoneyPipe, toDateInput, todayStr } from '../core/format';
import { Account, Category, Transaction, TxType } from '../core/models';
import { accountSource, parseSource, pocketSource } from '../core/source';
import { Notify } from '../core/notify';
import { DateField } from '../shared/date-field';
import { MoneyInput } from '../shared/money-input';
import { SourceField } from '../shared/source-field';

/** Crear o editar un movimiento. En edición solo se permiten campos que no alteran saldos. */
@Component({
  selector: 'app-transaction-dialog',
  imports: [DateField, MoneyInput, SourceField, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatButtonToggleGroup, MatButtonToggle, MatFormField, MatLabel, MatError, MatPrefix, MatInput, MatSelect, MatOption, MoneyPipe, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (editing ? 'tx.editTitle' : 'tx.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid" id="txform" (ngSubmit)="save()">
        <mat-button-toggle-group formControlName="type" class="full toggle" [hideSingleSelectionIndicator]="true" [disabled]="editing" [attr.aria-label]="'tx.type' | translate">
          <mat-button-toggle value="expense">{{ 'tx.typeExpense' | translate }}</mat-button-toggle>
          <mat-button-toggle value="income">{{ 'tx.typeIncome' | translate }}</mat-button-toggle>
          <mat-button-toggle value="transfer">{{ 'tx.typeTransfer' | translate }}</mat-button-toggle>
        </mat-button-toggle-group>

        <mat-form-field class="full">
          <mat-label>{{ 'tx.amount' | translate }}</mat-label>
          <span matTextPrefix>$&nbsp;</span>
          <input matInput appMoney formControlName="amount" />
        </mat-form-field>

        <app-source-field [class.full]="type() !== 'transfer'" formControlName="source" [accounts]="accounts()"
          [label]="(type() === 'income' ? 'tx.entersTo' : type() === 'transfer' ? 'tx.leavesFrom' : 'tx.paidFrom') | translate"
          [includePockets]="type() === 'expense'" [disableEmpty]="isOutflow() && !editing"
          [hint]="blockReason() ? (blockReason()! | translate) : (available() === null ? '' : (('tx.available' | translate) + ': ' + (available()! | money)))"
          [hintBad]="!!blockReason()" />

        @if (type() === 'transfer') {
          <mat-form-field>
            <mat-label>{{ 'tx.goesTo' | translate }}</mat-label>
            <mat-select formControlName="toAccountId">
              @for (a of destinations(); track a._id) { <mat-option [value]="a._id">{{ a.name }}</mat-option> }
            </mat-select>
            <mat-error>{{ 'tx.pickDest' | translate }}</mat-error>
          </mat-form-field>
        } @else {
          <mat-form-field class="full">
            <mat-label>{{ 'tx.category' | translate }}</mat-label>
            <mat-select formControlName="categoryId">
              @for (c of categories(); track c._id) { <mat-option [value]="c._id">{{ c.icon }} {{ c.name }}</mat-option> }
            </mat-select>
            <mat-error>{{ 'tx.categoryRequired' | translate }}</mat-error>
          </mat-form-field>
        }

        <app-date-field [label]="'tx.date' | translate" formControlName="date" />
        <mat-form-field><mat-label>{{ 'tx.tags' | translate }}</mat-label><input matInput formControlName="tags" [placeholder]="'tx.tagsPlaceholder' | translate" /></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'tx.description' | translate }}</mat-label><input matInput formControlName="description" maxlength="200" /></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'tx.notes' | translate }}</mat-label><textarea matInput rows="2" formControlName="notes" maxlength="500"></textarea></mat-form-field>
      </form>
      @if (editing) { <p class="muted note">{{ 'tx.editNote' | translate }}</p> }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="txform" [disabled]="saving() || !!blockReason()">{{ (saving() ? 'common.saving' : 'common.save') | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .toggle { width: 100%; } .toggle ::ng-deep .mat-button-toggle { flex: 1; }
    .note { font-size: 12px; margin: 4px 0 0; }
    .bad { color: var(--expense); }
  `,
})
export class TransactionDialog {
  protected readonly ref = inject(MatDialogRef<TransactionDialog, boolean>);
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly data = inject<Transaction | null>(MAT_DIALOG_DATA, { optional: true });
  protected readonly editing = !!this.data;

  protected readonly accounts = signal<Account[]>([]);
  private readonly allCategories = signal<Category[]>([]);
  protected readonly saving = signal(false);

  protected readonly form = this.fb.group({
    type: [(this.data?.type ?? 'expense') as TxType],
    amount: [this.data?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01)]],
    source: [this.data ? (this.data.pocketId ? pocketSource(this.data.pocketId._id) : accountSource(this.data.accountId._id)) : '', Validators.required],
    toAccountId: [this.data?.toAccountId?._id ?? ''],
    categoryId: [this.data?.categoryId?._id ?? ''],
    date: [this.data ? toDateInput(this.data.date) : todayStr(), Validators.required],
    description: [this.data?.description ?? ''],
    tags: [this.data?.tags.join(', ') ?? ''],
    notes: [this.data?.notes ?? ''],
  });

  protected readonly type = toSignal(this.form.controls.type.valueChanges, { initialValue: this.form.controls.type.value });
  private readonly source = toSignal(this.form.controls.source.valueChanges, { initialValue: this.form.controls.source.value });
  /** Origen elegido: cuenta y, si se paga desde un bolsillo, el bolsillo. */
  private readonly src = computed(() => parseSource(this.source(), this.accounts()));
  protected readonly selectedAccount = computed(() => this.accounts().find((a) => a._id === this.src()?.accountId));
  protected readonly selectedPocket = computed(() => this.selectedAccount()?.pockets.find((p) => p._id === this.src()?.pocketId));
  /** Plata que se puede usar desde el origen elegido (bolsillo o disponible de la cuenta). */
  protected readonly available = computed(() => this.selectedPocket()?.balance ?? this.selectedAccount()?.balance ?? null);
  private readonly amount = toSignal(this.form.controls.amount.valueChanges, { initialValue: this.form.controls.amount.value });
  /** Gasto o transferencia: la plata sale del origen. */
  protected readonly isOutflow = computed(() => this.type() !== 'income');
  /** Motivo (clave de traducción) por el que no se puede registrar, o null. Nunca se gasta de un origen en 0. */
  protected readonly blockReason = computed(() => {
    const a = this.selectedAccount();
    if (this.editing || !a || !this.isOutflow()) return null;
    const p = this.selectedPocket();
    const bal = p ? p.balance : a.balance;
    if (bal <= 0) return p ? 'tx.noBalancePocket' : 'tx.noBalance';
    if ((p || !a.allowNegative) && Number(this.amount() ?? 0) > bal) return 'tx.exceedsBalance';
    return null;
  });
  protected readonly categories = computed(() => this.allCategories().filter((c) => c.type === this.type()));
  protected readonly destinations = computed(() => this.accounts().filter((a) => a._id !== this.src()?.accountId));

  constructor() {
    if (this.editing) {
      this.form.controls.amount.disable(); this.form.controls.source.disable(); this.form.controls.toAccountId.disable();
    }
    this.setRequired();
    this.form.controls.type.valueChanges.subscribe(() => {
      this.form.patchValue({ categoryId: '', toAccountId: '' });
      this.setRequired();
      if (this.editing) return;
      // Un bolsillo solo sirve para gastos: al cambiar de tipo se usa su cuenta.
      const cur = this.src();
      if (cur?.pocketId && this.type() !== 'expense') this.form.patchValue({ source: accountSource(cur.accountId) });
      // Si el origen no tiene saldo y la plata sale de él, cambia a uno con saldo (si hay).
      const sel = this.selectedPocket() ?? this.selectedAccount();
      if (this.isOutflow() && sel && sel.balance <= 0) {
        const withFunds = this.accounts().find((x) => x.balance > 0);
        if (withFunds) this.form.patchValue({ source: accountSource(withFunds._id) });
      }
    });
    Promise.all([this.api.accounts(), this.api.categories()]).then(([a, c]) => {
      this.accounts.set(a.accounts);
      this.allCategories.set(c);
      if (!this.editing && !this.form.controls.source.value && a.accounts[0]) {
        // Por defecto, una cuenta de uso diario (banco, efectivo o billetera) con saldo.
        const daily = a.accounts.find((x) => ['bank', 'cash', 'wallet'].includes(x.type) && x.balance > 0)
          ?? a.accounts.find((x) => x.balance > 0) ?? a.accounts.find((x) => ['bank', 'cash', 'wallet'].includes(x.type)) ?? a.accounts[0];
        this.form.patchValue({ source: accountSource(daily._id) });
      }
    });
  }

  /** Categoría obligatoria en ingresos y gastos; bolsillo destino obligatorio en transferencias. */
  private setRequired() {
    const transfer = this.form.controls.type.value === 'transfer';
    this.form.controls.categoryId.setValidators(transfer ? [] : [Validators.required]);
    this.form.controls.toAccountId.setValidators(transfer ? [Validators.required] : []);
    this.form.controls.categoryId.updateValueAndValidity({ emitEvent: false });
    this.form.controls.toAccountId.updateValueAndValidity({ emitEvent: false });
  }

  protected async save() {
    const v = this.form.getRawValue();
    this.form.markAllAsTouched();
    if (this.form.invalid || this.blockReason()) return;
    const tags = v.tags.split(',').map((t) => t.trim()).filter(Boolean);
    this.saving.set(true);
    const ok = await this.notify.attempt(() => {
      const common = { date: dateToIso(v.date), description: v.description || undefined, notes: v.notes || undefined, tags };
      if (this.data) return this.api.updateTransaction(this.data._id, { ...common, categoryId: v.categoryId || undefined, description: v.description });
      const src = this.src()!;
      return this.api.createTransaction({
        ...common, type: v.type, amount: Number(v.amount), accountId: src.accountId, ...(src.pocketId ? { pocketId: src.pocketId } : {}),
        ...(v.type === 'transfer' ? { toAccountId: v.toAccountId } : { categoryId: v.categoryId }),
      });
    }, this.editing ? 'tx.updated' : 'tx.saved');
    this.saving.set(false);
    if (ok) this.ref.close(true);
  }
}
