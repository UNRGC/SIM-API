/*
  Esquema propuesto para PostgreSQL.
  La API no ejecuta este archivo automaticamente.
  En compose.production.yaml se monta como script de init de PostgreSQL y solo corre
  al crear un volumen nuevo.
*/

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE applications (
  application_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  code VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_applications_code
  ON applications (code);

CREATE TABLE customers (
  customer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  external_ref VARCHAR(120) NULL,
  name VARCHAR(200) NOT NULL,
  email VARCHAR(320) NULL,
  rfc VARCHAR(13) NULL,
  fiscal_regime VARCHAR(120) NULL,
  postal_code CHAR(5) NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_customers_email
  ON customers (email)
  WHERE email IS NOT NULL;

CREATE UNIQUE INDEX ux_customers_external_ref
  ON customers (external_ref)
  WHERE external_ref IS NOT NULL;

CREATE INDEX ix_customers_rfc
  ON customers (rfc)
  WHERE rfc IS NOT NULL;

CREATE TABLE licenses (
  license_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES applications (application_id),
  customer_id UUID NOT NULL REFERENCES customers (customer_id),
  serial_number_hash CHAR(64) NOT NULL,
  serial_number_suffix VARCHAR(8) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  valid_from TIMESTAMPTZ NOT NULL,
  valid_until TIMESTAMPTZ NOT NULL,
  max_activations INTEGER NOT NULL DEFAULT 1,
  activation_count INTEGER NOT NULL DEFAULT 0,
  metadata_json JSONB NULL,
  revoked_at TIMESTAMPTZ NULL,
  revoked_reason VARCHAR(500) NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_licenses_status
    CHECK (status IN ('active', 'suspended', 'revoked', 'expired')),
  CONSTRAINT ck_licenses_validity
    CHECK (valid_until > valid_from),
  CONSTRAINT ck_licenses_max_activations
    CHECK (max_activations > 0),
  CONSTRAINT ck_licenses_activation_count
    CHECK (activation_count >= 0 AND activation_count <= max_activations)
);

CREATE UNIQUE INDEX ux_licenses_serial_number_hash
  ON licenses (serial_number_hash);

CREATE INDEX ix_licenses_application_status_valid_until
  ON licenses (application_id, status, valid_until)
  INCLUDE (customer_id, serial_number_suffix);

CREATE INDEX ix_licenses_customer_status
  ON licenses (customer_id, status)
  INCLUDE (application_id, valid_until);

CREATE INDEX ix_licenses_created_at
  ON licenses (created_at DESC);

CREATE TABLE license_events (
  license_event_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  license_id UUID NOT NULL REFERENCES licenses (license_id),
  event_type VARCHAR(40) NOT NULL,
  event_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor VARCHAR(150) NULL,
  ip_address VARCHAR(45) NULL,
  details_json JSONB NULL,
  CONSTRAINT ck_license_events_event_type
    CHECK (event_type IN (
      'license.created',
      'license.validated',
      'license.validation_failed',
      'license.revoked',
      'license.renewed'
    ))
);

CREATE INDEX ix_license_events_license_event_at
  ON license_events (license_id, event_at DESC);

CREATE INDEX ix_license_events_event_type_event_at
  ON license_events (event_type, event_at DESC);
