const PDFDocument = require('pdfkit');

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

const formatDate = (value) => {
  if (!value) {
    return 'No definida';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return cleanText(value);
  }

  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeZone: 'UTC',
  }).format(date);
};

const getPlan = (license) => cleanText(license.metadata?.plan, 'No especificado');

const getCertificateFileName = (license) => {
  const applicationName = cleanText(license.applicationName, 'licencia')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return `certificado-${applicationName || 'licencia'}.pdf`;
};

const writeField = (doc, label, value, options = {}) => {
  const startY = doc.y;
  const labelWidth = options.labelWidth || 145;
  const valueX = 50 + labelWidth;

  doc
    .font('Helvetica-Bold')
    .fontSize(9)
    .fillColor('#596579')
    .text(label.toUpperCase(), 50, startY, { width: labelWidth - 12 });

  doc
    .font(options.mono ? 'Courier-Bold' : 'Helvetica')
    .fontSize(options.large ? 14 : 11)
    .fillColor('#1d2433')
    .text(cleanText(value), valueX, startY - (options.large ? 2 : 0), {
      width: 495 - labelWidth,
    });

  doc.moveDown(options.large ? 0.95 : 0.65);
};

const buildLicenseCertificatePdf = (license) =>
  new Promise((resolve, reject) => {
    const chunks = [];
    const applicationName = cleanText(license.applicationName, 'la aplicacion');
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      compress: false,
      info: {
        Title: `Adquisicion de licencia para ${applicationName}`,
        Subject: 'Certificado de adquisicion de licencia',
      },
    });

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    doc.rect(0, 0, 595.28, 118).fill('#0f766e');
    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(24)
      .text(`Adquisicion de licencia para ${applicationName}`, 50, 34, {
        width: 495,
        lineGap: 2,
      });
    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor('#d9fbf5')
      .text('Certificado de adquisicion y titularidad de uso', 50, 90);

    doc.y = 148;
    doc
      .font('Helvetica')
      .fontSize(11)
      .fillColor('#1d2433')
      .text(
        `Se certifica que ${cleanText(license.customerName)} adquirio una licencia de uso para ${applicationName}, registrada con los datos que se muestran a continuacion.`,
        { width: 495, lineGap: 3 }
      );

    doc.moveDown(1.2);
    doc
      .roundedRect(50, doc.y, 495, 168, 8)
      .fillAndStroke('#f8fafc', '#d7dde6');
    doc.y += 18;
    writeField(doc, 'Numero de serie', license.serialNumber, { mono: true, large: true });
    writeField(doc, 'Estado', statusLabels[license.status] || license.status);
    writeField(doc, 'Vigencia', `${formatDate(license.validFrom)} al ${formatDate(license.validUntil)}`);
    writeField(doc, 'Plan', getPlan(license));
    writeField(doc, 'Fecha de emision', formatDate(license.createdAt));

    doc.moveDown(2.2);
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#0f766e')
      .text('Propietario de la licencia');
    doc.moveDown(0.55);
    writeField(doc, 'Nombre / razon social', license.customerName);
    writeField(doc, 'RFC', license.customerRfc);
    writeField(doc, 'Correo', license.customerEmail);

    const footerY = 742;
    doc
      .strokeColor('#d7dde6')
      .lineWidth(1)
      .moveTo(50, footerY)
      .lineTo(545, footerY)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#596579')
      .text(
        'Este certificado confirma la adquisicion de la licencia descrita y debe conservarse como comprobante del titular registrado.',
        50,
        footerY + 16,
        { width: 495, align: 'center' }
      );

    doc.end();
  });

module.exports = {
  buildLicenseCertificatePdf,
  getCertificateFileName,
};
