const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildLicenseCertificatePdf,
  getCertificateFileName,
} = require('../src/certificatePdf');

test('buildLicenseCertificatePdf creates a PDF without raw license secrets', async () => {
  const pdf = await buildLicenseCertificatePdf({
    id: '33333333-3333-4333-8333-333333333333',
    applicationId: '11111111-1111-4111-8111-111111111111',
    applicationName: 'SIM Desktop',
    applicationCode: 'SIM-DESKTOP',
    customerId: '22222222-2222-4222-8222-222222222222',
    customerName: 'Cliente Demo',
    customerEmail: 'cliente@example.com',
    serialNumber: 'SIM-FULL-SERIAL-SECRET',
    serialNumberHash: 'HASH-SHOULD-NOT-LEAK',
    serialNumberSuffix: 'ABCD',
    status: 'active',
    validFrom: '2026-06-26T00:00:00.000Z',
    validUntil: '2027-06-26T00:00:00.000Z',
    maxActivations: 3,
    activationCount: 1,
    metadata: {
      plan: 'Professional',
    },
    createdAt: '2026-06-26T00:00:00.000Z',
  });
  const rawPdf = pdf.toString('latin1');

  assert.equal(pdf.subarray(0, 4).toString(), '%PDF');
  assert.ok(pdf.length > 1000);
  assert.ok(!rawPdf.includes('SIM-FULL-SERIAL-SECRET'));
  assert.ok(!rawPdf.includes('HASH-SHOULD-NOT-LEAK'));
});

test('getCertificateFileName returns a stable safe file name', () => {
  assert.equal(
    getCertificateFileName({ id: '33333333-3333-4333-8333-333333333333' }),
    'certificado-licencia-33333333-3333-4333-8333-333333333333.pdf'
  );
});
