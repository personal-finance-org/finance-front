import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, inject, viewChild } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { MatSidenav, MatSidenavContainer, MatSidenavContent } from '@angular/material/sidenav';
import { MatToolbar } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { TranslatePipe } from '@ngx-translate/core';
import { map } from 'rxjs';
import { Auth } from '../core/auth';
import { Refresh } from '../core/refresh';
import { TransactionDialog } from '../pages/transaction-dialog';
import { InstallButton } from '../shared/install-button';

@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatSidenavContainer, MatSidenav, MatSidenavContent, MatToolbar, MatIcon, MatIconButton, MatButton, MatMenu, MatMenuItem, MatMenuTrigger, TranslatePipe, InstallButton],
  template: `
    <mat-sidenav-container class="container">
      <mat-sidenav #nav [mode]="mobile() ? 'over' : 'side'" [opened]="!mobile()" class="sidenav">
        <a class="brand" routerLink="/" (click)="closeIfMobile()">
          <span class="logo"><mat-icon>trending_up</mat-icon></span>
          <span>Mis Finanzas</span>
        </a>
        <nav>
          @for (i of items; track i.path) {
            <a [routerLink]="i.path" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: i.path === '/' }" (click)="closeIfMobile()">
              <mat-icon>{{ i.icon }}</mat-icon><span>{{ i.label | translate }}</span>
            </a>
          }
        </nav>
        <div class="foot muted">API · localhost:3000</div>
      </mat-sidenav>

      <mat-sidenav-content>
        <mat-toolbar class="topbar">
          @if (mobile()) { <button matIconButton (click)="nav.toggle()" [attr.aria-label]="'nav.menu' | translate"><mat-icon>menu</mat-icon></button> }
          <span class="spacer"></span>
          <app-install-button />
          <button matButton="filled" (click)="newTransaction()"><mat-icon>add</mat-icon> {{ 'nav.newTransaction' | translate }}</button>
          <button matIconButton [matMenuTriggerFor]="menu" [attr.aria-label]="'nav.account' | translate"><mat-icon>account_circle</mat-icon></button>
          <mat-menu #menu="matMenu">
            <div class="who"><strong>{{ auth.user()?.name }}</strong><br /><span class="muted">{{ auth.user()?.email }}</span></div>
            <a mat-menu-item routerLink="/perfil"><mat-icon>manage_accounts</mat-icon> {{ 'nav.profile' | translate }}</a>
            <button mat-menu-item (click)="auth.logout()"><mat-icon>logout</mat-icon> {{ 'nav.logout' | translate }}</button>
          </mat-menu>
        </mat-toolbar>
        <router-outlet />
      </mat-sidenav-content>
    </mat-sidenav-container>
  `,
  styles: `
    .container { height: 100dvh; background: var(--mat-sys-surface); }
    .sidenav { width: 248px; padding: 16px 12px; display: flex; flex-direction: column; border-right: 1px solid var(--mat-sys-outline-variant);
      background: var(--mat-sys-surface-container-low); }
    .brand { display: flex; align-items: center; gap: 10px; padding: 6px 10px 20px; white-space: nowrap; text-decoration: none; color: inherit; font: 700 20px/1 Inter, sans-serif; letter-spacing: -.02em; }
    .logo { width: 36px; height: 36px; border-radius: 11px; display: grid; place-items: center; color: #7ff0c0; background: linear-gradient(135deg, #0f5c47, #13795b); }
    nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    nav a { display: flex; align-items: center; gap: 14px; padding: 11px 14px; border-radius: 14px; text-decoration: none; color: var(--mat-sys-on-surface-variant);
      font: var(--mat-sys-label-large); transition: background .15s; }
    nav a:hover { background: var(--mat-sys-surface-container-high); }
    nav a.active { background: var(--mat-sys-secondary-container); color: var(--mat-sys-on-secondary-container); }
    .foot { font-size: 11px; padding: 8px 12px; }
    .topbar { position: sticky; top: 0; z-index: 5; gap: 6px; background: color-mix(in srgb, var(--mat-sys-surface) 85%, transparent); backdrop-filter: blur(10px); }
    .spacer { flex: 1; }
    .who { padding: 10px 16px 12px; line-height: 1.5; font-size: 13px; }
  `,
})
export class Shell {
  protected readonly auth = inject(Auth);
  private readonly dialog = inject(MatDialog);
  private readonly refresh = inject(Refresh);
  private readonly sidenav = viewChild.required(MatSidenav);

  protected readonly mobile = toSignal(inject(BreakpointObserver).observe('(max-width: 900px)').pipe(map((r) => r.matches)), { initialValue: false });
  protected readonly items = [
    { path: '/', label: 'nav.home', icon: 'space_dashboard' },
    { path: '/movimientos', label: 'nav.transactions', icon: 'swap_vert' },
    { path: '/cuentas', label: 'nav.accounts', icon: 'account_balance' },
    { path: '/categorias', label: 'nav.categories', icon: 'category' },
    { path: '/frecuentes', label: 'nav.recurring', icon: 'event_repeat' },
    { path: '/deudas', label: 'nav.debts', icon: 'credit_score' },
    { path: '/reportes', label: 'nav.reports', icon: 'monitoring' },
  ];

  constructor() { this.auth.refreshProfile(); }

  protected closeIfMobile() { if (this.mobile()) this.sidenav().close(); }

  protected newTransaction() {
    this.dialog.open(TransactionDialog).afterClosed().subscribe((saved) => saved && this.refresh.bump());
  }
}
