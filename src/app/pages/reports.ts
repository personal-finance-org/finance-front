import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { currentMonth, MoneyPipe, monthName, shiftMonth, shortMonth } from '../core/format';
import { I18n } from '../core/i18n';
import { HistoryReport, MonthlyReport } from '../core/models';
import { Refresh } from '../core/refresh';
import { Bars, Donut } from '../shared/charts';

@Component({
  selector: 'app-reports',
  imports: [MoneyPipe, MatIcon, MatIconButton, Donut, Bars, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'rep.title' | translate }}</h1><p>{{ 'rep.subtitle' | translate }}</p></div>
        <div class="picker">
          <button matIconButton (click)="move(-1)" [attr.aria-label]="'rep.prevMonth' | translate"><mat-icon>chevron_left</mat-icon></button>
          <strong>{{ label() }}</strong>
          <button matIconButton (click)="move(1)" [disabled]="month() >= current" [attr.aria-label]="'rep.nextMonth' | translate"><mat-icon>chevron_right</mat-icon></button>
        </div>
      </div>

      @if (m(); as r) {
        <div class="grid cols-4">
          <div class="card k"><span class="muted">{{ 'common.income' | translate }}</span><b class="num income">{{ r.income | money }}</b></div>
          <div class="card k"><span class="muted">{{ 'common.expenses' | translate }}</span><b class="num expense">{{ r.expense | money }}</b>
            @if (r.previousMonth.expenseChangePercent !== null) {
              <span class="chip" [class.ok]="r.previousMonth.expenseChangePercent <= 0" [class.bad]="r.previousMonth.expenseChangePercent > 0">
                {{ r.previousMonth.expenseChangePercent > 0 ? '▲' : '▼' }} {{ 'rep.vsPrev' | translate: { pct: abs(r.previousMonth.expenseChangePercent) } }}</span>
            }</div>
          <div class="card k"><span class="muted">{{ 'rep.balance' | translate }}</span><b class="num" [class.income]="r.net >= 0" [class.expense]="r.net < 0">{{ r.net | money }}</b></div>
          <div class="card k"><span class="muted">{{ 'dash.savingsRate' | translate }}</span><b class="num">{{ r.savingsRatePercent === null ? '—' : r.savingsRatePercent + '%' }}</b></div>
        </div>

        <section class="card">
          <h2><mat-icon>bar_chart</mat-icon> {{ 'rep.daily' | translate }}</h2>
          @if (r.daily.length) { <app-bars [points]="dailyPoints()" /> } @else { <div class="empty"><mat-icon>insights</mat-icon><p>{{ 'rep.noMovements' | translate: { month: label() } }}</p></div> }
        </section>

        <div class="grid cols-2">
          <section class="card"><h2><mat-icon>donut_large</mat-icon> {{ 'rep.expensesByCategory' | translate }}</h2>
            @if (r.expenseByCategory.length) { <app-donut [slices]="expenseSlices()" [centerLabel]="'common.expenses' | translate" /> } @else { <p class="muted">{{ 'rep.noExpenses' | translate }}</p> }</section>
          <section class="card"><h2><mat-icon>south_west</mat-icon> {{ 'rep.incomeByCategory' | translate }}</h2>
            @if (r.incomeByCategory.length) { <app-donut [slices]="incomeSlices()" [centerLabel]="'common.income' | translate" /> } @else { <p class="muted">{{ 'rep.noIncome' | translate }}</p> }</section>

          <section class="card"><h2><mat-icon>category</mat-icon> {{ 'rep.byKind' | translate }}</h2>
            @for (k of r.expenseByKind; track k.kind) {
              <div class="row"><span>{{ 'kind.' + k.kind | translate }} <small class="muted">({{ k.count }})</small></span><b class="num">{{ k.total | money }}</b></div>
            } @empty { <p class="muted">{{ 'rep.noExpenses' | translate }}</p> }
          </section>

          <section class="card"><h2><mat-icon>account_balance_wallet</mat-icon> {{ 'rep.byAccount' | translate }}</h2>
            @for (a of r.byAccount; track a.accountId) {
              <div class="row"><span>{{ a.name }}</span><span class="num"><span class="income">+{{ a.income | money }}</span> · <span class="expense">−{{ a.expense | money }}</span></span></div>
            } @empty { <p class="muted">{{ 'rep.noActivity' | translate }}</p> }
          </section>
        </div>

        @if (r.budgets.length) {
          <section class="card">
            <h2><mat-icon>speed</mat-icon> {{ 'rep.budgets' | translate }}</h2>
            @for (b of r.budgets; track b.categoryId) {
              <div class="budget">
                <div class="row"><span>{{ b.name }}</span><span class="num" [class.expense]="b.exceeded">{{ b.spent | money }} / {{ b.budget | money }} · {{ b.percentUsed }}%</span></div>
                <div class="progress-track"><span [style.width.%]="min100(b.percentUsed)" [style.background]="b.exceeded ? 'var(--expense)' : b.percentUsed > 80 ? 'var(--warn)' : null"></span></div>
              </div>
            }
          </section>
        }
      }

      @if (h(); as h) {
        <section class="card">
          <h2><mat-icon>timeline</mat-icon> {{ 'rep.history' | translate }}</h2>
          <app-bars [points]="historyPoints()" />
          <div class="avg muted">{{ 'rep.avgMonthly' | translate }}: <b class="income num">{{ h.averages.income | money }}</b> {{ 'rep.incomeLower' | translate }} · <b class="expense num">{{ h.averages.expense | money }}</b> {{ 'rep.expensesLower' | translate }}</div>
          <div class="hist" role="table">
            <div class="hr head" role="row"><span>{{ 'rep.month' | translate }}</span><span>{{ 'common.income' | translate }}</span><span>{{ 'common.expenses' | translate }}</span><span>{{ 'rep.balance' | translate }}</span></div>
            @for (s of reversed(h); track s.month) {
              <div class="hr" role="row">
                <span class="m">{{ name(s.month) }}</span>
                <span class="num income">{{ s.income | money }}</span>
                <span class="num expense">{{ s.expense | money }}</span>
                <b class="num" [class.income]="s.net >= 0" [class.expense]="s.net < 0">{{ s.net | money }}</b>
              </div>
            }
          </div>
        </section>
      }
    </div>
  `,
  styles: `
    .picker { display: flex; align-items: center; gap: 4px; background: var(--mat-sys-surface-container); border-radius: 99px; padding: 2px 6px; strong { min-width: 130px; text-align: center; } }
    .k { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; } .k b { font-size: 26px; letter-spacing: -.02em; }
    .row { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); flex-wrap: wrap; }
    .budget { margin-bottom: 12px; .row { border: 0; padding: 4px 0; } }
    .avg { margin: 18px 0 8px; font-size: 13px; text-align: center; }
    .hist { margin-top: 12px; font-size: 14px; }
    .hr { display: grid; grid-template-columns: 1.4fr 1fr 1fr 1fr; gap: 12px; align-items: center; padding: 12px 8px; border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .hr > :nth-child(n+2) { text-align: right; } .hr:not(.head):hover { background: var(--mat-sys-surface-container); }
    .hr.head { font: var(--mat-sys-label-medium); color: var(--mat-sys-on-surface-variant); text-transform: uppercase; letter-spacing: .04em; padding-top: 4px; }
    @media (max-width: 600px) { .hr { grid-template-columns: 1.2fr 1fr 1fr 1fr; gap: 6px; font-size: 12px; padding: 10px 2px; } .hr .m { font-size: 12px; } }
  `,
})
export class ReportsPage {
  private readonly api = inject(Api);
  private readonly refresh = inject(Refresh);
  private readonly i18n = inject(I18n);
  protected readonly current = currentMonth();
  protected readonly month = signal(this.current);
  protected readonly m = signal<MonthlyReport | null>(null);
  protected readonly h = signal<HistoryReport | null>(null);
  protected readonly loading = signal(false);

  protected readonly label = computed(() => monthName(this.month(), this.i18n.locale()));
  protected readonly name = (m: string) => monthName(m, this.i18n.locale());
  protected readonly abs = Math.abs;
  protected readonly min100 = (n: number) => Math.min(n, 100);
  protected readonly reversed = (h: HistoryReport) => [...h.series].reverse();
  protected readonly dailyPoints = computed(() => (this.m()?.daily ?? []).map((d) => ({ label: d.date.slice(8), income: d.income, expense: d.expense })));
  protected readonly historyPoints = computed(() => (this.h()?.series ?? []).map((s, i) => {
    const [y, mo] = s.month.split('-').map(Number);
    return { label: shortMonth(y, mo, this.i18n.locale()), sub: i === 0 || mo === 1 ? String(y) : undefined, income: s.income, expense: s.expense };
  }));
  protected readonly expenseSlices = computed(() => (this.m()?.expenseByCategory ?? []).map((c) => ({ label: c.name, value: c.total, icon: c.icon })));
  protected readonly incomeSlices = computed(() => (this.m()?.incomeByCategory ?? []).map((c) => ({ label: c.name, value: c.total, icon: c.icon })));

  constructor() { effect(() => { this.refresh.version(); this.month(); untracked(() => this.load()); }); }

  protected move(delta: number) { this.month.set(shiftMonth(this.month(), delta)); }

  private async load() {
    this.loading.set(true);
    try {
      const [m, h] = await Promise.all([this.api.monthly(this.month()), this.api.history(12)]);
      this.m.set(m); this.h.set(h);
    } finally { this.loading.set(false); }
  }
}
