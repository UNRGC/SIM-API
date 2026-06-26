/*
  Datos minimos para probar http/sim-api.http.
  Ejecuta esto despues de docs/database-schema.sql.
*/

INSERT INTO applications (
  application_id,
  name,
  code
)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'SIM Desktop',
  'SIM-DESKTOP'
)
ON CONFLICT (application_id) DO UPDATE
SET
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  updated_at = now();
