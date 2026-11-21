import { Component, effect, inject, signal, untracked } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { Auth } from '../core/auth';
import { LocalDatePipe, MoneyPipe, monthName } from '../core/format';
import { I18n } from '../core/i18n';
import { Dashboard } from '../core/models';
import { Refresh } from '../core/refresh';
import { Donut } from '../shared/charts';

@Component({
  selector: 'app-dashboard',
  imports: [MoneyPipe, LocalDatePipe, RouterLink, MatIcon, MatButton, Donut, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div>
          <h1>{{ 'dash.hello' | translate: { name: firstName() } }} 👋</h1>
          <p>{{ 'dash.subtitle' | translate: { month: monthLabel() } }}</p>
        </div>
      </div>

      @if (d(); as d) {
        <section class="hero">
          <header>
            <h2><mat-icon>account_balance</mat-icon> {{ 'dash.myAccounts' | translate }}</h2>
            <a matButton class="all" routerLink="/cuentas">{{ 'dash.viewAccounts' | translate }}</a>
          </header>

          <div class="totals">
            <div><span class="lbl">{{ 'dash.inAccounts' | translate }}</span><strong class="big num">{{ d.netWorth.available | money }}</strong></div>
            <div><span class="lbl">{{ 'pocket.inPockets' | translate }}</span><strong class="big num">{{ d.netWorth.inPockets | money }}</strong></div>
          </div>

          <div class="tiles">
            @for (a of d.netWorth.accounts; track a.id) {
              <div class="tile">
                <div class="top">
                  <span class="name">{{ a.name }}</span>
                  @if (a.inPockets > 0) { <span class="pks" [title]="'pocket.inPockets' | translate"><mat-icon>savings</mat-icon>{{ 'dash.pocketsShort' | translate }} <b class="num">{{ a.inPockets | money }}</b></span> }
                </div>
                <b class="num amt">{{ a.balance | money }}</b>
              </div>
            } @empty { <p class="empty-hero">{{ 'dash.createFirstAccount' | translate }}</p> }
          </div>
        </section>

        <div class="grid cols-4">
          <div class="card kpi"><span class="muted">{{ 'common.income' | translate }}</span><b class="num income">{{ d.month.income | money }}</b><mat-icon class="income">south_west</mat-icon></div>
          <div class="card kpi"><span class="muted">{{ 'common.expenses' | translate }}</span><b class="num expense">{{ d.month.expense | money }}</b><mat-icon class="expense">north_east</mat-icon></div>
          <div class="card kpi"><span class="muted">{{ 'dash.monthBalance' | translate }}</span><b class="num" [class.income]="d.month.net >= 0" [class.expense]="d.month.net < 0">{{ d.month.net | money }}</b><mat-icon>balance</mat-icon></div>
          <div class="card kpi"><span class="muted">{{ 'dash.savingsRate' | translate }}</span>
            <b class="num">{{ d.month.savingsRatePercent === null ? '—' : d.month.savingsRatePercent + '%' }}</b><mat-icon>savings</mat-icon></div>
        </div>

        <div class="grid cols-2">
          <div class="card">
            <h2><mat-icon>donut_large</mat-icon> {{ 'dash.whereMoney' | translate }}</h2>
            @if (d.topExpenseCategories.length) {
              <app-donut [slices]="slices()" [centerLabel]="'dash.top5' | translate" />
            } @else {
              <div class="empty"><mat-icon>receipt_long</mat-icon><p>{{ 'dash.noExpenses' | translate }}</p></div>
            }
          </div>

          <div class="card">
            <h2><mat-icon>event_upcoming</mat-icon> {{ 'dash.upcoming' | translate }}</h2>
            @for (u of d.upcomingRecurringExpenses; track u.id) {
              <div class="row">
                <div><b>{{ u.name }}</b><div class="muted small">{{ u.nextDueDate | ldate: 'EEE d MMM' }}</div></div>
                <b class="num expense">{{ u.amount | money }}</b>
              </div>
            } @empty {
              <div class="empty"><mat-icon>task_alt</mat-icon><p>{{ 'dash.nothingDue' | translate }}</p></div>
            }
            <a matButton routerLink="/frecuentes">{{ 'dash.viewRecurring' | translate }}</a>
          </div>

          <div class="card">
            <h2><mat-icon>credit_score</mat-icon> {{ 'dash.debts' | translate }}</h2>
            <div class="debt">
              <div><span class="muted">{{ 'dash.totalOwed' | translate }}</span><b class="num expense big2">{{ d.debtsTotal | money }}</b></div>
              <div><span class="muted">{{ 'dash.monthlyMinimums' | translate }}</span><b class="num big2">{{ d.debtsMinimumTotal | money }}</b></div>
            </div>
            <a matButton routerLink="/deudas">{{ 'dash.manageDebts' | translate }}</a>
          </div>

          <div class="card">
            <h2><mat-icon>speed</mat-icon> {{ 'dash.budgets' | translate }}</h2>
            @for (b of d.budgetsExceeded; track b.categoryId) {
              <div class="row"><span><mat-icon class="expense sm">warning</mat-icon> {{ 'dash.budgetExceeded' | translate: { name: b.name } }}</span>
                <b class="num expense">{{ b.spent | money }} / {{ b.budget | money }}</b></div>
            } @empty {
              <div class="empty"><mat-icon>verified</mat-icon><p>{{ 'dash.noBudgetExceeded' | translate }} 🎉</p></div>
            }
            <a matButton routerLink="/categorias">{{ 'dash.configBudgets' | translate }}</a>
          </div>
        </div>

      }
    </div>
  `,
  styles: `
    .hero { border-radius: 24px; padding: 22px 26px 26px; color: #eafff6; display: flex; flex-direction: column; gap: 20px;
      background: radial-gradient(700px 300px at 100% 0%, #25a37c55, transparent 70%), linear-gradient(135deg, #0b3d2f, #0f5c47); box-shadow: 0 8px 30px -12px #0f5c4788; }
    .hero header { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .hero h2 { margin: 0; display: flex; align-items: center; gap: 10px; font: var(--mat-sys-title-medium); color: #eafff6; } .hero h2 mat-icon { color: #7ff0c0; }
    .hero .all { --mat-button-text-label-text-color: #7ff0c0; }
    .totals { display: flex; gap: 48px; flex-wrap: wrap; } .totals > div { display: flex; flex-direction: column; gap: 8px; }
    .lbl { opacity: .75; font-size: 14px; } .big { font-size: clamp(28px, 5vw, 42px); line-height: 1.1; letter-spacing: -.03em; font-weight: 700; }
    .tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 12px; align-items: start; }
    .tile { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.14); border-radius: 16px; padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; }
    .tile .top { display: flex; justify-content: space-between; align-items: center; gap: 8px; flex-wrap: wrap; }
    .tile .name { opacity: .8; font-size: 13px; } .tile .amt { font-size: 20px; letter-spacing: -.01em; margin-top: 2px; }
    .pks { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; background: rgba(0,0,0,.2); border-radius: 99px; padding: 3px 10px 3px 7px; white-space: nowrap; }
    .pks mat-icon { font-size: 14px; width: 14px; height: 14px; color: #7ff0c0; } .pks b { font-size: 12px; font-weight: 600; }
    .empty-hero { margin: 0; opacity: .85; }
    .kpi { position: relative; display: flex; flex-direction: column; gap: 8px; } .kpi b { font-size: 24px; letter-spacing: -.02em; }
    .kpi > mat-icon { position: absolute; right: 16px; top: 16px; opacity: .55; }
    .row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--mat-sys-outline-variant); gap: 12px; }
    .small { font-size: 12px; } .sm { font-size: 18px; width: 18px; height: 18px; vertical-align: middle; }
    .debt { display: flex; gap: 40px; flex-wrap: wrap; margin-bottom: 12px; } .debt div { display: flex; flex-direction: column; gap: 8px; } .big2 { font-size: 24px; }
    a[matButton] { margin-top: 8px; }
  `,
})
export class DashboardPage {
  private readonly api = inject(Api);
  private readonly refresh = inject(Refresh);
  private readonly auth = inject(Auth);
  private readonly i18n = inject(I18n);
  protected readonly d = signal<Dashboard | null>(null);
  protected readonly loading = signal(false);
  protected readonly firstName = () => (this.auth.user()?.name ?? '').split(' ')[0];
  protected readonly monthLabel = () => (this.d() ? monthName(this.d()!.month.month, this.i18n.locale()) : '');
  protected readonly slices = () => (this.d()?.topExpenseCategories ?? []).map((c) => ({ label: c.name, value: c.total, icon: c.icon }));

  constructor() {
    effect(() => { this.refresh.version(); untracked(() => this.load()); });
  }

  private async load() {
    this.loading.set(true);
    try { this.d.set(await this.api.dashboard()); } finally { this.loading.set(false); }
  }
}
