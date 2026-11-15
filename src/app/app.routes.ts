import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/auth.guard';

export const routes: Routes = [
  { path: 'login', canActivate: [guestGuard], title: 'nav.login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./layout/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', title: 'nav.home', loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage) },
      { path: 'movimientos', title: 'nav.transactions', loadComponent: () => import('./pages/transactions').then((m) => m.TransactionsPage) },
      { path: 'cuentas', title: 'nav.accounts', loadComponent: () => import('./pages/accounts').then((m) => m.AccountsPage) },
      { path: 'bolsillos', redirectTo: 'cuentas', pathMatch: 'full' },
      { path: 'categorias', title: 'nav.categories', loadComponent: () => import('./pages/categories').then((m) => m.CategoriesPage) },
      { path: 'frecuentes', title: 'nav.recurring', loadComponent: () => import('./pages/recurring').then((m) => m.RecurringPage) },
      { path: 'deudas', title: 'nav.debts', loadComponent: () => import('./pages/debts').then((m) => m.DebtsPage) },
      { path: 'deudas/:id', title: 'nav.debt', loadComponent: () => import('./pages/debt-detail').then((m) => m.DebtDetailPage) },
      { path: 'perfil', title: 'nav.profile', loadComponent: () => import('./pages/profile').then((m) => m.ProfilePage) },
      { path: 'reportes', title: 'nav.reports', loadComponent: () => import('./pages/reports').then((m) => m.ReportsPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
