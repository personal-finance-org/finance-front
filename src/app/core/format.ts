import { formatCurrency, formatDate, getCurrencySymbol } from '@angular/common';
import { Pipe, PipeTransform, inject } from '@angular/core';
import { I18n } from './i18n';

/** `{{ valor | money }}` → con la moneda y el formato del idioma activo (ej. $ 1.250.000 · $1,250,000 · R$ 1.250.000). */
@Pipe({ name: 'money', pure: false })
export class MoneyPipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(v: number | null | undefined): string {
    const n = v ?? 0;
    const locale = this.i18n.locale();
    const code = this.i18n.currency();
    return formatCurrency(n, locale, getCurrencySymbol(code, 'narrow', locale), code, Number.isInteger(n) ? '1.0-0' : '1.2-2');
  }
}

/** `{{ fecha | ldate: 'd MMM y' }}` → fecha en el idioma activo. */
@Pipe({ name: 'ldate', pure: false })
export class LocalDatePipe implements PipeTransform {
  private readonly i18n = inject(I18n);
  transform(v: string | Date | null | undefined, format = 'mediumDate'): string {
    return v ? formatDate(v, format, this.i18n.locale()) : '';
  }
}

/** Fecha local "YYYY-MM-DD" para campos de fecha. */
export const todayStr = () => toDateInput(new Date());
export const toDateInput = (d: Date | string) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};
/** Convierte "YYYY-MM-DD" a ISO al mediodía local (evita saltos de día por zona horaria). */
export const dateToIso = (s: string) => new Date(`${s}T12:00:00`).toISOString();

export const currentMonth = () => todayStr().slice(0, 7);
export const shiftMonth = (m: string, delta: number) => {
  const [y, mo] = m.split('-').map(Number);
  const d = new Date(y, mo - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
/** "2026-11" → "Noviembre de 2026" / "November 2026" / "Novembro de 2026". */
export const monthName = (m: string, locale: string, short = false) => {
  const [y, mo] = m.split('-').map(Number);
  const s = new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: short ? 'short' : 'long', year: short ? '2-digit' : 'numeric' });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
export const shortMonth = (y: number, mo: number, locale: string) => {
  const s = new Date(y, mo - 1, 1).toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
};

// Listas de valores; los textos se traducen con las claves accountType.*, frequency.*, debtType.*, kind.*
export const ACCOUNT_TYPES = ['cash', 'bank', 'savings', 'wallet', 'investment'] as const;
export const FREQUENCIES = ['weekly', 'biweekly', 'monthly', 'yearly'] as const;
export const DEBT_TYPES = ['credit_card', 'loan', 'mortgage', 'vehicle', 'personal', 'store', 'other'] as const;

export const ACCOUNT_ICONS: Record<string, string> = {
  cash: 'payments', bank: 'account_balance', savings: 'savings', wallet: 'account_balance_wallet', investment: 'trending_up',
};
export const DEBT_ICONS: Record<string, string> = {
  credit_card: 'credit_card', loan: 'request_quote', mortgage: 'home', vehicle: 'directions_car', personal: 'person', store: 'storefront', other: 'receipt_long',
};
