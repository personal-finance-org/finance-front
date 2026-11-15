import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { TranslatePipe } from '@ngx-translate/core';
import { MoneyPipe } from '../core/format';

export const PALETTE = ['#0f9d73', '#3b5bdb', '#f08c00', '#d6336c', '#7048e8', '#1098ad', '#e8590c', '#74b816', '#495057', '#c2255c'];

export interface Slice { label: string; value: number; icon?: string; }

/** Dona SVG con leyenda. */
@Component({
  selector: 'app-donut',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="wrap">
      <svg viewBox="0 0 120 120" role="img" [attr.aria-label]="('chart.distribution' | translate) + ': ' + total()">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--mat-sys-surface-container-highest)" stroke-width="16" />
        @for (a of arcs(); track a.label) {
          <circle cx="60" cy="60" r="46" fill="none" [attr.stroke]="a.color" stroke-width="16"
            [attr.stroke-dasharray]="a.dash" [attr.stroke-dashoffset]="a.offset" transform="rotate(-90 60 60)">
            <title>{{ a.label }}: {{ a.value | money }}</title>
          </circle>
        }
        <text x="60" y="56" text-anchor="middle" class="t1">{{ centerLabel() }}</text>
        <text x="60" y="72" text-anchor="middle" class="t2">{{ total() | money }}</text>
      </svg>
      <ul>
        @for (a of arcs(); track a.label) {
          <li><span class="dot" [style.background]="a.color"></span><span class="lbl">{{ a.icon }} {{ a.label }}</span>
            <span class="val num">{{ a.value | money }}</span><span class="pct muted">{{ a.pct }}%</span></li>
        }
      </ul>
    </div>
  `,
  styles: `
    .wrap { display: flex; gap: 20px; align-items: center; flex-wrap: wrap; }
    svg { width: 170px; height: 170px; flex: none; margin: 0 auto; }
    .t1 { font-size: 7px; fill: var(--mat-sys-on-surface-variant); } .t2 { font-size: 9.5px; font-weight: 600; fill: var(--mat-sys-on-surface); }
    ul { list-style: none; margin: 0; padding: 0; flex: 1; min-width: 200px; display: grid; gap: 7px; }
    li { display: grid; grid-template-columns: 10px 1fr auto 38px; gap: 8px; align-items: center; font-size: 13px; }
    .dot { width: 10px; height: 10px; border-radius: 3px; } .lbl { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .pct { text-align: right; font-size: 12px; }
  `,
})
export class Donut {
  readonly slices = input.required<Slice[]>();
  readonly centerLabel = input('');
  protected readonly total = computed(() => this.slices().reduce((s, x) => s + x.value, 0));
  protected readonly arcs = computed(() => {
    const total = this.total() || 1;
    const C = 2 * Math.PI * 46;
    let acc = 0;
    return this.slices().map((s, i) => {
      const len = (s.value / total) * C;
      const arc = { ...s, color: PALETTE[i % PALETTE.length], dash: `${Math.max(len - 1.5, 0)} ${C}`, offset: -acc, pct: Math.round((s.value / total) * 100) };
      acc += len;
      return arc;
    });
  });
}

export interface BarPoint { label: string; sub?: string; income: number; expense: number; }

/** Barras agrupadas ingresos/gastos (HTML+CSS: se adapta al ancho sin deformar textos). */
@Component({
  selector: 'app-bars',
  imports: [MoneyPipe, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chart">
      <div class="plot">
        @for (b of bars(); track $index) {
          <div class="grp" [attr.title]="b.label + (b.sub ? ' ' + b.sub : '') + ' · ' + ('common.income' | translate) + ' ' + (b.income | money) + ' · ' + ('common.expenses' | translate) + ' ' + (b.expense | money)">
            <span class="bar inc" [style.height.%]="b.hi"></span>
            <span class="bar exp" [style.height.%]="b.he"></span>
          </div>
        }
      </div>
      <div class="axis">
        @for (b of bars(); track $index) {
          <span class="lab">@if (b.showLabel) { {{ b.label }}@if (b.sub) { <small>{{ b.sub }}</small> } }</span>
        }
      </div>
    </div>
    <div class="legend"><span><i class="inc"></i>{{ 'common.income' | translate }}</span><span><i class="exp"></i>{{ 'common.expenses' | translate }}</span></div>
  `,
  styles: `
    .chart { display: flex; flex-direction: column; gap: 8px; }
    .plot { display: flex; align-items: stretch; height: 190px; padding: 0 2px;
      background: repeating-linear-gradient(to top, var(--mat-sys-outline-variant) 0 1px, transparent 1px 25%); border-bottom: 1px solid var(--mat-sys-outline-variant); }
    .grp { flex: 1 1 0; min-width: 0; display: flex; align-items: flex-end; justify-content: center; gap: 3px; padding: 0 2px; }
    .grp:hover { background: var(--mat-sys-surface-container-high); border-radius: 8px 8px 0 0; }
    .bar { width: min(18px, 42%); border-radius: 5px 5px 0 0; min-height: 0; transition: height .4s; }
    .inc { background: var(--income); } .exp { background: var(--expense); }
    .axis { display: flex; padding: 0 2px; }
    .lab { flex: 1 1 0; min-width: 0; text-align: center; font-size: 12px; color: var(--mat-sys-on-surface-variant); line-height: 1.2; white-space: nowrap; }
    .lab small { display: block; font-size: 10.5px; opacity: .7; }
    .legend { display: flex; gap: 18px; justify-content: center; font-size: 12px; color: var(--mat-sys-on-surface-variant); margin-top: 12px;
      i { display: inline-block; width: 10px; height: 10px; border-radius: 3px; margin-right: 6px; } }
  `,
})
export class Bars {
  readonly points = input.required<BarPoint[]>();
  protected readonly bars = computed(() => {
    const pts = this.points();
    const max = Math.max(1, ...pts.flatMap((p) => [p.income, p.expense]));
    const every = pts.length > 16 ? Math.ceil(pts.length / 10) : 1;
    const h = (v: number) => (v > 0 ? Math.max((v / max) * 100, 1.5) : 0);
    return pts.map((p, i) => ({ ...p, hi: h(p.income), he: h(p.expense), showLabel: i % every === 0 }));
  });
}
