import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatOption, MatSelect } from '@angular/material/select';
import { Router, RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { dateToIso, DEBT_ICONS, LocalDatePipe, MoneyPipe, todayStr } from '../core/format';
import { Account, Debt, DebtPayment } from '../core/models';
import { parseSource } from '../core/source';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { confirm } from '../shared/confirm-dialog';
import { DateField } from '../shared/date-field';
import { MoneyInput } from '../shared/money-input';
import { SourceField } from '../shared/source-field';
import { DebtDialog } from './debts';

/** Registrar uno o varios abonos. */
@Component({
  selector: 'app-payment-dialog',
  imports: [DateField, MoneyInput, SourceField, ReactiveFormsModule, MoneyPipe, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatIconButton, MatIcon, MatFormField, MatLabel, MatPrefix, MatInput, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'debt.payTitle' | translate: { name: debt.name } }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ 'debt.youOwe' | translate }} <b class="num">{{ debt.currentBalance | money }}</b>@if (debt.minimumPayment) { · {{ 'debt.minimumShort' | translate }} <b class="num">{{ debt.minimumPayment | money }}</b> }</p>
      <form [formGroup]="form" id="payform" (ngSubmit)="save()">
        <app-source-field formControlName="source" [accounts]="accounts()" [label]="'debt.fromWhere' | translate" [noneLabel]="'debt.noAccountOption' | translate"
          [hint]="'debt.accountHint' | translate" disableEmpty />

        <div formArrayName="rows" class="rows">
          @for (r of rows.controls; track r; let i = $index) {
            <div class="row" [formGroupName]="i">
              <mat-form-field class="amt"><mat-label>{{ 'debt.payment' | translate }} {{ rows.length > 1 ? i + 1 : '' }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="amount" /></mat-form-field>
              <app-date-field class="dt" [label]="'tx.date' | translate" formControlName="date" />
              @if (rows.length > 1) { <button matIconButton type="button" (click)="rows.removeAt(i)" [attr.aria-label]="'debt.removeRow' | translate"><mat-icon>close</mat-icon></button> }
            </div>
          }
        </div>

        <div class="quick">
          @if (debt.minimumPayment) { <button matButton="tonal" type="button" (click)="fill(min())">{{ 'debt.quickMin' | translate }} ({{ min() | money }})</button> }
          <button matButton="tonal" type="button" (click)="fill(debt.currentBalance)">{{ 'debt.payAll' | translate }}</button>
          <button matButton type="button" (click)="add()"><mat-icon>add</mat-icon> {{ 'debt.another' | translate }}</button>
        </div>
        <p class="muted total">{{ 'debt.totalToPay' | translate }}: <b class="num">{{ total() | money }}</b></p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="payform" [disabled]="saving()">{{ (saving() ? 'common.saving' : 'debt.register') | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `
    form { display: flex; flex-direction: column; gap: 18px; } .rows { display: flex; flex-direction: column; gap: 14px; }
    .row { display: flex; gap: 10px; align-items: center; } .amt { flex: 1.3; } .dt { flex: 1; } .quick { display: flex; gap: 8px; flex-wrap: wrap; } .total { margin: 0; text-align: right; }
  `,
})
export class PaymentDialog {
  protected readonly ref = inject(MatDialogRef<PaymentDialog, boolean>);
  protected readonly debt = inject<Debt>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly accounts = signal<Account[]>([]);
  protected readonly saving = signal(false);

  protected readonly rows = this.fb.array([this.row()]);
  protected readonly form = this.fb.group({ source: [''], rows: this.rows });
  protected readonly total = signal(0);

  constructor() {
    this.api.accounts().then((a) => this.accounts.set(a.accounts));
    this.form.valueChanges.subscribe(() => this.total.set(this.rows.getRawValue().reduce((s, r) => s + Number(r.amount || 0), 0)));
  }

  protected min() { return Math.min(this.debt.minimumPayment, this.debt.currentBalance); }
  private row(amount: number | null = null) { return this.fb.group({ amount: [amount as number | null, [Validators.required, Validators.min(0.01)]], date: [todayStr()] }); }
  protected add() { this.rows.push(this.row()); }
  protected fill(v: number) { this.rows.at(0).patchValue({ amount: v }); }

  protected async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { source, rows } = this.form.getRawValue();
    const src = parseSource(source, this.accounts());
    const payments = rows.map((r) => ({ amount: Number(r.amount), date: dateToIso(r.date), accountId: src?.accountId, pocketId: src?.pocketId }));
    this.saving.set(true);
    const ok = await this.notify.attempt(() => (payments.length === 1 ? this.api.addDebtPayment(this.debt._id, payments[0]) : this.api.addDebtPayments(this.debt._id, payments)),
      payments.length === 1 ? 'debt.paymentSaved' : 'debt.paymentsSaved', { count: payments.length });
    this.saving.set(false);
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-debt-detail',
  imports: [LocalDatePipe, RouterLink, MoneyPipe, MatIcon, MatButton, MatIconButton, TranslatePipe],
  template: `
    <div class="page">
      <a routerLink="/deudas" class="back muted"><mat-icon>arrow_back</mat-icon> {{ 'nav.debts' | translate }}</a>

      @if (debt(); as d) {
        <section class="hero">
          <div class="top">
            <span class="ico"><mat-icon>{{ icons[d.type] }}</mat-icon></span>
            <div class="t"><h1>{{ d.name }}</h1><span>{{ 'debtType.' + d.type | translate }} · {{ d.creditor }}@if (d.reference) { · {{ d.reference }} }</span></div>
            <button matIconButton (click)="edit(d)" [attr.aria-label]="'common.edit' | translate"><mat-icon>edit</mat-icon></button>
            <button matIconButton (click)="remove(d)" [attr.aria-label]="'common.delete' | translate"><mat-icon>delete</mat-icon></button>
          </div>
          <div class="amount"><span>{{ 'debt.currentBalance' | translate }}</span><strong class="num">{{ d.currentBalance | money }}</strong></div>
          <div class="bar"><span [style.width.%]="d.progressPercent"></span></div>
          <div class="foot"><span>{{ 'debt.paidPct' | translate: { pct: d.progressPercent } }} · {{ d.paidAmount | money }}</span><span>{{ 'debt.originalLabel' | translate }} {{ d.originalAmount | money }}</span></div>
        </section>

        @if (d.status === 'active') {
          <div class="actions">
            @if (d.minimumPayment) { <button matButton="filled" (click)="payMin(d)"><mat-icon>bolt</mat-icon> {{ 'debt.payMin' | translate }}</button> }
            <button matButton="tonal" (click)="pay(d)"><mat-icon>add_card</mat-icon> {{ 'debt.addPayments' | translate }}</button>
          </div>
        } @else { <div class="card done"><mat-icon>celebration</mat-icon> {{ 'debt.fullyPaid' | translate }}@if (d.paidOffAt) { {{ d.paidOffAt | ldate: 'd MMM y' }} }</div> }

        <div class="grid cols-4">
          <div class="card k"><span class="muted">{{ 'debt.minimumPayment' | translate }}</span><b class="num">{{ d.minimumPayment ? (d.minimumPayment | money) : '—' }}</b>
            @if (d.minimumPayment && d.status === 'active') { <span class="chip" [class.ok]="d.minimumPaidThisMonth" [class.warn]="!d.minimumPaidThisMonth">@if (d.minimumPaidThisMonth) { {{ 'debt.paidThisMonth' | translate }} } @else { {{ 'debt.missing' | translate }} {{ d.minimumRemainingThisMonth | money }} }</span> }</div>
          <div class="card k"><span class="muted">{{ 'debt.paidMonth' | translate }}</span><b class="num">{{ d.paidThisMonth | money }}</b></div>
          <div class="card k"><span class="muted">{{ 'debt.nextDue' | translate }}</span><b>{{ d.nextDueDate ? (d.nextDueDate | ldate: 'd MMM') : '—' }}</b>@if (d.paymentDueDay) { <span class="muted small">{{ 'debt.dayEvery' | translate: { day: d.paymentDueDay } }}</span> }</div>
          <div class="card k"><span class="muted">{{ 'debt.interestAnnual' | translate }}</span><b>{{ d.interestRateAnnual }}%</b>
            @if (d.status === 'active' && d.minimumPayment) {
              <span class="muted small">{{ d.estimatedMonthsToPayoff === null ? ('debt.neverPaid' | translate) : ('debt.monthsMin' | translate: { months: d.estimatedMonthsToPayoff }) }}</span>
            }</div>
        </div>

        <section class="card">
          <h2><mat-icon>history</mat-icon> {{ 'debt.history' | translate }}</h2>
          @for (p of payments(); track p._id) {
            <div class="pay">
              <span class="ico2"><mat-icon>south_west</mat-icon></span>
              <div class="main">
                <b class="num income">{{ p.amount | money }}</b>
                <div class="muted small">{{ p.date | ldate: 'd MMM y' }}@if (p.pocketId && p.accountId) { · {{ 'debt.fromAccount' | translate: { name: (p.pocketId.icon || '👛') + ' ' + p.pocketId.name + ' · ' + p.accountId.name } }} } @else if (p.accountId) { · {{ 'debt.fromAccount' | translate: { name: p.accountId.name } }} } @else { · {{ 'debt.noAccount' | translate }} }@if (p.note) { · {{ p.note }} }</div>
              </div>
              @if (p.coversMinimum) { <span class="chip ok">{{ 'debt.coversMin' | translate }}</span> }
              <span class="muted small num">{{ 'debt.balanceLabel' | translate }}: {{ p.balanceAfter | money }}</span>
              <button matIconButton (click)="removePayment(p)" [attr.aria-label]="'debt.deletePayment' | translate"><mat-icon>delete</mat-icon></button>
            </div>
          } @empty { <div class="empty"><mat-icon>payments</mat-icon><p>{{ 'debt.noPayments' | translate }}</p></div> }
        </section>
      }
    </div>
  `,
  styles: `
    .back { display: inline-flex; align-items: center; gap: 6px; text-decoration: none; width: fit-content; }
    .hero { border-radius: 24px; padding: 24px 26px; color: #fff0f1; display: flex; flex-direction: column; gap: 20px;
      background: radial-gradient(600px 260px at 100% 0%, #ff6b7a55, transparent 70%), linear-gradient(135deg, #4a1118, #7d1d29); }
    .top { display: flex; align-items: center; gap: 14px; } .t { flex: 1; display: flex; flex-direction: column; gap: 4px; } .t h1 { margin: 0; font: var(--mat-sys-headline-small); } .t span { opacity: .8; font-size: 13px; }
    .top button { color: #fff; } .ico { width: 48px; height: 48px; border-radius: 15px; display: grid; place-items: center; background: rgba(255,255,255,.15); }
    .amount { display: flex; flex-direction: column; gap: 8px; } .amount span { opacity: .75; font-size: 14px; } .amount strong { font-size: clamp(32px, 6vw, 46px); line-height: 1.1; letter-spacing: -.03em; }
    .bar { height: 10px; border-radius: 99px; background: rgba(255,255,255,.2); overflow: hidden; } .bar span { display: block; height: 100%; background: #7ff0c0; border-radius: 99px; transition: width .5s; }
    .foot { display: flex; justify-content: space-between; font-size: 13px; opacity: .9; flex-wrap: wrap; gap: 8px; margin-top: -6px; }
    .actions { display: flex; gap: 10px; flex-wrap: wrap; } .done { display: flex; gap: 10px; align-items: center; background: var(--income-bg); color: var(--income); font-weight: 500; }
    .k { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; } .k b { font-size: 22px; line-height: 1.2; } .small { font-size: 12px; }
    .pay { display: flex; align-items: center; gap: 14px; padding: 12px 0; border-top: 1px solid var(--mat-sys-outline-variant); flex-wrap: wrap; }
    .ico2 { width: 38px; height: 38px; border-radius: 12px; display: grid; place-items: center; background: var(--income-bg); color: var(--income); } .main { flex: 1; min-width: 160px; display: flex; flex-direction: column; gap: 2px; }
  `,
})
export class DebtDetailPage {
  readonly id = input.required<string>();
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly router = inject(Router);
  private readonly refresh = inject(Refresh);
  protected readonly icons = DEBT_ICONS;
  protected readonly debt = signal<Debt | null>(null);
  protected readonly payments = signal<DebtPayment[]>([]);

  constructor() { effect(() => { this.refresh.version(); this.id(); untracked(() => this.load()); }); }

  private async load() {
    const [d, p] = await Promise.all([this.api.debt(this.id()), this.api.debtPayments(this.id())]);
    this.debt.set(d); this.payments.set(p.data);
  }

  protected pay(d: Debt) { this.dialog.open(PaymentDialog, { data: d }).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }
  protected edit(d: Debt) { this.dialog.open(DebtDialog, { data: d }).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }

  protected payMin(d: Debt) {
    // Abre el diálogo con el mínimo ya cargado para elegir el bolsillo.
    const ref = this.dialog.open(PaymentDialog, { data: d });
    ref.componentInstance['fill'](Math.min(d.minimumPayment, d.currentBalance));
    ref.afterClosed().subscribe((ok) => ok && this.refresh.bump());
  }

  protected async removePayment(p: DebtPayment) {
    if (!(await confirm(this.dialog, { title: 'debt.deletePaymentTitle', message: 'debt.deletePaymentMessage', confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteDebtPayment(this.id(), p._id), 'debt.paymentDeleted')) this.refresh.bump();
  }

  protected async remove(d: Debt) {
    if (!(await confirm(this.dialog, { title: 'debt.deleteTitle', message: 'debt.deleteMessage', params: { name: d.name }, confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteDebt(d._id), 'debt.deleted')) { this.refresh.bump(); this.router.navigateByUrl('/deudas'); }
  }
}
