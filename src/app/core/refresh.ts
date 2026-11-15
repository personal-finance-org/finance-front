import { Injectable, signal } from '@angular/core';

/** Señal global: cuando algo cambia (nuevo movimiento, abono…), las páginas se vuelven a cargar. */
@Injectable({ providedIn: 'root' })
export class Refresh {
  readonly version = signal(0);
  bump() { this.version.update((v) => v + 1); }
}
