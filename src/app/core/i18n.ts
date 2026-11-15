import { Injectable, computed, inject, signal } from '@angular/core';
import { DateAdapter } from '@angular/material/core';
import { TranslateService } from '@ngx-translate/core';
import { firstValueFrom } from 'rxjs';

export type Lang = 'es' | 'en' | 'pt-BR';

export const LANGS: { code: Lang; label: string; locale: string; flag: string }[] = [
  { code: 'es', label: 'Español', locale: 'es-CO', flag: '🇨🇴' },
  { code: 'en', label: 'English', locale: 'en-US', flag: '🇺🇸' },
  { code: 'pt-BR', label: 'Português (Brasil)', locale: 'pt-BR', flag: '🇧🇷' },
];
export const CURRENCIES = ['COP', 'USD', 'EUR', 'BRL', 'MXN', 'ARS', 'CLP', 'PEN'];

const KEY = 'finanzas.lang';

/** Idioma y moneda activos. Prioridad del idioma: el que eligió la persona → el del navegador → español. */
@Injectable({ providedIn: 'root' })
export class I18n {
  private readonly translate = inject(TranslateService);
  private readonly dates = inject(DateAdapter);

  readonly lang = signal<Lang>('es');
  readonly currency = signal('COP');
  readonly locale = computed(() => LANGS.find((l) => l.code === this.lang())!.locale);

  /** Carga el idioma inicial (se llama antes de mostrar la app para no ver claves sin traducir). */
  async init() {
    await this.use(this.stored() ?? this.fromBrowser(), false);
  }

  /** Cambia el idioma. `persist` lo recuerda en este navegador como elección de la persona. */
  async use(lang: Lang, persist = true) {
    await firstValueFrom(this.translate.use(lang));
    this.lang.set(lang);
    document.documentElement.lang = lang;
    this.dates.setLocale(this.locale());
    if (persist) {
      try { localStorage.setItem(KEY, lang); } catch { /* sin almacenamiento */ }
    }
  }

  /** Primer idioma del navegador que soportamos (pt* → pt-BR, en* → en, es* → es). */
  fromBrowser(): Lang {
    for (const l of navigator.languages?.length ? navigator.languages : [navigator.language]) {
      const x = (l ?? '').toLowerCase();
      if (x.startsWith('pt')) return 'pt-BR';
      if (x.startsWith('en')) return 'en';
      if (x.startsWith('es')) return 'es';
    }
    return 'es';
  }

  private stored(): Lang | null {
    try {
      const v = localStorage.getItem(KEY);
      return LANGS.some((l) => l.code === v) ? (v as Lang) : null;
    } catch { return null; }
  }
}
