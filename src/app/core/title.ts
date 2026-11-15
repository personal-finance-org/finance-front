import { Injectable, inject } from '@angular/core';
import { RouterStateSnapshot, TitleStrategy } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

/** El `title` de cada ruta es una clave de traducción; se vuelve a traducir al cambiar de idioma. */
@Injectable({ providedIn: 'root' })
export class AppTitleStrategy extends TitleStrategy {
  private readonly t = inject(TranslateService);
  private key = '';

  constructor() {
    super();
    this.t.onLangChange.subscribe(() => this.apply());
  }

  override updateTitle(snapshot: RouterStateSnapshot) {
    this.key = this.buildTitle(snapshot) ?? '';
    this.apply();
  }

  private apply() {
    document.title = (this.key ? this.t.instant(this.key) + ' · ' : '') + 'Mis Finanzas';
  }
}
