import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { API_URL } from './config';
import * as M from './models';

/** Cliente tipado de la API. Cada método devuelve una Promise para usarlo cómodo con signals. */
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly http = inject(HttpClient);

  private get<T>(path: string, params?: object) {
    let p = new HttpParams();
    for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    return firstValueFrom(this.http.get<T>(API_URL + path, { params: p }));
  }
  private post<T>(path: string, body: object = {}) { return firstValueFrom(this.http.post<T>(API_URL + path, body)); }
  private patch<T>(path: string, body: object) { return firstValueFrom(this.http.patch<T>(API_URL + path, body)); }
  private del<T = void>(path: string) { return firstValueFrom(this.http.delete<T>(API_URL + path)); }

  // auth / usuario
  login(body: { email: string; password: string }) { return this.post<M.Session>('/auth/login', body); }
  register(body: { email: string; name: string; password: string; language?: string }) { return this.post<M.Session>('/auth/register', body); }

  // perfil
  me() { return this.get<M.ProfileDoc>('/users/me'); }
  updateMe(b: object) { return this.patch<M.ProfileDoc>('/users/me', b); }
  changePassword(b: { currentPassword: string; newPassword: string }) { return this.post<void>('/users/me/password', b); }

  // bolsillos
  accounts(includeArchived = false) { return this.get<M.AccountsResponse>('/accounts', { includeArchived }); }
  createAccount(b: object) { return this.post<M.Account>('/accounts', b); }
  updateAccount(id: string, b: object) { return this.patch<M.Account>(`/accounts/${id}`, b); }
  deleteAccount(id: string) { return this.del(`/accounts/${id}`); }

  // bolsillos (plata apartada dentro de una cuenta)
  createPocket(b: object) { return this.post<M.Pocket>('/pockets', b); }
  updatePocket(id: string, b: object) { return this.patch<M.Pocket>(`/pockets/${id}`, b); }
  deletePocket(id: string) { return this.del(`/pockets/${id}`); }
  depositPocket(id: string, b: object) { return this.post<M.Pocket>(`/pockets/${id}/deposit`, b); }
  withdrawPocket(id: string, b: object) { return this.post<M.Pocket>(`/pockets/${id}/withdraw`, b); }
  pocketMovements(id: string, page = 1, limit = 50) { return this.get<M.Paginated<M.PocketMovement>>(`/pockets/${id}/movements`, { page, limit }); }

  // categorías
  categories(type?: string) { return this.get<M.Category[]>('/categories', { type }); }
  createCategory(b: object) { return this.post<M.Category>('/categories', b); }
  updateCategory(id: string, b: object) { return this.patch<M.Category>(`/categories/${id}`, b); }
  deleteCategory(id: string) { return this.del(`/categories/${id}`); }

  // movimientos
  transactions(q: M.TxQuery) { return this.get<M.Paginated<M.Transaction>>('/transactions', q); }
  createTransaction(b: object) { return this.post<M.Transaction>('/transactions', b); }
  updateTransaction(id: string, b: object) { return this.patch<M.Transaction>(`/transactions/${id}`, b); }
  deleteTransaction(id: string) { return this.del(`/transactions/${id}`); }

  // gastos frecuentes
  recurring() { return this.get<M.RecurringResponse>('/recurring-expenses'); }
  createRecurring(b: object) { return this.post<M.Recurring>('/recurring-expenses', b); }
  updateRecurring(id: string, b: object) { return this.patch<M.Recurring>(`/recurring-expenses/${id}`, b); }
  payRecurring(id: string, b: object = {}) { return this.post(`/recurring-expenses/${id}/pay`, b); }
  deleteRecurring(id: string) { return this.del(`/recurring-expenses/${id}`); }

  // deudas
  debts(status?: string) { return this.get<M.DebtsResponse>('/debts', { status }); }
  debt(id: string) { return this.get<M.Debt>(`/debts/${id}`); }
  createDebt(b: object) { return this.post<M.Debt>('/debts', b); }
  updateDebt(id: string, b: object) { return this.patch<M.Debt>(`/debts/${id}`, b); }
  deleteDebt(id: string) { return this.del(`/debts/${id}`); }
  debtPayments(id: string, page = 1, limit = 50) { return this.get<M.Paginated<M.DebtPayment>>(`/debts/${id}/payments`, { page, limit }); }
  addDebtPayment(id: string, b: object) { return this.post(`/debts/${id}/payments`, b); }
  addDebtPayments(id: string, payments: object[]) { return this.post(`/debts/${id}/payments/bulk`, { payments }); }
  deleteDebtPayment(id: string, paymentId: string) { return this.del(`/debts/${id}/payments/${paymentId}`); }

  // reportes
  dashboard() { return this.get<M.Dashboard>('/reports/dashboard'); }
  monthly(month?: string) { return this.get<M.MonthlyReport>('/reports/monthly', { month }); }
  history(months = 12) { return this.get<M.HistoryReport>('/reports/history', { months }); }
  netWorth() { return this.get<M.NetWorth>('/reports/net-worth'); }
}
