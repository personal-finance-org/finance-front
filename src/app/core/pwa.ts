import { Injectable, signal } from '@angular/core';

/** Evento (solo Chromium) que permite mostrar el cuadro nativo de instalación. */
interface InstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type Platform = 'ios' | 'android' | 'safari-mac' | 'firefox' | 'chromium';

const FLAG = 'finanzas.pwa.installed';

/**
 * Estado de instalación de la PWA.
 * - Instalada = abierta como app (display-mode standalone / iOS standalone) o instalada en este navegador.
 * - Chrome/Edge/Android: guarda el evento `beforeinstallprompt` para instalar con un clic.
 * - iOS/Safari/Firefox: no hay instalación programática; se muestran instrucciones.
 */
@Injectable({ providedIn: 'root' })
export class PwaInstall {
  private deferred: InstallPromptEvent | null = (window as unknown as { __installPrompt?: InstallPromptEvent }).__installPrompt ?? null;

  readonly canPrompt = signal(!!this.deferred);
  readonly installed = signal(this.isStandalone() || this.flag());
  readonly platform: Platform = this.detect();
  /** Instalar en el celular exige HTTPS (localhost también cuenta como seguro). */
  readonly secure = window.isSecureContext;

  constructor() {
    if (this.isStandalone()) this.setFlag(true);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferred = e as InstallPromptEvent;
      this.canPrompt.set(true);
      // Si el navegador ofrece instalar, es que aún no está instalada (corrige un estado guardado viejo).
      this.setFlag(false);
      this.installed.set(this.isStandalone());
    });
    window.addEventListener('appinstalled', () => {
      this.deferred = null;
      this.canPrompt.set(false);
      this.setFlag(true);
      this.installed.set(true);
    });
    window.matchMedia('(display-mode: standalone)').addEventListener('change', (e) => {
      if (e.matches) { this.setFlag(true); this.installed.set(true); }
    });
  }

  /** Muestra el cuadro nativo de instalación. Devuelve true si la persona aceptó. */
  async install(): Promise<boolean> {
    if (!this.deferred) return false;
    await this.deferred.prompt();
    const { outcome } = await this.deferred.userChoice;
    this.deferred = null;
    this.canPrompt.set(false);
    if (outcome === 'accepted') { this.setFlag(true); this.installed.set(true); }
    return outcome === 'accepted';
  }

  private isStandalone(): boolean {
    return window.matchMedia('(display-mode: standalone)').matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  }

  private detect(): Platform {
    const ua = navigator.userAgent;
    const iPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    if (/iPhone|iPad|iPod/.test(ua) || iPadOS) return 'ios';
    if (/Android/.test(ua)) return 'android';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Safari\//.test(ua) && !/Chrome\/|Chromium\/|Edg\//.test(ua)) return 'safari-mac';
    return 'chromium';
  }

  private flag() { try { return localStorage.getItem(FLAG) === '1'; } catch { return false; } }
  private setFlag(v: boolean) { try { v ? localStorage.setItem(FLAG, '1') : localStorage.removeItem(FLAG); } catch { /* sin almacenamiento */ } }
}
