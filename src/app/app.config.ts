import { registerLocaleData } from '@angular/common';
import localeEsCo from '@angular/common/locales/es-CO';
import localePt from '@angular/common/locales/pt';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  isDevMode,
} from '@angular/core';
import { MAT_DATE_LOCALE, provideNativeDateAdapter } from '@angular/material/core';
import { MatDatepickerIntl } from '@angular/material/datepicker';
import { MAT_DIALOG_DEFAULT_OPTIONS } from '@angular/material/dialog';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { MatIconRegistry } from '@angular/material/icon';
import { MatPaginatorIntl } from '@angular/material/paginator';
import {
  provideRouter,
  TitleStrategy,
  withComponentInputBinding,
  withViewTransitions,
} from '@angular/router';
import { provideTranslateService } from '@ngx-translate/core';
import { provideTranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { Auth } from './core/auth';
import { authInterceptor } from './core/auth.interceptor';
import { I18n } from './core/i18n';
import { TranslatedDatepickerIntl, TranslatedPaginatorIntl } from './core/material-intl';
import { AppTitleStrategy } from './core/title';
import { provideServiceWorker } from '@angular/service-worker';

// Datos de formato para los tres idiomas (en-US viene incluido en Angular)
registerLocaleData(localeEsCo);
registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding(), withViewTransitions()),
    provideHttpClient(withInterceptors([authInterceptor])),

    // Traducciones: public/i18n/{es,en,pt-BR}.json (useHttpBackend: no pasan por el interceptor de auth, que evita una dependencia circular)
    provideTranslateService({
      fallbackLang: 'es',
      loader: provideTranslateHttpLoader({
        prefix: 'i18n/',
        suffix: '.json',
        useHttpBackend: true,
      }),
    }),
    { provide: TitleStrategy, useClass: AppTitleStrategy },
    { provide: MatPaginatorIntl, useClass: TranslatedPaginatorIntl },
    { provide: MatDatepickerIntl, useClass: TranslatedDatepickerIntl },
    { provide: MAT_DATE_LOCALE, useValue: 'es-CO' },
    provideNativeDateAdapter(),

    {
      provide: MAT_FORM_FIELD_DEFAULT_OPTIONS,
      useValue: { appearance: 'outline', subscriptSizing: 'dynamic' },
    },
    {
      provide: MAT_DIALOG_DEFAULT_OPTIONS,
      useValue: { autoFocus: 'first-tabbable', width: '560px', maxWidth: '96vw' },
    },

    // Antes de mostrar la app: íconos, idioma (guardado → navegador → español) y preferencias del perfil.
    provideAppInitializer(async () => {
      const icons = inject(MatIconRegistry);
      const i18n = inject(I18n);
      const auth = inject(Auth);
      icons.setDefaultFontSetClass('material-symbols-outlined');
      await i18n.init();
      await auth.init();
    }),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
