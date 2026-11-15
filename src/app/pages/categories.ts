import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatHint, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { MoneyPipe } from '../core/format';
import { BudgetRow, Category } from '../core/models';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { confirm } from '../shared/confirm-dialog';
import { MoneyInput } from '../shared/money-input';

@Component({
  selector: 'app-category-dialog',
  imports: [MoneyInput, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatHint, MatPrefix, MatInput, MatSelect, MatOption, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data ? 'cat.editTitle' : 'cat.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="catform" (ngSubmit)="save()">
        @if (!data) {
          <mat-form-field><mat-label>{{ 'cat.type' | translate }}</mat-label>
            <mat-select formControlName="type"><mat-option value="expense">{{ 'cat.typeExpense' | translate }}</mat-option><mat-option value="income">{{ 'cat.typeIncome' | translate }}</mat-option></mat-select></mat-form-field>
        }
        <mat-form-field><mat-label>{{ 'cat.name' | translate }}</mat-label><input matInput formControlName="name" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'cat.icon' | translate }}</mat-label><input matInput formControlName="icon" maxlength="4" placeholder="🛒" /></mat-form-field>
        @if (form.controls.type.value === 'expense') {
          <mat-form-field><mat-label>{{ 'cat.monthlyBudget' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span>
            <input matInput appMoney formControlName="monthlyBudget" /><mat-hint>{{ 'cat.budgetHint' | translate }}</mat-hint></mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="catform">{{ 'common.save' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `form { display: flex; flex-direction: column; gap: 18px; }`,
})
export class CategoryDialog {
  protected readonly ref = inject(MatDialogRef<CategoryDialog, boolean>);
  protected readonly data = inject<Category | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly form = this.fb.group({
    type: [(this.data?.type ?? 'expense') as 'income' | 'expense'],
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    icon: [this.data?.icon ?? ''],
    monthlyBudget: [this.data?.monthlyBudget ?? (null as number | null)],
  });

  protected async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const body = { name: v.name, icon: v.icon || undefined, monthlyBudget: v.type === 'expense' && v.monthlyBudget != null ? Number(v.monthlyBudget) : undefined };
    const ok = await this.notify.attempt(() => (this.data ? this.api.updateCategory(this.data._id, body) : this.api.createCategory({ ...body, type: v.type })),
      this.data ? 'cat.updated' : 'cat.created');
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-categories',
  imports: [MoneyPipe, MatIcon, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'cat.title' | translate }}</h1><p>{{ 'cat.subtitle' | translate }}</p></div>
        <button matButton="filled" (click)="open()"><mat-icon>add</mat-icon> {{ 'cat.new' | translate }}</button>
      </div>
      <div class="grid cols-2">
        @for (g of groups(); track g.type) {
          <section class="card">
            <h2><mat-icon [class]="g.type">{{ g.type === 'expense' ? 'north_east' : 'south_west' }}</mat-icon> {{ (g.type === 'expense' ? 'common.expenses' : 'common.income') | translate }}</h2>
            @for (c of g.items; track c._id) {
              <div class="cat">
                <span class="em">{{ c.icon || '•' }}</span>
                <div class="main">
                  <b>{{ c.name }}</b>
                  @if (budget(c); as b) {
                    <div class="progress-track"><span [style.width.%]="min100(b.percentUsed)" [style.background]="b.exceeded ? 'var(--expense)' : b.percentUsed > 80 ? 'var(--warn)' : null"></span></div>
                    <small class="muted num">{{ b.spent | money }} {{ 'cat.of' | translate }} {{ b.budget | money }} · @if (b.exceeded) { {{ 'cat.exceeded' | translate }} } @else { {{ 'cat.remaining' | translate }} {{ b.remaining | money }} }</small>
                  } @else if (c.monthlyBudget) { <small class="muted num">{{ 'cat.budget' | translate }} {{ c.monthlyBudget | money }}</small> }
                </div>
                <button matIconButton [matMenuTriggerFor]="m" [attr.aria-label]="'common.actions' | translate"><mat-icon>more_vert</mat-icon></button>
                <mat-menu #m="matMenu">
                  <button mat-menu-item (click)="open(c)"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</button>
                  <button mat-menu-item (click)="remove(c)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
                </mat-menu>
              </div>
            } @empty { <p class="muted">{{ 'cat.none' | translate }}</p> }
          </section>
        }
      </div>
    </div>
  `,
  styles: `
    .cat { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-top: 1px solid var(--mat-sys-outline-variant); }
    .em { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--mat-sys-surface-container-high); font-size: 20px; flex: none; }
    .main { flex: 1; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
  `,
})
export class CategoriesPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly refresh = inject(Refresh);
  private readonly categories = signal<Category[]>([]);
  private readonly budgets = signal<BudgetRow[]>([]);

  protected readonly groups = () => [
    { type: 'expense', items: this.categories().filter((c) => c.type === 'expense') },
    { type: 'income', items: this.categories().filter((c) => c.type === 'income') },
  ];
  protected readonly budget = (c: Category) => this.budgets().find((b) => b.categoryId === c._id);
  protected readonly min100 = (n: number) => Math.min(n, 100);

  constructor() { effect(() => { this.refresh.version(); untracked(() => this.load()); }); }

  private async load() {
    const [c, m] = await Promise.all([this.api.categories(), this.api.monthly()]);
    this.categories.set(c); this.budgets.set(m.budgets);
  }
  protected open(c?: Category) { this.dialog.open(CategoryDialog, { data: c ?? null }).afterClosed().subscribe((ok) => ok && this.refresh.bump()); }
  protected async remove(c: Category) {
    if (!(await confirm(this.dialog, { title: 'cat.deleteTitle', message: 'cat.deleteMessage', params: { name: c.name }, confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteCategory(c._id), 'cat.deleted')) this.refresh.bump();
  }
}
