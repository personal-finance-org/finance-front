import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { dateToIso, FREQUENCIES, LocalDatePipe, MoneyPipe, toDateInput, todayStr } from '../core/format';
import { Account, Category, Frequency, Recurring } from '../core/models';
import { accountSource, parseSource, pocketSource } from '../core/source';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { confirm } from '../shared/confirm-dialog';
import { DateField } from '../shared/date-field';
import { MoneyInput } from '../shared/money-input';
import { SourceField } from '../shared/source-field';

@Component({
  selector: 'app-recurring-dialog',
  imports: [DateField, MoneyInput, SourceField, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatPrefix, MatInput, MatSelect, MatOption, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data ? 'rec.editTitle' : 'rec.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form-grid" id="recform" (ngSubmit)="save()">
        <mat-form-field class="full"><mat-label>{{ 'rec.name' | translate }}</mat-label><input matInput formControlName="name" [placeholder]="'rec.namePlaceholder' | translate" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'rec.amount' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="amount" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'rec.frequency' | translate }}</mat-label>
          <mat-select formControlName="frequency">@for (f of freqs; track f) { <mat-option [value]="f">{{ 'frequency.' + f | translate }}</mat-option> }</mat-select></mat-form-field>
        <app-date-field [label]="'rec.nextPayment' | translate" formControlName="nextDueDate" />
        <mat-form-field><mat-label>{{ 'rec.remindDays' | translate }}</mat-label><input matInput type="number" min="0" max="30" formControlName="reminderDaysBefore" /></mat-form-field>
        <app-source-field formControlName="source" [accounts]="accounts()" [label]="'rec.payFrom' | translate" />
        <mat-form-field><mat-label>{{ 'tx.category' | translate }}</mat-label>
          <mat-select formControlName="categoryId">@for (c of categories(); track c._id) { <mat-option [value]="c._id">{{ c.icon }} {{ c.name }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field class="full"><mat-label>{{ 'tx.notes' | translate }}</mat-label><input matInput formControlName="notes" /></mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="recform">{{ 'common.save' | translate }}</button>
    </mat-dialog-actions>
  `,
})
export class RecurringDialog {
  protected readonly ref = inject(MatDialogRef<RecurringDialog, boolean>);
  protected readonly data = inject<Recurring | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly freqs = FREQUENCIES;
  protected readonly accounts = signal<Account[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly form = this.fb.group({
    name: [this.data?.name ?? '', Validators.required],
    amount: [this.data?.amount ?? (null as number | null), [Validators.required, Validators.min(0.01)]],
    frequency: [(this.data?.frequency ?? 'monthly') as Frequency],
    nextDueDate: [this.data ? toDateInput(this.data.nextDueDate) : todayStr(), Validators.required],
    reminderDaysBefore: [this.data?.reminderDaysBefore ?? 3],
    source: [this.data ? (this.data.pocketId ? pocketSource(this.data.pocketId._id) : accountSource(this.data.accountId._id)) : '', Validators.required],
    categoryId: [this.data?.categoryId._id ?? '', Validators.required],
    notes: [this.data?.notes ?? ''],
  });

  constructor() {
    Promise.all([this.api.accounts(), this.api.categories('expense')]).then(([a, c]) => {
      this.accounts.set(a.accounts); this.categories.set(c);
      if (!this.data && a.accounts[0]) this.form.patchValue({ source: accountSource(a.accounts[0]._id) });
    });
  }

  protected async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const src = parseSource(v.source, this.accounts());
    if (!src) return;
    const { source: _s, ...rest } = v;
    // pocketId: null quita el bolsillo habitual (al editar)
    const body = { ...rest, accountId: src.accountId, pocketId: src.pocketId ?? null, amount: Number(v.amount), nextDueDate: dateToIso(v.nextDueDate), reminderDaysBefore: Number(v.reminderDaysBefore), notes: v.notes || undefined };
    const ok = await this.notify.attempt(() => (this.data ? this.api.updateRecurring(this.data._id, body) : this.api.createRecurring(body)),
      this.data ? 'rec.updated' : 'rec.created');
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-pay-recurring-dialog',
  imports: [DateField, MoneyInput, SourceField, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatPrefix, MatInput, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ 'rec.payTitle' | translate: { name: item.name } }}</h2>
    <mat-dialog-content>
      <p class="muted">{{ 'rec.payHelp' | translate }}</p>
      <form [formGroup]="form" id="payform" (ngSubmit)="pay()" class="f">
        <mat-form-field><mat-label>{{ 'rec.payAmount' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="amount" /></mat-form-field>
        <app-source-field formControlName="source" [accounts]="accounts()" [label]="'rec.payAccount' | translate" disableEmpty />
        <app-date-field [label]="'tx.date' | translate" formControlName="date" />
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="payform">{{ 'rec.registerPayment' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `.f { display: flex; flex-direction: column; gap: 18px; margin-top: 8px; }`,
})
export class PayRecurringDialog {
  protected readonly ref = inject(MatDialogRef<PayRecurringDialog, boolean>);
  protected readonly item = inject<Recurring>(MAT_DIALOG_DATA);
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly accounts = signal<Account[]>([]);
  protected readonly form = this.fb.group({
    amount: [this.item.amount as number | null, Validators.required],
    source: [this.item.pocketId ? pocketSource(this.item.pocketId._id) : accountSource(this.item.accountId._id)],
    date: [todayStr()],
  });
  constructor() { this.api.accounts().then((a) => this.accounts.set(a.accounts)); }

  protected async pay() {
    const v = this.form.getRawValue();
    const src = parseSource(v.source, this.accounts());
    const ok = await this.notify.attempt(() => this.api.payRecurring(this.item._id, { amount: Number(v.amount), accountId: src?.accountId, pocketId: src?.pocketId, date: dateToIso(v.date) }), 'rec.paid');
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-recurring',
  imports: [LocalDatePipe, MoneyPipe, MatIcon, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'rec.title' | translate }}</h1><p>{{ 'rec.subtitle' | translate }}</p></div>
        <button matButton="filled" (click)="open()"><mat-icon>add</mat-icon> {{ 'common.new' | translate }}</button>
      </div>

      <section class="card summary"><mat-icon>event_repeat</mat-icon>
        <div><span class="muted">{{ 'rec.monthlyCost' | translate }}</span><strong class="num">{{ monthlyTotal() | money }}</strong></div></section>

      <div class="grid cols-3">
        @for (r of items(); track r._id) {
          <article class="card item" [class.paused]="!r.active">
            <header>
              <div class="t"><b>{{ r.name }}</b><span class="muted">{{ r.categoryId.icon }} {{ r.categoryId.name }} · {{ 'frequency.' + r.frequency | translate }}</span></div>
              <button matIconButton [matMenuTriggerFor]="m" [attr.aria-label]="'common.actions' | translate"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #m="matMenu">
                <button mat-menu-item (click)="open(r)"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</button>
                <button mat-menu-item (click)="toggle(r)"><mat-icon>{{ r.active ? 'pause' : 'play_arrow' }}</mat-icon> {{ (r.active ? 'rec.pause' : 'rec.resume') | translate }}</button>
                <button mat-menu-item (click)="remove(r)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
              </mat-menu>
            </header>
            <strong class="amt num">{{ r.amount | money }}</strong>
            <div class="due">
              <span class="chip" [class.bad]="r.status === 'overdue'" [class.warn]="r.status === 'due_soon'" [class.ok]="r.status === 'ok'">{{ 'recStatus.' + r.status | translate }}</span>
              <span class="muted">{{ r.nextDueDate | ldate: 'd MMM y' }} · {{ 'rec.from' | translate }} @if (r.pocketId) { {{ r.pocketId.icon || '👛' }} {{ r.pocketId.name }} · }{{ r.accountId.name }}</span>
            </div>
            <button matButton="tonal" [disabled]="!r.active" (click)="pay(r)"><mat-icon>check_circle</mat-icon> {{ 'rec.registerPayment' | translate }}</button>
          </article>
        } @empty { <div class="card empty"><mat-icon>event_repeat</mat-icon><p>{{ 'rec.empty' | translate }}</p></div> }
      </div>
    </div>
  `,
  styles: `
    .summary { display: flex; align-items: center; gap: 16px; mat-icon { font-size: 36px; width: 36px; height: 36px; color: var(--mat-sys-primary); } div { display: flex; flex-direction: column; gap: 6px; } strong { font-size: 30px; letter-spacing: -.02em; } }
    .item { display: flex; flex-direction: column; gap: 8px; } .item.paused { opacity: .55; } header { display: flex; align-items: flex-start; gap: 8px; } .t { flex: 1; display: flex; flex-direction: column; gap: 4px; font-size: 13px; } .t b { font-size: 16px; }
    .amt { font-size: 26px; letter-spacing: -.02em; } .due { display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-size: 13px; }
  `,
})
export class RecurringPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly refresh = inject(Refresh);
  protected readonly items = signal<Recurring[]>([]);
  protected readonly monthlyTotal = signal(0);

  constructor() { effect(() => { this.refresh.version(); untracked(() => this.load()); }); }

  private async load() { const r = await this.api.recurring(); this.items.set(r.items); this.monthlyTotal.set(r.monthlyTotal); }

  protected open(r?: Recurring) { this.dialog.open(RecurringDialog, { data: r ?? null }).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }
  protected pay(r: Recurring) { this.dialog.open(PayRecurringDialog, { data: r }).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }
  protected async toggle(r: Recurring) { if (await this.notify.attempt(() => this.api.updateRecurring(r._id, { active: !r.active }))) this.refresh.bump(); }
  protected async remove(r: Recurring) {
    if (!(await confirm(this.dialog, { title: 'rec.deleteTitle', message: 'rec.deleteMessage', params: { name: r.name }, confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteRecurring(r._id), 'rec.deleted')) this.refresh.bump();
  }
}
