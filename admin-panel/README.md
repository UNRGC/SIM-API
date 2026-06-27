# SIM Admin Panel

Panel web independiente para administrar SIM API sin exponer `ADMIN_API_KEY` al navegador.

## Arquitectura

- `admin-panel/server.js`: servidor Express separado del API principal.
- `public/`: frontend estatico servido por el panel.
- `src/routes/authRoutes.js`: login, logout y sesion actual.
- `src/routes/panelApiRoutes.js`: endpoints internos del panel.
- `src/apiClient.js`: cliente server-side hacia SIM API usando `SIM_API_ADMIN_KEY`.
- `src/session.js`: sesiones firmadas, cookie `HttpOnly`, cookie CSRF y permisos.
- `config/admin-users.json`: usuarios autorizados con password hash Argon2id.

El navegador solo habla con `/admin/api/*`. La key administrativa vive en variables de entorno del servidor del panel.

## Configuracion

1. Instala dependencias:

```bash
cd admin-panel
npm install
```

2. Crea `.env` desde `.env.example`:

```env
PANEL_PORT=3100
PANEL_COOKIE_SECURE=false
PANEL_SESSION_SECRET=valor_largo_aleatorio
SIM_API_BASE_URL=http://localhost:3000
SIM_API_ADMIN_KEY=tu_admin_api_key
ADMIN_USERS_FILE=./config/admin-users.json
```

En produccion usa `PANEL_COOKIE_SECURE=true` y HTTPS.
En la API principal configura `ADMIN_ALLOWED_IPS` con la IP del panel, del reverse proxy o de la red privada desde donde el panel llamara a la API. En produccion la API exige esta variable explicitamente.

3. Genera un hash Argon2id:

```bash
npm run hash-password
```

4. Crea `config/admin-users.json` usando `config/admin-users.example.json` como base:

```json
[
  {
    "username": "admin",
    "displayName": "Administrador",
    "passwordHash": "HASH_ARGON2ID",
    "roles": ["admin"],
    "permissions": ["*"],
    "disabled": false
  }
]
```

Permisos soportados:

```text
applications:read
applications:write
customers:read
customers:write
licenses:read
licenses:write
*
```

5. Inicia API y panel:

```bash
# raiz del repo
npm run dev

# otra terminal
cd admin-panel
npm run dev
```

Abre `http://localhost:3100`.

## Seguridad

- `ADMIN_API_KEY` no se entrega al frontend.
- Passwords con Argon2id, no texto claro.
- Sesion con cookie firmada `HttpOnly`, `SameSite=Strict`.
- CSRF obligatorio en operaciones mutables.
- Rate limit para login y endpoints internos.
- Validacion de entrada con Zod en el panel y en la API.
- CSP, `helmet` y bloqueo de framing.
- Logs redactan cookies, tokens y secretos.
- Autorizacion por permisos.

## Produccion

- Usa HTTPS y `PANEL_COOKIE_SECURE=true`.
- Genera `PANEL_SESSION_SECRET` de al menos 32 bytes aleatorios.
- No subas `.env` ni `config/admin-users.json` a Git.
- Sirve el panel detras de un reverse proxy con TLS.
- Restringe acceso por red/VPN si el panel es solo interno.
- Rota `SIM_API_ADMIN_KEY` si se sospecha exposicion.
- Mantén el panel y la API en redes privadas cuando sea posible.
- Si ejecutas mas de una instancia del panel, reemplaza las sesiones en memoria por un store compartido como Redis.
