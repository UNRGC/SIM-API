const PDFDocument = require('pdfkit');

const formatDate = (value) => {
  if (!value) {
    return 'No definido';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(date);
};

const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) {
    return 'No definido';
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
};

const statusLabels = {
  active: 'Activa',
  suspended: 'Suspendida',
  revoked: 'Revocada',
  expired: 'Expirada',
};

const cleanText = (value, fallback = 'No disponible') => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return String(value).replace(/\s+/g, ' ').trim();
};

const serialReference = (license) =>
  license.serialNumberSuffix ? `****-${cleanText(license.serialNumberSuffix)}` : 'No disponible';

const getCertificateFileName = (license) => {
  const id = cleanText(license.id, 'licencia').replace(/[^a-zA-Z0-9_-]+/g, '-');
  return `certificado-licencia-${id}.pdf`;
};

const writeSectionTitle = (doc, title) => {
  doc.moveDown(0.9);
  doc
    .font('Helvetica-Bold')
    .fontSize(11)
    .fillColor('#0f766e')
    .text(title.toUpperCase(), { characterSpacing: 0.2 });
  doc.moveDown(0.25);
  doc.strokeColor('#d7dde6').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
  doc.moveDown(0.45);
};

const writeField = (doc, label, value) => {
  const startY = doc.y;
  doc.font('Helvetica-Bold').fontSize(9).fillColor('#627084').text(label, 50, startY, {
    width: 160,
  });
  doc.font('Helvetica').fontSize(10).fillColor('#1d2433').text(cleanText(value), 210, startY, {
    width: 335,
  });
  doc.moveDown(0.55);
};

const buildLicenseCertificatePdf = (license, options = {}) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const issuedAt = options.issuedAt || new Date();
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      info: {
        Title: `Certificado de adquisicion ${cleanText(license.id)}`,
        Author: 'SIM Admin',
        Subject: 'Certificado de adquisicion de licencia',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 595.28, 92).fill('#111827');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(20)
      .text('Certificado de adquisicion', 50, 34);
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#cbd5e1')
      .text('Documento administrativo de licencia emitido por SIM Admin', 50, 61);

    doc.y = 122;
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#1d2433')
      .text(
        'Este documento acredita la adquisicion de una licencia para la aplicacion indicada y el titular registrado. No contiene secretos operativos, API keys, hashes ni el numero de serie completo.',
        { width: 495, align: 'left' }
      );

    writeSectionTitle(doc, 'Licencia');
    writeField(doc, 'ID de licencia', license.id);
    writeField(doc, 'Referencia de serie', serialReference(license));
    writeField(doc, 'Estado', statusLabels[license.status] || license.status);
    writeField(doc, 'Vigencia desde', formatDate(license.validFrom));
    writeField(doc, 'Vigencia hasta', formatDate(license.validUntil));
    writeField(doc, 'Maximo de activaciones', license.maxActivations);
    writeField(doc, 'Activaciones registradas', license.activationCount);
    if (license.metadata?.plan) {
      writeField(doc, 'Plan', license.metadata.plan);
    }
    writeField(doc, 'Fecha de emision', formatDate(license.createdAt));

    writeSectionTitle(doc, 'Aplicacion');
    writeField(doc, 'Nombre', license.applicationName);
    writeField(doc, 'Codigo', license.applicationCode);
    writeField(doc, 'ID de aplicacion', license.applicationId);

    writeSectionTitle(doc, 'Titular');
    writeField(doc, 'Nombre / razon social', license.customerName);
    writeField(doc, 'Email', license.customerEmail);
    writeField(doc, 'ID de cliente', license.customerId);

    writeSectionTitle(doc, 'Seguridad');
    writeField(doc, 'Numero de serie completo', 'Oculto; solo se muestra la referencia final.');
    writeField(doc, 'Hash de licencia', 'No incluido en este documento.');
    writeField(doc, 'Secretos/API keys', 'No incluidos en este documento.');

    const footerY = 760;
    doc
      .strokeColor('#d7dde6')
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#627084')
      .text(`Generado el ${formatDateTime(issuedAt)} UTC`, 50, footerY + 12, {
        width: 240,
      })
      .text('Para validacion operativa utiliza el servicio oficial de validacion de licencias.', 275, footerY + 12, {
        width: 270,
        align: 'right',
      });

    doc.end();
  });

module.exports = {
  buildLicenseCertificatePdf,
  getCertificateFileName,
};
