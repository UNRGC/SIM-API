# Arquitectura del Panel Administrativo

## Objetivo

Administrar aplicaciones, clientes y licencias desde un panel web independiente sin depender de Postman ni exponer credenciales administrativas en el navegador.

## Componentes

- **SIM API**: API existente. Mantiene datos y reglas de negocio.
- **Admin Panel BFF**: servidor Express independiente que autentica usuarios administrativos y consume SIM API con `ADMIN_API_KEY`.
- **Frontend del panel**: aplicacion estatica servida por el BFF. Consume solo endpoints internos `/admin/api/*`.

## Flujo de Autenticacion

1. El usuario abre el panel.
2. El frontend consulta `/admin/api/auth/me`.
3. Si no hay sesion, muestra login.
4. El usuario envia usuario y password a `/admin/api/auth/login`.
5. El BFF verifica password con Argon2id.
6. El BFF crea sesion firmada y entrega token CSRF.
7. Las operaciones mutables envian `x-csrf-token`.

## Flujo de Administracion

1. El frontend llama `/admin/api/applications`, `/customers` o `/licenses`.
2. El BFF valida sesion, CSRF y permisos.
3. El BFF valida payload con Zod.
4. El BFF llama a SIM API con `x-api-key: SIM_API_ADMIN_KEY`.
5. La respuesta vuelve al frontend sin exponer la key.

## Modelo de Permisos

- `applications:read`
- `applications:write`
- `customers:read`
- `customers:write`
- `licenses:read`
- `licenses:write`
- `*`

## Controles de Seguridad

- Password hashing Argon2id.
- Cookies `HttpOnly`, `SameSite=Strict`, `Secure` en produccion.
- CSRF para POST/PATCH.
- Rate limit para login y endpoints internos.
- CSP con `helmet`.
- Validacion de entrada en panel y API.
- Secretos solo en variables de entorno.
- Logs con redaccion de cookies, tokens y keys.
- Rutas desconocidas bajo `/admin/api` devuelven JSON 404 y no caen al fallback del frontend.

## Despliegue Recomendado

```text
Internet/VPN
    |
Reverse proxy TLS
    |
Admin Panel BFF  --->  SIM API privada  ---> PostgreSQL
```

El panel puede vivir en otro host o contenedor. La API administrativa debe quedar accesible solo desde el panel o red interna cuando sea posible.

Para despliegues con mas de una instancia del panel, sustituye el almacenamiento de sesiones en memoria por un store compartido como Redis.

## API Publica vs Administrativa

La API puede exponerse a internet para validacion de licencias, pero no es recomendable exponer libremente toda la superficie administrativa.

Publico:

```text
POST /api/v1/licenses/validate
```

Administrativo:

```text
/api/v1/applications
/api/v1/customers
/api/v1/licenses excepto /validate
```

Las rutas administrativas tienen dos barreras:

- `ADMIN_ALLOWED_IPS`: allowlist de IP/CIDR del panel, reverse proxy o red interna. En produccion debe configurarse explicitamente.
- `ADMIN_API_KEYS`: credencial administrativa enviada solo por el BFF/panel.

Si la API esta detras de un proxy confiable, configura `TRUST_PROXY=true` para que Express use la IP real del cliente/proxy autorizado. Si dejas `TRUST_PROXY=false` detras de un proxy local, Express puede ver solo `127.0.0.1`; por eso el reverse proxy tambien debe bloquear rutas administrativas publicas o pasar la IP real de forma confiable.
