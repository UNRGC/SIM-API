# SIM API

API REST en Node.js para administrar clientes, aplicaciones y licencias con PostgreSQL.

## Configuracion

1. Instala dependencias:

```bash
npm install
```

2. Crea un archivo `.env` a partir de `.env.example` y agrega tus credenciales:

```bash
DB_HOST=
DB_PORT=5432
DB_DATABASE=
DB_USER=
DB_PASSWORD=
DB_SSL=false
DB_SSL_REJECT_UNAUTHORIZED=true
LICENSE_HASH_SECRET=
ADMIN_API_KEYS=
APP_API_KEYS=
CORS_ORIGINS=
```

`LICENSE_HASH_SECRET` debe ser un valor aleatorio largo y privado. `ADMIN_API_KEYS` y `APP_API_KEYS` aceptan una o varias keys separadas por coma. `CORS_ORIGINS` acepta origenes permitidos separados por coma, por ejemplo `https://admin.tudominio.com,https://app.tudominio.com`.

3. Revisa `docs/database-schema.sql`. Es una propuesta de tablas, llaves e indices; la API no ejecuta ese script automaticamente.

## Scripts

```bash
npm run dev
npm start
npm test
npm run admin:install
npm run admin:dev
```

## Panel Administrativo

El repo incluye un panel web independiente en [`admin-panel`](admin-panel). El panel funciona como BFF: autentica usuarios administrativos con login propio, mantiene sesiones seguras y llama a esta API usando `SIM_API_ADMIN_KEY` solo desde el servidor del panel. El navegador nunca recibe `ADMIN_API_KEY`.

Documentacion:

- [Guia del panel](admin-panel/README.md)
- [Arquitectura del panel](docs/admin-panel-architecture.md)

Flujo recomendado:

```text
1. API: npm run dev
2. Panel: npm run admin:install
3. Panel: configurar admin-panel/.env y admin-panel/config/admin-users.json
4. Panel: npm run admin:dev
5. Abrir http://localhost:3100
```

## Endpoints

Todas las rutas administrativas requieren una key de `ADMIN_API_KEYS` en el header `x-api-key`. La validacion de licencias desde apps puede usar una key de `APP_API_KEYS`.

Aplicaciones: `/api/v1/applications`

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `POST` | `/` | Registra una aplicacion. |
| `GET` | `/` | Lista aplicaciones con filtros opcionales. |
| `GET` | `/:applicationId` | Consulta una aplicacion por id. |
| `PATCH` | `/:applicationId` | Actualiza nombre, codigo o estado. |

Clientes: `/api/v1/customers`

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `POST` | `/` | Registra un cliente con datos fiscales opcionales. |
| `GET` | `/` | Lista clientes con filtros opcionales. |
| `GET` | `/:customerId` | Consulta un cliente por id. |
| `PATCH` | `/:customerId` | Actualiza datos administrativos o fiscales. |

Licencias: `/api/v1/licenses`

| Metodo | Ruta | Descripcion |
| --- | --- | --- |
| `POST` | `/` | Crea una licencia y devuelve el numero de serie una sola vez. |
| `GET` | `/` | Lista licencias con filtros opcionales. |
| `GET` | `/:licenseId` | Consulta una licencia por id. |
| `POST` | `/validate` | Valida un numero de serie. |
| `POST` | `/:licenseId/revoke` | Revoca una licencia. |
| `POST` | `/:licenseId/renew` | Renueva o extiende vigencia. |

- `ADMIN_API_KEYS`: permite administrar aplicaciones, clientes y licencias; tambien puede validar.
- `APP_API_KEYS`: permite solo validar licencias.

## Ejemplos

Crear aplicacion:

```json
{
  "name": "SIM Desktop",
  "code": "SIM-DESKTOP"
}
```

Crear cliente:

```json
{
  "externalRef": "demo-customer",
  "name": "Cliente Demo",
  "email": "cliente@example.com",
  "rfc": "XAXX010101000",
  "fiscalRegime": "General de Ley Personas Morales",
  "postalCode": "64000"
}
```

Crear licencia:

```bash
curl -X POST http://localhost:3000/api/v1/licenses \
  -H "content-type: application/json" \
  -H "x-api-key: TU_ADMIN_API_KEY" \
  -d @payload.json
```

