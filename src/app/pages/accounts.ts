import { Component, effect, inject, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MAT_DIALOG_DATA, MatDialog, MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle } from '@angular/material/dialog';
import { MatFormField, MatLabel, MatPrefix } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatOption, MatSelect } from '@angular/material/select';
import { MatSlideToggle } from '@angular/material/slide-toggle';
import { TranslatePipe } from '@ngx-translate/core';
import { Api } from '../core/api';
import { ACCOUNT_ICONS, ACCOUNT_TYPES, MoneyPipe } from '../core/format';
import { Account, AccountType, Pocket } from '../core/models';
import { Notify } from '../core/notify';
import { Refresh } from '../core/refresh';
import { confirm } from '../shared/confirm-dialog';
import { MoneyInput } from '../shared/money-input';
import { PocketDialog, PocketHistoryDialog, PocketMoveDialog } from './pocket-dialogs';
import { TransactionDialog } from './transaction-dialog';

@Component({
  selector: 'app-account-dialog',
  imports: [MoneyInput, ReactiveFormsModule, MatDialogTitle, MatDialogContent, MatDialogActions, MatButton, MatFormField, MatLabel, MatPrefix, MatInput, MatSelect, MatOption, MatCheckbox, TranslatePipe],
  template: `
    <h2 mat-dialog-title>{{ (data ? 'acc.editTitle' : 'acc.newTitle') | translate }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" id="accform" (ngSubmit)="save()">
        <mat-form-field><mat-label>{{ 'acc.name' | translate }}</mat-label><input matInput formControlName="name" [placeholder]="'acc.namePlaceholder' | translate" /></mat-form-field>
        <mat-form-field><mat-label>{{ 'acc.type' | translate }}</mat-label>
          <mat-select formControlName="type">@for (t of types; track t) { <mat-option [value]="t">{{ 'accountType.' + t | translate }}</mat-option> }</mat-select></mat-form-field>
        @if (!data) {
          <mat-form-field><mat-label>{{ 'acc.initialBalance' | translate }}</mat-label><span matTextPrefix>$&nbsp;</span><input matInput appMoney formControlName="balance" /></mat-form-field>
        }
        <mat-form-field><mat-label>{{ 'acc.description' | translate }}</mat-label><input matInput formControlName="description" /></mat-form-field>
        <mat-checkbox formControlName="allowNegative">{{ 'acc.allowNegative' | translate }}</mat-checkbox>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end" class="dialog-actions">
      <button matButton (click)="ref.close()">{{ 'common.cancel' | translate }}</button>
      <button matButton="filled" form="accform">{{ 'common.save' | translate }}</button>
    </mat-dialog-actions>
  `,
  styles: `form { display: flex; flex-direction: column; gap: 18px; }`,
})
export class AccountDialog {
  protected readonly ref = inject(MatDialogRef<AccountDialog, boolean>);
  protected readonly data = inject<Account | null>(MAT_DIALOG_DATA, { optional: true });
  private readonly api = inject(Api);
  private readonly notify = inject(Notify);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly types = ACCOUNT_TYPES;
  protected readonly form = this.fb.group({
    name: [this.data?.name ?? '', [Validators.required, Validators.maxLength(60)]],
    type: [(this.data?.type ?? 'bank') as AccountType],
    balance: [0 as number | null],
    description: [this.data?.description ?? ''],
    allowNegative: [this.data?.allowNegative ?? false],
  });

  protected async save() {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const { balance, ...rest } = this.form.getRawValue();
    const body = { ...rest, description: rest.description || undefined };
    const ok = await this.notify.attempt(() => (this.data ? this.api.updateAccount(this.data._id, body) : this.api.createAccount({ ...body, balance: Number(balance ?? 0) })),
      this.data ? 'acc.updated' : 'acc.created');
    if (ok) this.ref.close(true);
  }
}

