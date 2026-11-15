import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatError, MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { LocalDatePipe, MoneyPipe } from '../core/format';
import { Account, Pocket, PocketMovement } from '../core/models';
import { Notify } from '../core/notify';
import { MoneyInput } from '../shared/money-input';

// ---------------------------------------------------------------- crear / editar bolsillo
export interface PocketDialogData { pocket?: Pocket; accountId?: string; accounts: Account[]; }

@Component({
  selector: 'app-pocket-dialog',
  imports: [MoneyInput, ReactiveFormsModule, MoneyPipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatError, MatPrefix, MatInput, MatSelect, MatOption, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data.pocket ? 'pocket.editTitle' : 'pocket.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="pocketform" (ngSubmit)="save()">
        @if (!data.pocket) {
          <mat-form-field>
            <mat-label>{{ 'pocket.account' | translate }}</mat-label>
            <mat-select formControlName="accountId">
              @for (a of data.accounts; track a._id) { <mat-option [value]="a._id">{{ a.name }} · {{ a.balance | money }}</mat-option> }
            </mat-select>
            <mat-error>{{ 'pocket.pickAccount' | translate }}</mat-error>
          </mat-form-field>
        }
        <mat-form-field><mat-label>{{ 'pocket.name' | translate }}</mat-label><input matInput formControlName="name" [placeholder]="'pocket.namePlaceholder' | translate" /></mat-form-field>
        <div class="row">
          <mat-form-field class="em"><mat-label>{{ 'pocket.icon' | translate }}</mat-label><input matInput formControlName="icon" maxlength="4" placeholder="💡" /></mat-form-field>
          <mat-form-field><mat-label>{{ 'pocket.goal' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="goal" /></mat-form-field>
        </div>
        @if (!data.pocket) {
          <mat-form-field>
            <mat-label>{{ 'pocket.initial' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span>
            <input matInput appMoney formControlName="amount" />
            @if (tooMuch()) { <mat-hint class="bad">{{ 'pocket.exceeds' | translate }} ({{ available() | money }})</mat-hint> }
            @else { <mat-hint>{{ 'pocket.initialHint' | translate }}: {{ available() | money }}</mat-hint> }
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="pocketform" [disabled]="tooMuch()">{{ 'common.save' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `form { display: flex; flex-direction: column; gap: 18px; } .row { display: flex; gap: 12px; } .row .em { flex: 0 0 120px; } .bad { color: var(--expense); }`,
})
export class PocketDialog {
  protected readonly ref = inject(MatDialogRef<PocketDialog, boolean>);
  protected readonly data = inject<PocketDialogData>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly form = this.fb.group({
    accountId: [this.data.accountId ?? this.data.accounts[0]?._id ?? '', this.data.pocket ? [] : [Validators.required]],
    name: [this.data.pocket?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    icon: [this.data.pocket?.icon ?? ''],
    goal: [(this.data.pocket?.goal ?? null) as number | null],
    amount: [null as number | null],
  });
  private readonly accountId = toSignal(this.form.controls.accountId.valueChanges, { initialValue: this.form.controls.accountId.value });
  private readonly amount = toSignal(this.form.controls.amount.valueChanges, { initialValue: null as number | null });
  protected readonly available = computed(() => this.data.accounts.find((a) => a._id === this.accountId())?.balance ?? 0);
  protected readonly tooMuch = computed(() => Number(this.amount() ?? 0) > this.available());

  protected async save() {
    if (this.form.invalid || this.tooMuch()) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const base = { name: v.name, icon: v.icon || undefined };
    const ok = await this.notify.attempt(() => this.data.pocket
      ? this.api.updatePocket(this.data.pocket._id, { ...base, goal: v.goal ? Number(v.goal) : 0 })
      : this.api.createPocket({ ...base, accountId: v.accountId, goal: v.goal ? Number(v.goal) : undefined, amount: v.amount ? Number(v.amount) : undefined }),
    this.data.pocket ? 'pocket.updated' : 'pocket.created');
    if (ok) this.ref.close(true);
  }
}

// ---------------------------------------------------------------- meter / sacar plata
export interface PocketMoveData { pocket: Pocket; account: Account; mode: 'deposit' | 'withdraw'; }

@Component({
  selector: 'app-pocket-move-dialog',
  imports: [MoneyInput, ReactiveFormsModule, MoneyPipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatPrefix, MatInput, MatIcon, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (isDeposit ? 'pocket.depositTitle' : 'pocket.withdrawTitle') | translate: { name: data.pocket.name } }}</h2>
    <mat-dialog-content>
      <p class="muted help">{{ (isDeposit ? 'pocket.depositHelp' : 'pocket.withdrawHelp') | translate: { account: data.account.name } }}</p>

      <div class="balances">
        <div [class.src]="isDeposit"><span class="muted">{{ 'pocket.accountAvailable' | translate }}</span><b class="num">{{ data.account.balance | money }}</b></div>
        <mat-icon>{{ isDeposit ? 'arrow_forward' : 'arrow_back' }}</mat-icon>
        <div [class.src]="!isDeposit"><span class="muted">{{ 'pocket.inPocket' | translate }}</span><b class="num">{{ data.pocket.balance | money }}</b></div>
      </div>

      <form [formGroup]="form" id="movform" (ngSubmit)="save()">
        <mat-form-field>
          <mat-label>{{ 'pocket.amount' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span>
          <input matInput appMoney formControlName="amount" />
          @if (tooMuch()) { <mat-hint class="bad">{{ 'pocket.exceeds' | translate }} ({{ max | money }})</mat-hint> }
        </mat-form-field>
        <div class="quick"><button matButton type="button" (click)="fillAll()" [disabled]="max <= 0">{{ 'pocket.all' | translate }} ({{ max | money }})</button></div>
        <mat-form-field><mat-label>{{ 'pocket.note' | translate }}</mat-label><input matInput formControlName="note" maxlength="200" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="movform" [disabled]="saving() || tooMuch() || max <= 0">{{ (isDeposit ? 'pocket.confirmDeposit' : 'pocket.confirmWithdraw') | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    .help { margin: 0 0 16px; font-size: 13px; }
    .balances { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; padding: 12px 14px; border-radius: 14px; background: var(--mat-sys-surface-container); }
    .balances > div { flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: 13px; } .balances b { font-size: 17px; } .balances .src b { color: var(--mat-sys-primary); }
    form { display: flex; flex-direction: column; gap: 14px; } .quick { margin-top: -6px; } .bad { color: var(--expense); }
  `,
})
export class PocketMoveDialog {
  protected readonly ref = inject(MatDialogRef<PocketMoveDialog, boolean>);
  protected readonly data = inject<PocketMoveData>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly saving = signal(false);
  protected readonly isDeposit = this.data.mode === 'deposit';
  /** Lo máximo que se puede mover: lo disponible en la cuenta (meter) o lo que hay en el bolsillo (sacar). */
  protected readonly max = this.isDeposit ? this.data.account.balance : this.data.pocket.balance;

  protected readonly form = this.fb.group({ amount: [null as number | null, [Validators.required, Validators.min(0.01)]], note: [''] });
  private readonly amount = toSignal(this.form.controls.amount.valueChanges, { initialValue: null as number | null });
  protected readonly tooMuch = computed(() => Number(this.amount() ?? 0) > this.max);

  protected fillAll() { this.form.controls.amount.setValue(this.max); this.form.controls.amount.markAsDirty(); }

  protected async save() {
    if (this.form.invalid || this.tooMuch()) { this.form.markAllAsTouched(); return; }
    const { amount, note } = this.form.getRawValue();
    this.saving.set(true);
    const body = { amount: Number(amount), note: note || undefined };
    const ok = await this.notify.attempt(() => (this.isDeposit ? this.api.depositPocket(this.data.pocket._id, body) : this.api.withdrawPocket(this.data.pocket._id, body)),
      this.isDeposit ? 'pocket.deposited' : 'pocket.withdrawn');
    this.saving.set(false);
    if (ok) this.ref.close(true);
  }
}

// ---------------------------------------------------------------- historial
@Component({
  selector: 'app-pocket-history-dialog',
  imports: [LocalDatePipe, MoneyPipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIcon, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'pocket.historyTitle' | translate: { name: pocket.name } }}</h2>
    <mat-dialog-content>
      @for (m of items(); track m._id) {
        <div class="mv">
          <span class="ico" [class.out]="isOut(m)"><mat-icon>{{ isOut(m) ? 'north_east' : 'south_west' }}</mat-icon></span>
          <div class="main">
            <b>{{ 'pocket.type_' + m.type | translate }}</b>
            <span class="muted small">{{ m.date | ldate: 'd MMM y' }}@if (m.note) { · {{ m.note }} }</span>
          </div>
          <div class="amt"><b class="num" [class.income]="!isOut(m)" [class.expense]="isOut(m)">{{ isOut(m) ? '−' : '+' }}{{ m.amount | money }}</b>
            <span class="muted small num">{{ 'pocket.balanceAfter' | translate }}: {{ m.balanceAfter | money }}</span></div>
        </div>
      } @empty { <div class="empty"><mat-icon>history</mat-icon><p>{{ 'pocket.noHistory' | translate }}</p></div> }
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions"><button matButton (click)="ref.close()">{{ 'common.close' | translate }}</button></mat-dialog-actions>
  `,
  styles: `
    .mv { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-top: 1px solid var(--mat-sys-outline-variant); } .mv:first-child { border-top: 0; }
    .ico { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--income-bg); color: var(--income); flex: none; } .ico.out { background: var(--expense-bg); color: var(--expense); }
    .main { flex: 1; display: flex; flex-direction: column; gap: 2px; min-width: 0; } .amt { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; } .small { font-size: 12px; }
  `,
})
export class PocketHistoryDialog {
  protected readonly ref = inject(MatDialogRef<PocketHistoryDialog>);
  protected readonly pocket = inject<Pocket>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  protected readonly items = signal<PocketMovement[]>([]);
  /** Sale plata del bolsillo (sacarla o pagar un gasto con ella). */
  protected isOut(m: PocketMovement) { return m.type === 'withdraw' || m.type === 'spend'; }
  constructor() { this.api.pocketMovements(this.pocket._id).then((r) => this.items.set(r.data)); }
}
