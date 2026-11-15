import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatButtonToggle, MatButtonToggleGroup } from '@angular/material/button-toggle';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel, MatPrefix, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { DEBT_ICONS, DEBT_TYPES, LocalDatePipe, MoneyPipe } from '../core/format';
import { Debt, DebtsResponse, DebtType } from '../core/models';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { MoneyInput } from '../shared/money-input';

@Component({
  selector: 'app-debt-dialog',
  imports: [MoneyInput, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatPrefix, MatSuffix, MatInput, MatSelect, MatOption, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data ? 'debt.editTitle' : 'debt.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid" id="debtform" (ngSubmit)="save()">
        <mat-form-field class="full"><mat-label>{{ 'debt.name' | translate }}</mat-label><input matInput formControlName="name" [placeholder]="'debt.namePlaceholder' | translate" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'debt.whereIs' | translate }}</mat-label><input matInput formControlName="creditor" [placeholder]="'debt.wherePlaceholder' | translate" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'debt.reference' | translate }}</mat-label><input matInput formControlName="reference" placeholder="**** 4421" /></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'debt.type' | translate }}</mat-label>
          <mat-select formControlName="type">@for (t of types; track t) { <mat-option [value]="t">{{ 'debtType.' + t | translate }}</mat-option> }</mat-select></mat-form-field>
        @if (!data) {
          <mat-form-field><mat-label>{{ 'debt.original' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="originalAmount" /></mat-form-field>
          <mat-form-field><mat-label>{{ 'debt.oweToday' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="currentBalance" />
            <mat-hint>{{ 'debt.emptyHint' | translate }}</mat-hint></mat-form-field>
        }
        <mat-form-field><mat-label>{{ 'debt.minimumPayment' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="minimumPayment" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'debt.dueDay' | translate }}</mat-label><input matInput type="number" min="1" max="31" formControlName="paymentDueDay" /><mat-hint>{{ 'debt.dueDayHint' | translate }}</mat-hint></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'debt.interest' | translate }}</mat-label><input matInput type="number" step="any" min="0" formControlName="interestRateAnnual" /><span matTextSuffix>%</span></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'tx.notes' | translate }}</mat-label><input matInput formControlName="notes" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="debtform">{{ 'common.save' | translate }}</button>
    </mat-dialog-actions>
  `,
})
export class DebtDialog {
  protected readonly ref = inject(MatDialogRef<DebtDialog, boolean>);
  protected readonly data = inject<Debt | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly types = DEBT_TYPES;
  protected readonly form = this.fb.group({
    name: [this.data?.name ?? '', Validators.required],
    creditor: [this.data?.creditor ?? '', Validators.required],
    reference: [this.data?.reference ?? ''],
    type: [(this.data?.type ?? 'credit_card') as DebtType],
    originalAmount: [null as number | null, this.data ? [] : [Validators.required, Validators.min(0.01)]],
    currentBalance: [null as number | null],
    minimumPayment: [(this.data?.minimumPayment ?? 0) as number | null],
    paymentDueDay: [this.data?.paymentDueDay ?? (null as number | null)],
    interestRateAnnual: [this.data?.interestRateAnnual ?? 0],
    notes: [this.data?.notes ?? ''],
  });

  protected async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const common = {
      name: v.name, creditor: v.creditor, reference: v.reference || undefined, type: v.type, notes: v.notes || undefined,
      minimumPayment: Number(v.minimumPayment || 0), interestRateAnnual: Number(v.interestRateAnnual || 0),
      paymentDueDay: v.paymentDueDay ? Number(v.paymentDueDay) : undefined,
    };
    const ok = await this.notify.attempt(() => this.data
      ? this.api.updateDebt(this.data._id, common)
      : this.api.createDebt({ ...common, originalAmount: Number(v.originalAmount), currentBalance: v.currentBalance != null ? Number(v.currentBalance) : undefined }),
    this.data ? 'debt.updated' : 'debt.created');
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-debts',
  imports: [LocalDatePipe, RouterLink, MoneyPipe, MatIcon, MatButton, MatButtonToggleGroup, MatButtonToggle, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'debt.title' | translate }}</h1><p>{{ 'debt.subtitle' | translate }}</p></div>
        <button matButton="filled" (click)="open()"><mat-icon>add</mat-icon> {{ 'debt.new' | translate }}</button>
      </div>

      @if (data(); as d) {
        <div class="grid cols-3">
          <div class="card k"><span class="muted">{{ 'debt.totalOwed' | translate }}</span><b class="num expense">{{ d.summary.totalOwed | money }}</b><small class="muted">{{ 'debt.activeCount' | translate: { count: d.summary.activeDebts } }}</small></div>
          <div class="card k"><span class="muted">{{ 'debt.sumMinimums' | translate }}</span><b class="num">{{ d.summary.totalMinimumPayments | money }}</b><small class="muted">{{ 'debt.perMonth' | translate }}</small></div>
          <div class="card k"><span class="muted">{{ 'debt.pendingMinimums' | translate }}</span>
            <b class="num" [class.income]="d.summary.minimumStillPendingThisMonth === 0">{{ d.summary.minimumStillPendingThisMonth | money }}</b>
            <small class="muted">{{ (d.summary.minimumStillPendingThisMonth === 0 ? 'debt.allUpToDate' : 'debt.stillToPay') | translate }}</small></div>
        </div>
      }

      <mat-button-toggle-group [value]="status()" (change)="status.set($event.value); load()" hideSingleSelectionIndicator [attr.aria-label]="'debt.filter' | translate">
        <mat-button-toggle value="active">{{ 'debt.filterActive' | translate }}</mat-button-toggle><mat-button-toggle value="paid">{{ 'debt.filterPaid' | translate }}</mat-button-toggle><mat-button-toggle value="">{{ 'common.allF' | translate }}</mat-button-toggle>
      </mat-button-toggle-group>

      <div class="grid cols-3">
        @for (x of data()?.items ?? []; track x._id) {
          <a class="card debt" [routerLink]="['/deudas', x._id]">
            <header>
              <span class="ico"><mat-icon>{{ icons[x.type] }}</mat-icon></span>
              <div class="t"><b>{{ x.name }}</b><span class="muted">{{ x.creditor }}@if (x.reference) { · {{ x.reference }} }</span></div>
              @if (x.status === 'paid') { <span class="chip ok">{{ 'debt.paidChip' | translate }}</span> }
            </header>
            <div class="bal"><strong class="num">{{ x.currentBalance | money }}</strong><span class="muted">{{ 'cat.of' | translate }} {{ x.originalAmount | money }}</span></div>
            <div class="progress-track"><span [style.width.%]="x.progressPercent"></span></div>
            <div class="foot muted"><span>{{ 'debt.paidPct' | translate: { pct: x.progressPercent } }}</span>
              @if (x.status === 'active' && x.minimumPayment) {
                <span class="chip" [class.ok]="x.minimumPaidThisMonth" [class.warn]="!x.minimumPaidThisMonth">@if (x.minimumPaidThisMonth) { {{ 'debt.minPaid' | translate }} } @else { {{ 'debt.minimumShort' | translate }} {{ x.minimumPayment | money }} }</span>
              }
            </div>
            @if (x.status === 'active' && x.nextDueDate) { <small class="muted"><mat-icon class="sm">event</mat-icon> {{ 'debt.dueOn' | translate }} {{ x.nextDueDate | ldate: 'd MMM' }}</small> }
          </a>
        } @empty { <div class="card empty"><mat-icon>celebration</mat-icon><p>{{ 'debt.empty' | translate }}</p></div> }
      </div>
    </div>
  `,
  styles: `
    .k { display: flex; flex-direction: column; gap: 8px; } .k b { font-size: 28px; letter-spacing: -.02em; }
    .debt { text-decoration: none; color: inherit; display: flex; flex-direction: column; gap: 10px; transition: transform .15s, box-shadow .15s; } .debt:hover { transform: translateY(-2px); box-shadow: var(--mat-sys-level2); }
    header { display: flex; gap: 12px; align-items: center; } .t { flex: 1; display: flex; flex-direction: column; font-size: 13px; min-width: 0; } .t b { font-size: 16px; }
    .ico { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--expense-bg); color: var(--expense); }
    .bal { display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap; } .bal strong { font-size: 26px; letter-spacing: -.02em; }
    .foot { display: flex; justify-content: space-between; align-items: center; font-size: 13px; } .sm { font-size: 16px; width: 16px; height: 16px; vertical-align: -3px; }
  `,
})
export class DebtsPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly refresh = inject(Refresh);
  protected readonly icons = DEBT_ICONS;
  protected readonly data = signal<DebtsResponse | null>(null);
  protected readonly status = signal('active');

  constructor() { effect(() => { this.refresh.version(); untracked(() => this.load()); }); }

  protected async load() { this.data.set(await this.api.debts(this.status() || undefined)); }
  protected open() { this.dialog.open(DebtDialog).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }
}
