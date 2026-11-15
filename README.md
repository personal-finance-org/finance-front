# Mis Finanzas — Angular 22 + Material (PWA)

Interfaz de la API de finanzas personales (`../finanzas`). Angular 22 con **signals**, componentes standalone, **zoneless**, rutas con carga perezosa y Angular Material 3 (tema claro/oscuro automático según el sistema).

## Requisitos

- **Node ≥ 24.15** (o ≥ 22.22.3): lo exige el CLI de Angular 22.
- La API corriendo en `http://localhost:3000` (en dev; se define en `src/environments/environment.ts`).

## Arranque

```bash
# 1) Backend (en ../finanzas)
npm run mongo:start && npm run start:dev
npm run seed:demo            # opcional: datos de ejemplo → demo@finanzas.app / demo12345

# 2) UI
npm install
npm start                    # http://localhost:4200
npm run build                # producción en dist/
```

## Pantallas

| Ruta | Qué hace |
|---|---|
| `/login` | Ingreso y registro |
| `/` | Inicio: patrimonio neto, ingresos/gastos del mes, top de categorías, próximos pagos, deudas, presupuestos |
| `/movimientos` | Lista agrupada por día con filtros (texto, tipo, clase de gasto, bolsillo, categoría, fechas), paginación, crear/editar/eliminar |
| `/cuentas` | Cuentas con su saldo **disponible** y, dentro de cada una, sus **bolsillos** (plata apartada): crear/editar, meter y sacar plata, historial y meta de ahorro. Los gastos, abonos a deudas y pagos de gastos frecuentes se pueden pagar **directo desde un bolsillo** (el selector "Pagado desde" agrupa cada cuenta con sus bolsillos). Transferir entre cuentas, archivar, eliminar |
| `/categorias` | Categorías de gasto/ingreso con presupuesto mensual y barra de consumo |
| `/frecuentes` | Gastos frecuentes con estado (vencido / por vencer / al día), pausar y **registrar pago** |
| `/deudas` | Resumen de deudas, mínimos pendientes del mes, tarjetas con progreso |
| `/deudas/:id` | Detalle: dónde está la deuda, progreso, mínimo, vencimiento, meses estimados, historial de **abonos** (uno o varios, con o sin bolsillo) |
| `/reportes` | Selector de mes, serie diaria, categorías, tipo de gasto, cuentas, presupuestos e histórico de 12 meses |

## PWA: instalar como app

**Mis Finanzas** es una Progressive Web App: se puede instalar en el celular o el computador, abre en pantalla completa y carga sin conexión (ver límites abajo).

- **Botón "Instalar app"** (arriba a la derecha y en el login): abre las instrucciones según el dispositivo (iPhone/Safari, Android/Chrome, Chrome/Edge de escritorio, Safari Mac, Firefox). En Chrome/Edge/Android, cuando el navegador lo permite, aparece además **"Instalar ahora"** con el cuadro nativo. Si la app ya está instalada (o se abre como app), el botón **no aparece**.
- **Probarla:** el service worker y la instalación solo existen en la versión de producción:
  ```bash
  npm run preview        # compila y sirve en http://localhost:4300
  ```
  Luego en Chrome/Edge verás el ícono de instalar en la barra de direcciones. Con `npm start` (modo desarrollo) el service worker está desactivado.
- **En el celular necesita HTTPS.** `localhost` cuenta como seguro solo en el mismo equipo; para instalarla en el teléfono hay que publicarla con HTTPS (Netlify, Vercel, Firebase Hosting, Cloudflare Pages…) y apuntar `API_URL` (`src/app/core/config.ts`) a una API también con HTTPS.
- **Sin conexión:** la aplicación (pantallas, textos, íconos) abre desde el caché; los **datos** siempre vienen de la API y no se guardan en caché (son datos financieros: se evita mostrar saldos viejos), así que sin red verás el aviso de que no hay conexión. Las fuentes de Google se cachean tras la primera visita.
- **Actualizaciones:** al publicar una versión nueva, la app lo detecta y muestra "Hay una nueva versión disponible · Actualizar".
- **Archivos:** `public/manifest.webmanifest` (nombre, colores, íconos), `public/icons/` (íconos normales, *maskable* y de Apple), `ngsw-config.json` (qué se cachea), `src/app/core/pwa.ts` y `src/app/shared/install-button.ts` (botón).
- **Cambiar el ícono:** edita `public/favicon.svg` y regenera los PNG de `public/icons/` (192/512 normales y maskable, y `apple-touch-icon.png` de 180 px).

## Idiomas (ngx-translate)

Español, English y Português (Brasil). Los textos están en `public/i18n/{es,en,pt-BR}.json`.

- **Primera carga:** usa el idioma elegido antes en ese navegador; si no hay ninguno, el del navegador (`pt*` → Português, `en*` → English, `es*` o cualquier otro → Español).
- **Al iniciar sesión:** si el perfil tiene un idioma guardado, se aplica ese.
- **Cambiarlo:** en la pantalla de login (selector arriba) o en **Mi perfil → Preferencias** (se guarda en el servidor y se aplica al instante). En el perfil también se cambian nombre, moneda y contraseña.
- **Formatos:** fechas, números, monedas y el calendario siguen el idioma activo; la moneda sale del perfil.
- **Agregar un texto:** crea la clave en los tres JSON y úsala con `{{ 'seccion.clave' | translate }}` (o `TranslateService.instant`). Con parámetros: `{{ 'dash.hello' | translate: { name } }}` y `{{name}}` en el JSON.
- **Agregar un idioma:** nuevo JSON + una entrada en `LANGS` (`core/i18n.ts`) + registrar su locale en `app.config.ts` + permitirlo en el backend (`SUPPORTED_LANGUAGES`).
- Los errores que devuelve la API (en español) se traducen con la tabla de `core/notify.ts`; los que no estén en la tabla se muestran tal cual.

## Estructura

```
src/app/
  core/      api.ts (cliente tipado), auth.ts (sesión con signals), interceptor JWT, guards, modelos, helpers
  layout/    shell.ts (menú lateral responsive + barra superior)
  shared/    confirm-dialog, charts.ts (dona y barras en SVG, sin librerías)
  pages/     una página por sección (+ sus diálogos)
```

- **Estado**: `signal`/`computed`/`effect`; el servicio `Refresh` recarga las páginas cuando algo cambia (nuevo movimiento, abono…).
- **Formularios**: Reactive Forms tipados.
- **Auth**: el JWT se guarda en `localStorage`; un 401 cierra sesión automáticamente.
- **Gráficas**: componentes SVG propios, sin dependencias.
(demo@finanzas.app / demo12345)
## Entornos y despliegue

| Entorno | Comando | API (`src/environments/`) |
|---|---|---|
| Desarrollo | `npm start` | `environment.ts` → `http://localhost:3000` |
| Producción | `npm run build:gh` | `environment.prod.ts` → `https://finance-back.onrender.com` (ajústala a la URL real de tu API) |

### GitHub Pages

La UI queda en `https://personal-finance-org.github.io/finance-front/`. El workflow [deploy.yml](.github/workflows/deploy.yml) compila y publica en cada push a `main`.

1. Repo → **Settings → Pages → Source: GitHub Actions** (una sola vez).
2. `npm run build:gh` compila con `--base-href /finance-front/`, copia `index.html` a `404.html` (así recargar en `/cuentas` no da 404) y crea `.nojekyll`.
3. En el servicio de la API (Render) pon `CORS_ORIGINS=https://personal-finance-org.github.io` (solo el origen, sin ruta ni `/` final).

Si cambias el nombre del repo, ajusta `--base-href` en el script `build:gh`.
