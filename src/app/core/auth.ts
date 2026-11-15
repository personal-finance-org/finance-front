import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Api } from './api';
import { I18n } from './i18n';
import { ProfileDoc, Session, User } from './models';

const KEY = 'finanzas.session';
const toUser = (d: ProfileDoc): User => ({ id: d._id, email: d.email, name: d.name, language: d.language ?? null, currency: d.currency });

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly i18n = inject(I18n);

  private readonly session = signal<Session | null>(this.restore());
  readonly user = computed<User | null>(() => this.session()?.user ?? null);
  readonly token = computed(() => this.session()?.accessToken ?? null);
  readonly isLoggedIn = computed(() => !!this.session());

  /** Al abrir la app: aplica el idioma y la moneda guardados en el perfil de la persona. */
  async init() {
    const u = this.user();
    if (u) await this.applyPrefs(u);
  }

  async login(email: string, password: string) { await this.start(await this.api.login({ email, password })); }

  /** El idioma con el que se registra es el que la persona está viendo (el del navegador si no eligió otro). */
  async register(name: string, email: string, password: string) {
    await this.start(await this.api.register({ name, email, password, language: this.i18n.lang() }));
  }

  logout() {
    this.session.set(null);
    try { localStorage.removeItem(KEY); } catch { /* almacenamiento no disponible */ }
    this.router.navigateByUrl('/login');
  }

  /** Vuelve a leer el perfil (por si cambió desde otro dispositivo). */
  async refreshProfile() {
    try { await this.setUser(toUser(await this.api.me())); } catch { /* si falla, se conserva el perfil local */ }
  }

  /** Actualiza nombre, idioma o moneda. */
  async updateProfile(patch: { name?: string; language?: string; currency?: string }) {
    await this.setUser(toUser(await this.api.updateMe(patch)));
  }

  changePassword(currentPassword: string, newPassword: string) { return this.api.changePassword({ currentPassword, newPassword }); }

  private async start(s: Session) {
    this.session.set(s);
    this.persist();
    await this.applyPrefs(s.user);
    this.router.navigateByUrl('/');
  }

  private async setUser(user: User) {
    const s = this.session();
    if (!s) return;
    this.session.set({ ...s, user });
    this.persist();
    await this.applyPrefs(user);
  }

  /** Idioma y moneda del perfil (si no tiene idioma elegido se conserva el detectado del navegador). */
  private async applyPrefs(u: User) {
    this.i18n.currency.set(u.currency || 'COP');
    if (u.language) await this.i18n.use(u.language); // también lo recuerda como elección de la persona
  }

  private persist() {
    try { localStorage.setItem(KEY, JSON.stringify(this.session())); } catch { /* sin persistencia */ }
  }

  private restore(): Session | null {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Session | null;
      if (s?.user) { s.user.language ??= null; s.user.currency ??= 'COP'; }
      return s;
    } catch { return null; }
  }
}
