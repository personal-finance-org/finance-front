import { HttpInterceptorFn } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

const SHOW_AFTER_MS = 250; // evita parpadeos en peticiones rápidas
const SLOW_AFTER_MS = 4000; // servidor gratuito dormido: avisa que puede tardar

/** Cuenta las peticiones HTTP en curso para mostrar el loader global. */
@Injectable({ providedIn: 'root' })
export class Loading {
  private readonly pending = signal(0);
  private readonly _visible = signal(false);
  private readonly _slow = signal(false);
  readonly visible = this._visible.asReadonly();
  readonly slow = this._slow.asReadonly();
  readonly busy = computed(() => this.pending() > 0);
  private showTimer?: ReturnType<typeof setTimeout>;
  private slowTimer?: ReturnType<typeof setTimeout>;

  start() {
    if (this.pending() === 0) {
      this.showTimer = setTimeout(() => this._visible.set(true), SHOW_AFTER_MS);
      this.slowTimer = setTimeout(() => this._slow.set(true), SLOW_AFTER_MS);
    }
    this.pending.update((n) => n + 1);
  }

  stop() {
    this.pending.update((n) => Math.max(0, n - 1));
    if (this.pending() === 0) {
      clearTimeout(this.showTimer);
      clearTimeout(this.slowTimer);
      this._visible.set(false);
      this._slow.set(false);
    }
  }
}

export const loadingInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(Loading);
  loading.start();
  return next(req).pipe(finalize(() => loading.stop()));
};
