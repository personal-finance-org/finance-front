import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatSuffix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatProgressBar } from '@angular/material/progress-bar';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { LocalDatePipe, MoneyPipe } from '../core/format';
import { Account, Category, Paginated, Transaction } from '../core/models';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { confirm } from '../shared/confirm-dialog';
import { DateField } from '../shared/date-field';
import { TransactionDialog } from './transaction-dialog';

@Component({
  selector: 'app-transactions',
  imports: [DateField, ReactiveFormsModule, LocalDatePipe, MoneyPipe, MatIcon, MatButton, MatIconButton, MatFormField, MatLabel, MatSuffix, MatInput, MatSelect, MatOption, MatMenu, MatMenuItem, MatMenuTrigger, MatPaginator, MatProgressBar, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'tx.title' | translate }}</h1><p>{{ 'tx.subtitle' | translate }}</p></div>
        <button matButton="filled" (click)="open()"><mat-icon>add</mat-icon> {{ 'common.new' | translate }}</button>
      </div>

      <form class="card filters" [formGroup]="filters">
        <mat-form-field class="grow"><mat-label>{{ 'tx.search' | translate }}</mat-label><input matInput formControlName="search" [placeholder]="'tx.searchPlaceholder' | translate" /><mat-icon matSuffix>search</mat-icon></mat-form-field>
        <mat-form-field><mat-label>{{ 'tx.type' | translate }}</mat-label>
          <mat-select formControlName="type"><mat-option value="">{{ 'common.allM' | translate }}</mat-option><mat-option value="expense">{{ 'common.expenses' | translate }}</mat-option><mat-option value="income">{{ 'common.income' | translate }}</mat-option><mat-option value="transfer">{{ 'tx.transfers' | translate }}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>{{ 'tx.kind' | translate }}</mat-label>
          <mat-select formControlName="kind"><mat-option value="">{{ 'common.allF' | translate }}</mat-option><mat-option value="daily">{{ 'tx.kindDaily' | translate }}</mat-option><mat-option value="recurring">{{ 'tx.kindRecurring' | translate }}</mat-option><mat-option value="debt_payment">{{ 'tx.kindDebt' | translate }}</mat-option></mat-select></mat-form-field>
        <mat-form-field><mat-label>{{ 'tx.account' | translate }}</mat-label>
          <mat-select formControlName="accountId"><mat-option value="">{{ 'common.allF' | translate }}</mat-option>@for (a of accounts(); track a._id) { <mat-option [value]="a._id">{{ a.name }}</mat-option> }</mat-select></mat-form-field>
        <mat-form-field><mat-label>{{ 'tx.category' | translate }}</mat-label>
          <mat-select formControlName="categoryId"><mat-option value="">{{ 'common.allF' | translate }}</mat-option>@for (c of categories(); track c._id) { <mat-option [value]="c._id">{{ c.icon }} {{ c.name }}</mat-option> }</mat-select></mat-form-field>
        <app-date-field [label]="'tx.from' | translate" formControlName="from" clearable />
        <app-date-field [label]="'tx.to' | translate" formControlName="to" clearable />
        <button matButton type="button" (click)="clear()"><mat-icon>filter_alt_off</mat-icon> {{ 'common.clear' | translate }}</button>
      </form>

      @if (loading()) { <mat-progress-bar mode="indeterminate" /> }

      <div class="card list">
        @for (g of groups(); track g.key) {
          <div class="day"><span>{{ g.day | ldate: 'EEEE d MMMM' }}</span><span class="num muted">{{ g.total | money }}</span></div>
          @for (t of g.items; track t._id) {
            <div class="tx">
              <span class="ico" [class]="t.type"><mat-icon>{{ icon(t) }}</mat-icon></span>
              <div class="main">
                <b>{{ t.description || t.categoryId?.name || ('tx.typeTransfer' | translate) }}</b>
                <div class="meta muted">
                  @if (t.type === 'transfer') { {{ t.accountId.name }} → {{ t.toAccountId?.name }} }
                  @else { {{ t.categoryId?.icon }} {{ t.categoryId?.name }} · {{ t.accountId.name }} }
                  @if (t.pocketId) { <span class="chip pk">{{ t.pocketId.icon || '👛' }} {{ t.pocketId.name }}</span> }
                  @if (t.kind && t.kind !== 'daily') { <span class="chip">{{ 'kind.' + t.kind | translate }}</span> }
                  @for (tag of t.tags; track tag) { <span class="chip">#{{ tag }}</span> }
                </div>
              </div>
              <b class="num amount" [class]="t.type">{{ t.type === 'expense' ? '−' : t.type === 'income' ? '+' : '' }}{{ t.amount | money }}</b>
              <button matIconButton [matMenuTriggerFor]="m" [attr.aria-label]="'common.actions' | translate"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #m="matMenu">
                <button mat-menu-item (click)="open(t)"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</button>
                <button mat-menu-item (click)="remove(t)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
              </mat-menu>
            </div>
          }
        } @empty {
          @if (!loading()) { <div class="empty"><mat-icon>search_off</mat-icon><p>{{ 'tx.noResults' | translate }}</p></div> }
        }
      </div>

      <mat-paginator [length]="page()?.meta?.total ?? 0" [pageSize]="pageSize()" [pageIndex]="pageIndex()" [pageSizeOptions]="[10, 20, 50]" (page)="onPage($event)" />
    </div>
  `,
  styles: `
    .filters { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px 14px; align-items: center; } .grow { grid-column: span 2; }
    .list { padding: 8px 16px 12px; }
    .day { display: flex; justify-content: space-between; padding: 14px 4px 6px; font: var(--mat-sys-label-large); text-transform: capitalize; color: var(--mat-sys-on-surface-variant); }
    .tx { display: flex; align-items: center; gap: 14px; padding: 10px 4px; border-top: 1px solid var(--mat-sys-outline-variant); }
    .ico { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; flex: none; }
    .ico.income { background: var(--income-bg); color: var(--income); } .ico.expense { background: var(--expense-bg); color: var(--expense); } .ico.transfer { background: var(--mat-sys-secondary-container); color: var(--transfer); }
    .main { flex: 1; min-width: 0; } .main b { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .meta { font-size: 12.5px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; margin-top: 2px; }
    .amount { font-size: 16px; white-space: nowrap; }
    @media (max-width: 600px) { .grow { grid-column: auto; } }
  `,
})
export class TransactionsPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly refresh = inject(Refresh);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly accounts = signal<Account[]>([]);
  protected readonly categories = signal<Category[]>([]);
  protected readonly page = signal<Paginated<Transaction> | null>(null);
  protected readonly loading = signal(false);
  protected readonly pageIndex = signal(0);
  protected readonly pageSize = signal(20);

  protected readonly filters = this.fb.group({ search: [''], type: [''], kind: [''], accountId: [''], categoryId: [''], from: [''], to: [''] });

  protected readonly groups = computed(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of this.page()?.data ?? []) {
      const day = new Date(t.date).toDateString();
      map.set(day, [...(map.get(day) ?? []), t]);
    }
    return [...map].map(([key, items]) => ({
      key, day: items[0].date, items,
      total: items.reduce((s, t) => s + (t.type === 'income' ? t.amount : t.type === 'expense' ? -t.amount : 0), 0),
    }));
  });

  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    Promise.all([this.api.accounts(true), this.api.categories()]).then(([a, c]) => { this.accounts.set(a.accounts); this.categories.set(c); });
    effect(() => { this.refresh.version(); untracked(() => this.load()); });
    this.filters.valueChanges.subscribe(() => {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => { this.pageIndex.set(0); this.load(); }, 300);
    });
  }

  protected icon(t: Transaction) {
    return t.type === 'income' ? 'south_west' : t.type === 'transfer' ? 'sync_alt' : t.kind === 'debt_payment' ? 'credit_score' : t.kind === 'recurring' ? 'event_repeat' : 'north_east';
  }

  protected async load() {
    const f = this.filters.getRawValue();
    this.loading.set(true);
    try {
      this.page.set(await this.api.transactions({
        ...f, type: f.type as never, kind: f.kind as never,
        from: f.from ? new Date(`${f.from}T00:00:00`).toISOString() : undefined,
        to: f.to ? new Date(`${f.to}T23:59:59`).toISOString() : undefined,
        page: this.pageIndex() + 1, limit: this.pageSize(),
      }));
    } finally { this.loading.set(false); }
  }

  protected onPage(e: PageEvent) { this.pageIndex.set(e.pageIndex); this.pageSize.set(e.pageSize); this.load(); }
  protected clear() { this.filters.reset(); }

  protected open(t?: Transaction) {
    this.dialog.open(TransactionDialog, { data: t ?? null }).afterClosed().subscribe((ok) => ok && this.refresh.bump());
  }

  protected async remove(t: Transaction) {
    if (t.kind === 'debt_payment') { this.notify.info('tx.debtPaymentNote'); return; }
    if (!(await confirm(this.dialog, { title: 'tx.deleteTitle', message: 'tx.deleteMessage', confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteTransaction(t._id), 'tx.deleted')) this.refresh.bump();
  }
}
