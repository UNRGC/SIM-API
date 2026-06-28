const test = require('node:test');
const assert = require('node:assert/strict');

process.env.LICENSE_HASH_SECRET = 'test-license-hash-secret';

const servicePath = require.resolve('../src/services/licenseService');
const licenseRepositoryPath = require.resolve('../src/repositories/licenseRepository');
const licenseActivationRepositoryPath = require.resolve('../src/repositories/licenseActivationRepository');
const licenseEventRepositoryPath = require.resolve('../src/repositories/licenseEventRepository');
const postgresPath = require.resolve('../src/db/postgres');

const baseLicense = {
  id: '33333333-3333-4333-8333-333333333333',
  applicationId: '11111111-1111-4111-8111-111111111111',
  applicationName: 'SIM Desktop',
  applicationCode: 'SIM-DESKTOP',
  customerId: '22222222-2222-4222-8222-222222222222',
  customerName: 'Cliente Demo',
  customerEmail: 'cliente@example.com',
  customerRfc: 'XAXX010101000',
  serialNumberSuffix: 'MNPQR',
  status: 'active',
  validFrom: new Date('2026-01-01T00:00:00.000Z'),
  validUntil: new Date('2099-01-01T00:00:00.000Z'),
  maxActivations: 1,
  activationCount: 0,
  metadata: null,
};

const withMockedService = async (mocks, fn) => {
  const originals = new Map();

  for (const modulePath of [
    servicePath,
    licenseRepositoryPath,
    licenseActivationRepositoryPath,
    licenseEventRepositoryPath,
    postgresPath,
  ]) {
    originals.set(modulePath, require.cache[modulePath]);
    delete require.cache[modulePath];
  }

  require.cache[licenseRepositoryPath] = {
    id: licenseRepositoryPath,
    filename: licenseRepositoryPath,
    loaded: true,
    exports: mocks.licenseRepository,
  };
  require.cache[licenseActivationRepositoryPath] = {
    id: licenseActivationRepositoryPath,
    filename: licenseActivationRepositoryPath,
    loaded: true,
    exports: mocks.licenseActivationRepository,
  };
  require.cache[licenseEventRepositoryPath] = {
    id: licenseEventRepositoryPath,
    filename: licenseEventRepositoryPath,
    loaded: true,
    exports: mocks.licenseEventRepository,
  };
  require.cache[postgresPath] = {
    id: postgresPath,
    filename: postgresPath,
    loaded: true,
    exports: mocks.postgres,
  };

  try {
    const service = require('../src/services/licenseService');
    await fn(service);
  } finally {
    for (const [modulePath, cachedModule] of originals) {
      delete require.cache[modulePath];
      if (cachedModule) {
        require.cache[modulePath] = cachedModule;
      }
    }
  }
};

const createMocks = ({ license = baseLicense, created = false, activeCount = 1 } = {}) => {
  const calls = {
    queries: [],
    events: [],
    createOrTouch: [],
    syncActivationCount: [],
  };
  const client = {
    async query(sql) {
      calls.queries.push(sql);
    },
    release() {},
  };
  const updatedLicense = {
    ...license,
    activationCount: activeCount,
  };

  return {
    calls,
    licenseRepository: {
      async findBySerialHash() {
        return license;
      },
      async findBySerialHashForUpdate() {
        return license;
      },
      async syncActivationCount() {
        calls.syncActivationCount.push(license.id);
        return updatedLicense;
      },
    },
    licenseActivationRepository: {
      async createOrTouch(_client, payload) {
        calls.createOrTouch.push(payload);
        return {
          activation: {
            id: 1,
            licenseId: payload.licenseId,
            deviceName: payload.deviceName,
          },
          created,
        };
      },
      async countActive() {
        return activeCount;
      },
    },
    licenseEventRepository: {
      async create(payload) {
        calls.events.push(payload);
      },
    },
    postgres: {
      getPool() {
        return {
          async connect() {
            return client;
          },
        };
      },
    },
  };
};

test('validateLicense requires deviceId for app keys', async () => {
  const mocks = createMocks();

  await withMockedService(mocks, async (service) => {
    await assert.rejects(
      () =>
        service.validateLicense(
          {
            serialNumber: 'ABCDE-23456-FGHJK-789KL-MNPQR',
            applicationId: baseLicense.applicationId,
          },
          {},
          { isApp: true, isAdmin: false }
        ),
      {
        code: 'DEVICE_ID_REQUIRED',
        statusCode: 400,
      }
    );
  });
});

test('validateLicense allows an already active device without consuming activation slots', async () => {
  const mocks = createMocks({ created: false, activeCount: 1 });

  await withMockedService(mocks, async (service) => {
    const result = await service.validateLicense(
      {
        serialNumber: 'ABCDE-23456-FGHJK-789KL-MNPQR',
        applicationId: baseLicense.applicationId,
        deviceId: 'sim-device-001',
        deviceName: 'Caja principal',
      },
      {},
      { isApp: true, isAdmin: false }
    );

    assert.equal(result.valid, true);
    assert.equal(result.license.activationCount, 1);
    assert.equal(mocks.calls.createOrTouch.length, 1);
    assert.equal(mocks.calls.events[0].eventType, 'license.validated');
  });
});

test('validateLicense rejects a new device when maxActivations is reached', async () => {
  const mocks = createMocks({ created: true, activeCount: 2 });

  await withMockedService(mocks, async (service) => {
    const result = await service.validateLicense(
      {
        serialNumber: 'ABCDE-23456-FGHJK-789KL-MNPQR',
        applicationId: baseLicense.applicationId,
        deviceId: 'sim-device-002',
      },
      {},
      { isApp: true, isAdmin: false }
    );

    assert.equal(result.valid, false);
    assert.equal(result.reason, 'activation_limit_reached');
    assert.equal(mocks.calls.syncActivationCount.length, 0);
    assert.equal(mocks.calls.events[0].eventType, 'license.validation_failed');
    assert.equal(mocks.calls.events[0].details.reason, 'activation_limit_reached');
  });
});
