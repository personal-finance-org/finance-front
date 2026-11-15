import { HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TranslateService } from '@ngx-translate/core';

type Params = Record<string, unknown>;

/** Mensajes del backend (en español) → clave de traducción. Lo que no esté aquí se muestra tal cual. */
const SERVER_MESSAGES: [RegExp, string, string[]?][] = [
  [/^La cuenta "(.+)" no tiene saldo disponible$/, 'err.noBalance', ['name']],
  [/^El bolsillo "(.+)" no tiene suficiente dinero/, 'err.pocketNotEnough', ['name']],
  [/^El bolsillo "(.+)" aún tiene dinero/, 'err.pocketNotEmpty', ['name']],
  [/^Ya existe un bolsillo/, 'err.pocketExists'],
  [/^La cuenta tiene dinero en bolsillos/, 'err.accountHasPockets'],
  [/^La cuenta está archivada/, 'err.accountArchived'],
  [/^Saldo insuficiente en la cuenta "(.+)" \(disponible: (.+)\)$/, 'err.insufficient', ['name', 'available']],
  [/^Credenciales inválidas/, 'err.invalidCredentials'],
  [/^El correo ya está registrado/, 'err.emailTaken'],
  [/^La contraseña actual es incorrecta/, 'err.wrongPassword'],
  [/^La nueva contraseña debe ser distinta/, 'err.samePassword'],
  [/^Ya existe una cuenta/, 'err.accountExists'],
  [/^Ya existe una categoría/, 'err.categoryExists'],
  [/^La cuenta tiene movimientos/, 'err.accountHasMovements'],
  [/^La categoría tiene movimientos/, 'err.categoryInUse'],
  [/^Es un abono a una deuda/, 'err.debtPaymentTx'],
  [/^El abono \(.+\) supera lo que se debe/, 'err.paymentExceeds'],
  [/^La suma de los abonos/, 'err.paymentExceeds'],
  [/^La deuda ya está pagada/, 'err.debtPaid'],
  [/^La deuda tiene abonos/, 'err.debtHasPayments'],
  [/^El saldo de la deuda cambió/, 'err.debtChanged'],
  [/^Token/, 'err.session'],
  [/no encontrad[oa]/, 'err.notFound'],
  [/^Este pago ya fue registrado/, 'err.alreadyPaid'],
];

@Injectable({ providedIn: 'root' })
export class Notify {
  private readonly snack = inject(MatSnackBar);
  private readonly t = inject(TranslateService);

  info(key: string, params?: Params) {
    this.snack.open(this.t.instant(key, params), this.t.instant('common.ok'), { duration: 3500 });
  }

  error(e: unknown) {
    this.snack.open(this.message(e), this.t.instant('common.close'), { duration: 6500 });
  }

  /** Ejecuta una acción; si falla muestra el error. Devuelve true si salió bien. */
  async attempt(fn: () => Promise<unknown>, okKey?: string, params?: Params): Promise<boolean> {
    try {
      await fn();
      if (okKey) this.info(okKey, params);
      return true;
    } catch (e) {
      this.error(e);
      return false;
    }
  }

  /** Texto del error ya traducido (también lo usa el login para mostrarlo en pantalla). */
  message(e: unknown): string {
    if (!(e instanceof HttpErrorResponse)) return this.t.instant('err.unexpected');
    if (e.status === 0) return this.t.instant('err.network');
    if (e.status === 429) return this.t.instant('err.tooMany');
    const raw = e.error?.message;
    const text: string = Array.isArray(raw) ? raw.join(' · ') : (raw ?? e.message);
    for (const [re, key, names] of SERVER_MESSAGES) {
      const m = re.exec(text);
      if (m) return this.t.instant(key, Object.fromEntries((names ?? []).map((n, i) => [n, m[i + 1]])));
    }
    return text;
  }
}