```json
{
  "applicationId": "11111111-1111-4111-8111-111111111111",
  "customer": {
    "externalRef": "demo-customer",
    "name": "Cliente Demo",
    "email": "cliente@example.com",
    "rfc": "XAXX010101000",
    "fiscalRegime": "General de Ley Personas Morales",
    "postalCode": "64000"
  },
  "validFrom": "2026-06-26T00:00:00.000Z",
  "validUntil": "2027-06-26T00:00:00.000Z",
  "maxActivations": 3,
  "metadata": {
    "plan": "pro",
    "ownerName": "Cliente Demo"
  }
}
```

Tambien puedes crear una licencia con un cliente existente enviando `customerId` en lugar de `customer`. El objeto `customer` crea o actualiza el cliente por `externalRef` si viene informado; RFC, regimen fiscal y CP se guardan para administracion interna y no se exponen en la respuesta de validacion.

Validar licencia:

```bash
curl -X POST http://localhost:3000/api/v1/licenses/validate \
  -H "content-type: application/json" \
  -H "x-api-key: TU_APP_API_KEY" \
  -d @payload.json
```

```json
{
  "serialNumber": "ABCDE-23456-FGHJK-789KL-MNPQR",
  "applicationId": "11111111-1111-4111-8111-111111111111"
}
```

Respuesta de validacion para llenar la pantalla de licencia:

```json
{
  "data": {
    "valid": true,
    "reason": null,
    "message": "Licencia valida.",
    "ownerName": "Cliente Demo",
    "ownerEmail": "cliente@example.com",
    "applicationName": "SIM Desktop",
    "applicationCode": "SIM-DESKTOP",
    "status": "valid",
    "validFrom": "2026-06-26T00:00:00.000Z",
    "validUntil": "2027-06-26T00:00:00.000Z",
    "license": {
      "id": "33333333-3333-4333-8333-333333333333",
      "status": "active"
    }
  }
}
```

`ownerName` se toma de `customers.name`. Si ese dato no existe en la respuesta por algun motivo, la API usa como respaldo `license.metadata.ownerName`.

Mapeo recomendado para tu formulario:

```js
numeroSerieInput.value = serialNumber;
propietarioInput.value = result.data.ownerName || '';
vigenciaInput.value = result.data.validUntil || '';
estadoInput.value = result.data.valid ? 'Valida' : result.data.reason;
```

Ejemplo de funcion de validacion desde la app:

```js
async function validarLicencia(serialNumber) {
  const response = await fetch('https://tu-api.com/api/v1/licenses/validate', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': 'TU_APP_API_KEY'
    },
    body: JSON.stringify({
      serialNumber,
      applicationId: '11111111-1111-4111-8111-111111111111'
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'No fue posible validar la licencia.');
  }

  return result.data;
}
```

Renovar licencia:

```json
{
  "validUntil": "2028-06-26T00:00:00.000Z"
}
```

## HTTP client files

Si usas un IDE con cliente HTTP, abre [`http/sim-api.http`](http/sim-api.http) y edita las variables del encabezado antes de ejecutar las requests.

Antes de probar con esos ejemplos, ejecuta [`docs/database-schema.sql`](docs/database-schema.sql) en tu base PostgreSQL. El flujo recomendado es crear la aplicacion con `POST /api/v1/applications` o desde el panel administrativo.

## Seguridad aplicada

- Numeros de serie generados con `crypto.randomBytes`.
- Los numeros de serie no se guardan en texto claro; se persiste `SerialNumberHash` con HMAC-SHA256 y un sufijo para soporte operativo.
- Autenticacion por API key con separacion entre keys administrativas y keys de aplicacion.
- Comparacion de API keys con `crypto.timingSafeEqual`.
- CORS restringible por `CORS_ORIGINS`.
- Rate limits separados para administracion y validacion.
- Auditoria de eventos en `LicenseEvents` para creacion, validacion, revocacion y renovacion.
- Queries parametrizados con `pg`.
- Validacion de entrada con Zod.
- `helmet`, CORS, rate limit y limite de tamano JSON.
- Middleware centralizado de errores.
- Separacion por capas: rutas, controladores, servicios, repositorios, base de datos y utilidades.

## Estructura

```text
src/
  app.js
  server.js
  config/
  controllers/
  db/
  middlewares/
  repositories/
  routes/
  schemas/
  services/
  utils/
docs/
  database-schema.sql
```
