# Despliegue Docker en produccion

Esta configuracion deja PostgreSQL, la API y el panel en contenedores separados, con secretos montados como archivos, root filesystem de solo lectura para los servicios Node y puertos publicados solo en `127.0.0.1`. La exposicion publica recomendada se hace con Nginx del host Debian.

## Archivos relevantes

- `compose.production.yaml`: stack de produccion.
- `Dockerfile`: imagen de la API.
- `admin-panel/Dockerfile`: imagen del panel.
- `deploy/env/*.example`: variables no secretas.
- `deploy/secrets/*.example.*`: plantillas de secretos.
- `deploy/nginx/sim-api.conf.example`: reverse proxy recomendado para Debian.

## 1. Preparar variables y secretos

Copia las plantillas y completa los valores reales:

```bash
cp deploy/env/postgres.env.example deploy/env/postgres.env
cp deploy/env/api.env.example deploy/env/api.env
cp deploy/env/panel.env.example deploy/env/panel.env

cp deploy/secrets/postgres_password.example.txt deploy/secrets/postgres_password.txt
cp deploy/secrets/license_hash_secret.example.txt deploy/secrets/license_hash_secret.txt
cp deploy/secrets/admin_api_keys.example.txt deploy/secrets/admin_api_keys.txt
cp deploy/secrets/app_api_keys.example.txt deploy/secrets/app_api_keys.txt
cp deploy/secrets/panel_session_secret.example.txt deploy/secrets/panel_session_secret.txt
cp deploy/secrets/admin-users.example.json deploy/secrets/admin-users.json
```

Valores recomendados:

- `deploy/secrets/postgres_password.txt`: password de PostgreSQL.
- `deploy/secrets/license_hash_secret.txt`: `openssl rand -hex 64`
- `deploy/secrets/admin_api_keys.txt`: `openssl rand -hex 32`
- `deploy/secrets/app_api_keys.txt`: `openssl rand -hex 32`
- `deploy/secrets/panel_session_secret.txt`: `openssl rand -hex 64`

`deploy/env/api.env` ya trae `ADMIN_ALLOWED_IPS=172.29.0.0/24`, que coincide con la red privada definida en `compose.production.yaml`. Si cambias el subnet, actualiza ese valor.

## 2. Generar el password del usuario admin

Puedes reutilizar la imagen del panel para generar el hash Argon2id sin instalar Node en el host:

```bash
docker build -t sim-admin-panel ./admin-panel
docker run --rm -it sim-admin-panel npm run hash-password
```

Pega el hash en `deploy/secrets/admin-users.json`.

## 3. Levantar el stack

```bash
docker compose -f compose.production.yaml up -d --build
docker compose -f compose.production.yaml ps
```

Detalles de runtime:

- PostgreSQL inicializa el esquema montando `docs/database-schema.sql` solo cuando el volumen `postgres_data` esta vacio.
- API y panel arrancan como usuario `node`, con `read_only: true`, `tmpfs` para `/tmp`, `cap_drop: [ALL]` y `no-new-privileges`.
- Los secretos se consumen con `*_FILE`, asi que nunca quedan embebidos en la imagen.
- Los logs usan rotacion de Docker (`10m`, `5` archivos).

## 4. Verificacion local en el host

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3100/health
```

La API queda publicada solo en `127.0.0.1:3000` y el panel solo en `127.0.0.1:3100`. Desde fuera del servidor no seran accesibles mientras no configures el reverse proxy.

## 5. Publicacion con Nginx en Debian

1. Copia `deploy/nginx/sim-api.conf.example` a `/etc/nginx/sites-available/sim-api.conf`.
2. Reemplaza `api.example.com` y `admin.example.com` por tus dominios reales.
3. Genera o instala certificados TLS para ambos dominios. El ejemplo espera certificados de Let's Encrypt en `/etc/letsencrypt/live/<dominio>/`.
4. Habilita el sitio y recarga Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/sim-api.conf /etc/nginx/sites-enabled/sim-api.conf
sudo nginx -t
sudo systemctl reload nginx
```

Esa configuracion publica:

- `POST /api/v1/licenses/validate`
- `POST /api/v1/licenses/deactivate`
- `GET /health`
- Todo el panel administrativo en el dominio admin

Y devuelve `404` para el resto de rutas de la API publica.

## 6. Operacion y actualizaciones

Reconstruir conservando datos:

```bash
git pull
docker compose -f compose.production.yaml build --pull
docker compose -f compose.production.yaml up -d
```

Reconstruir desde cero con el esquema nuevo:

```bash
docker compose -f compose.production.yaml down -v
docker compose -f compose.production.yaml build --pull
docker compose -f compose.production.yaml up -d
docker compose -f compose.production.yaml ps
```

`down -v` elimina el volumen `postgres_data`. Al levantar de nuevo, PostgreSQL queda vacio y ejecuta `docs/database-schema.sql` desde cero.

Ver logs:

```bash
docker compose -f compose.production.yaml logs -f api
docker compose -f compose.production.yaml logs -f admin-panel
docker compose -f compose.production.yaml logs -f db
```

Recrear servicios despues de rotar secretos:

```bash
docker compose -f compose.production.yaml up -d --force-recreate api admin-panel
```

## 7. Backups y restauracion

- Respalda el volumen `postgres_data` antes de actualizar el esquema o la version de PostgreSQL.
- Respalda tambien `deploy/env/` y `deploy/secrets/`.
- Si necesitas reejecutar el script de `docs/database-schema.sql`, usa un volumen nuevo o `docker compose -f compose.production.yaml down -v` sabiendo que eso elimina los datos existentes.

## 8. Estrategia de despliegue

La estrategia incluida es adecuada para una sola VM Debian:

- build local en el servidor con `docker compose`
- puertos de contenedores enlazados solo a loopback
- exposicion publica controlada por Nginx
- reinicios automaticos con `restart: unless-stopped`

Esto da despliegues repetibles y un reinicio corto durante `up -d`. Si necesitas cero downtime real, despliegue blue/green o varias replicas, el siguiente paso es mover la misma imagen a un orquestador o a un segundo host con balanceo delante.