@Component({
  selector: 'app-accounts',
  imports: [MoneyPipe, MatIcon, MatButton, MatIconButton, MatMenu, MatMenuItem, MatMenuTrigger, MatSlideToggle, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-header">
        <div><h1>{{ 'acc.title' | translate }}</h1><p>{{ 'acc.subtitle' | translate }}</p></div>
        <div class="actions">
          <mat-slide-toggle [checked]="showArchived()" (change)="showArchived.set($event.checked); load()">{{ 'acc.showArchived' | translate }}</mat-slide-toggle>
          <button matButton="outlined" (click)="transfer()"><mat-icon>sync_alt</mat-icon> {{ 'acc.transfer' | translate }}</button>
          <button matButton="tonal" (click)="newPocket()" [disabled]="!accounts().length"><mat-icon>savings</mat-icon> {{ 'pocket.new' | translate }}</button>
          <button matButton="filled" (click)="open()"><mat-icon>add</mat-icon> {{ 'acc.newAccount' | translate }}</button>
        </div>
      </div>

      <section class="summary">
        <div class="main"><span>{{ 'pocket.available' | translate }}</span><strong class="num">{{ total() | money }}</strong></div>
        <div class="side">
          <div><mat-icon>savings</mat-icon><span>{{ 'pocket.inPockets' | translate }}<b class="num">{{ inPockets() | money }}</b></span></div>
          <div><mat-icon>account_balance</mat-icon><span>{{ 'pocket.total' | translate }}<b class="num">{{ grandTotal() | money }}</b></span></div>
        </div>
      </section>

      <div class="grid cols-2">
        @for (a of accounts(); track a._id) {
          <article class="card acc" [class.archived]="a.archived">
            <header>
              <span class="ico"><mat-icon>{{ icons[a.type] }}</mat-icon></span>
              <div class="t"><b>{{ a.name }}</b><span class="muted">{{ 'accountType.' + a.type | translate }}@if (a.archived) { · {{ 'acc.archived' | translate }} }</span></div>
              <button matIconButton [matMenuTriggerFor]="m" [attr.aria-label]="'common.actions' | translate"><mat-icon>more_vert</mat-icon></button>
              <mat-menu #m="matMenu">
                <button mat-menu-item (click)="open(a)"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</button>
                <button mat-menu-item (click)="archive(a)"><mat-icon>{{ a.archived ? 'unarchive' : 'archive' }}</mat-icon> {{ (a.archived ? 'acc.restore' : 'acc.archive') | translate }}</button>
                <button mat-menu-item (click)="remove(a)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
              </mat-menu>
            </header>

            <div class="avail"><span class="muted">{{ 'pocket.available' | translate }}</span><strong class="bal num" [class.expense]="a.balance < 0">{{ a.balance | money }}</strong></div>
            @if (a.pocketsTotal > 0) {
              <div class="split muted num">{{ 'pocket.inPockets' | translate }} {{ a.pocketsTotal | money }} · {{ 'pocket.total' | translate }} {{ a.totalBalance | money }}</div>
            }
            @if (a.description) { <p class="muted">{{ a.description }}</p> }
            @if (a.allowNegative) { <span class="chip warn">{{ 'acc.overdraft' | translate }}</span> }

            <div class="pockets">
              @for (p of a.pockets; track p._id) {
                <div class="pk">
                  <span class="em">{{ p.icon || '👛' }}</span>
                  <div class="pmain">
                    <b>{{ p.name }}</b>
                    <span class="muted num small">{{ p.balance | money }}@if (p.goal) { · {{ 'pocket.goalShort' | translate }} {{ p.goal | money }} }</span>
                    @if (p.goal) { <div class="progress-track"><span [style.width.%]="pct(p)"></span></div> }
                  </div>
                  <button matIconButton (click)="move(a, p, 'deposit')" [disabled]="a.balance <= 0" [attr.aria-label]="'pocket.deposit' | translate" [title]="'pocket.deposit' | translate"><mat-icon>add_circle</mat-icon></button>
                  <button matIconButton (click)="move(a, p, 'withdraw')" [disabled]="p.balance <= 0" [attr.aria-label]="'pocket.withdraw' | translate" [title]="'pocket.withdraw' | translate"><mat-icon>remove_circle</mat-icon></button>
                  <button matIconButton [matMenuTriggerFor]="pm" [attr.aria-label]="'common.actions' | translate"><mat-icon>more_vert</mat-icon></button>
                  <mat-menu #pm="matMenu">
                    <button mat-menu-item (click)="history(p)"><mat-icon>history</mat-icon> {{ 'pocket.history' | translate }}</button>
                    <button mat-menu-item (click)="editPocket(a, p)"><mat-icon>edit</mat-icon> {{ 'common.edit' | translate }}</button>
                    <button mat-menu-item (click)="removePocket(p)"><mat-icon>delete</mat-icon> {{ 'common.delete' | translate }}</button>
                  </mat-menu>
                </div>
              } @empty { <p class="muted small none">{{ 'pocket.empty' | translate }}</p> }
              @if (!a.archived) { <button matButton class="addp" (click)="newPocket(a)"><mat-icon>add</mat-icon> {{ 'pocket.new' | translate }}</button> }
            </div>
          </article>
        } @empty { <div class="card empty"><mat-icon>account_balance</mat-icon><p>{{ 'acc.empty' | translate }}</p></div> }
      </div>
    </div>
  `,
  styles: `
    .actions { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
    .summary { border-radius: 24px; padding: 22px 26px; display: flex; justify-content: space-between; align-items: center; gap: 20px; flex-wrap: wrap; color: #eafff6;
      background: radial-gradient(700px 300px at 100% 0%, #25a37c55, transparent 70%), linear-gradient(135deg, #0b3d2f, #0f5c47); }
    .summary .main { display: flex; flex-direction: column; gap: 8px; } .summary .main span { opacity: .75; font-size: 14px; } .summary strong { font-size: clamp(28px, 5vw, 38px); line-height: 1.1; letter-spacing: -.03em; }
    .side { display: flex; gap: 28px; flex-wrap: wrap; } .side > div { display: flex; gap: 12px; align-items: center; font-size: 13px; } .side mat-icon { color: #7ff0c0; }
    .side span { display: flex; flex-direction: column; gap: 4px; } .side b { font-size: 17px; }
    .acc { display: flex; flex-direction: column; gap: 8px; } .acc.archived { opacity: .6; } header { display: flex; align-items: center; gap: 12px; }
    .t { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 13px; } .t b { font-size: 16px; }
    .ico { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: var(--mat-sys-primary-container); color: var(--mat-sys-on-primary-container); }
    .avail { display: flex; flex-direction: column; gap: 4px; margin-top: 4px; } .bal { font-size: 30px; letter-spacing: -.02em; line-height: 1.1; }
    .split { font-size: 13px; } p { margin: 0; font-size: 13px; } .chip { align-self: flex-start; } .small { font-size: 12px; }
    .pockets { margin-top: 10px; padding-top: 6px; border-top: 1px dashed var(--mat-sys-outline-variant); display: flex; flex-direction: column; gap: 2px; }
    .pk { display: flex; align-items: center; gap: 10px; padding: 8px 0; }
    .em { width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--mat-sys-surface-container-high); font-size: 20px; flex: none; }
    .pmain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; } .pmain b { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .none { padding: 8px 0; } .addp { align-self: flex-start; margin-top: 4px; }
  `,
})
export class AccountsPage {
  private readonly api = inject(Api);
  private readonly dialog = inject(MatDialog);
  private readonly notify = inject(Notify);
  private readonly refresh = inject(Refresh);
  protected readonly icons = ACCOUNT_ICONS;
  protected readonly accounts = signal<Account[]>([]);
  protected readonly total = signal(0);
  protected readonly inPockets = signal(0);
  protected readonly grandTotal = signal(0);
  protected readonly showArchived = signal(false);

  constructor() { effect(() => { this.refresh.version(); untracked(() => this.load()); }); }

  protected async load() {
    const r = await this.api.accounts(this.showArchived());
    this.accounts.set(r.accounts); this.total.set(r.total); this.inPockets.set(r.inPockets); this.grandTotal.set(r.grandTotal);
  }
  protected pct = (p: Pocket) => Math.min(100, Math.round((p.balance / (p.goal || 1)) * 100));

  private done(ref: { afterClosed(): { subscribe(fn: (ok: boolean | undefined) => void): unknown } }) { ref.afterClosed().subscribe((ok) => ok && this.refresh.bump()); }

  protected open(a?: Account) { this.done(this.dialog.open(AccountDialog, { data: a ?? null })); }
  protected transfer() { this.done(this.dialog.open(TransactionDialog)); }

  protected newPocket(a?: Account) {
    this.done(this.dialog.open(PocketDialog, { data: { accountId: a?._id, accounts: this.accounts().filter((x) => !x.archived) } }));
  }
  protected editPocket(a: Account, p: Pocket) { this.done(this.dialog.open(PocketDialog, { data: { pocket: p, accounts: [a] } })); }
  protected move(account: Account, pocket: Pocket, mode: 'deposit' | 'withdraw') { this.done(this.dialog.open(PocketMoveDialog, { data: { account, pocket, mode } })); }
  protected history(p: Pocket) { this.dialog.open(PocketHistoryDialog, { data: p }); }

  protected async removePocket(p: Pocket) {
    if (!(await confirm(this.dialog, { title: 'pocket.deleteTitle', message: 'pocket.deleteMessage', params: { name: p.name }, confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deletePocket(p._id), 'pocket.deleted')) this.refresh.bump();
  }

  protected async archive(a: Account) {
    if (await this.notify.attempt(() => this.api.updateAccount(a._id, { archived: !a.archived }), a.archived ? 'acc.restored' : 'acc.archivedDone')) this.refresh.bump();
  }
  protected async remove(a: Account) {
    if (!(await confirm(this.dialog, { title: 'acc.deleteTitle', message: 'acc.deleteMessage', params: { name: a.name }, confirm: 'common.delete', danger: true }))) return;
    if (await this.notify.attempt(() => this.api.deleteAccount(a._id), 'acc.deleted')) this.refresh.bump();
  }
}
