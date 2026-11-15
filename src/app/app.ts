import { Component, inject } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterOutlet } from '@angular/router';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { TranslateService } from '@ngx-translate/core';
import { filter } from 'rxjs';
import { GlobalLoader } from './shared/global-loader';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, GlobalLoader],
  template: '<router-outlet /><app-global-loader />',
})
export class App {
  constructor() {
    const snack = inject(MatSnackBar);
    const t = inject(TranslateService);
    // Cuando el service worker descarga una versión nueva, avisa y deja recargar con un clic.
    inject(SwUpdate).versionUpdates
      .pipe(filter((e): e is VersionReadyEvent => e.type === 'VERSION_READY'))
      .subscribe(() => snack.open(t.instant('pwa.updateAvailable'), t.instant('pwa.reload')).onAction().subscribe(() => location.reload()));
  }
}
