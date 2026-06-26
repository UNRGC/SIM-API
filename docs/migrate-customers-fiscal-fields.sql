/*
  Migracion para bases PostgreSQL existentes.
  No hace falta ejecutarla si creaste la base desde docs/database-schema.sql despues de este cambio.
*/

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS rfc VARCHAR(13) NULL,
  ADD COLUMN IF NOT EXISTS fiscal_regime VARCHAR(120) NULL,
  ADD COLUMN IF NOT EXISTS postal_code CHAR(5) NULL;

CREATE INDEX IF NOT EXISTS ix_customers_rfc
  ON customers (rfc)
  WHERE rfc IS NOT NULL;
