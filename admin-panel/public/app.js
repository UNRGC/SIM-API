const state = {
  user: null,
  csrfToken: null,
  view: 'applications',
  applications: [],
  customers: [],
  licenses: [],
  message: null,
};

const app = document.querySelector('#app');

const escapeHtml = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const api = async (path, options = {}) => {
  const response = await fetch(path, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(state.csrfToken ? { 'x-csrf-token': state.csrfToken } : {}),
      ...(options.headers || {}),
    },
  });
  const payload = response.status === 204 ? {} : await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error?.message || 'No fue posible completar la solicitud.');
  }

  return payload.data;
};

const setMessage = (text, type = 'ok') => {
  state.message = { text, type };
  render();
};

const readForm = (form) => Object.fromEntries(new FormData(form).entries());

const cleanObject = (data) =>
  Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );

const login = async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const data = readForm(form);

  try {
    const result = await api('/admin/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    state.user = result.user;
    state.csrfToken = result.csrfToken;
    await loadCurrentView();
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const logout = async () => {
  await api('/admin/api/auth/logout', { method: 'POST' }).catch(() => {});
  state.user = null;
  state.csrfToken = null;
  state.applications = [];
  state.customers = [];
  state.licenses = [];
  render();
};

const loadSession = async () => {
  const result = await api('/admin/api/auth/me');
  state.user = result.user;
  state.csrfToken = result.csrfToken;

  if (result.authenticated) {
    await loadCurrentView();
  } else {
    render();
  }
};

const loadApplications = async () => {
  state.applications = await api('/admin/api/applications?limit=100&offset=0');
};

const loadCustomers = async () => {
  state.customers = await api('/admin/api/customers?limit=100&offset=0');
};

const loadLicenses = async () => {
  state.licenses = await api('/admin/api/licenses?limit=100&offset=0');
};

const loadCurrentView = async () => {
  try {
    if (state.view === 'applications') {
      await loadApplications();
    } else if (state.view === 'customers') {
      await loadCustomers();
    } else {
      await Promise.all([loadApplications(), loadCustomers(), loadLicenses()]);
    }
    render();
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const switchView = async (view) => {
  state.view = view;
  state.message = null;
  await loadCurrentView();
};

const createApplication = async (event) => {
  event.preventDefault();
  const data = cleanObject(readForm(event.currentTarget));
  data.isActive = data.isActive === 'true';

  try {
    await api('/admin/api/applications', { method: 'POST', body: JSON.stringify(data) });
    event.currentTarget.reset();
    await loadApplications();
    setMessage('Aplicacion registrada.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const updateApplication = async (id, payload) => {
  try {
    await api(`/admin/api/applications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await loadApplications();
    setMessage('Aplicacion actualizada.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const createCustomer = async (event) => {
  event.preventDefault();
  const data = cleanObject(readForm(event.currentTarget));
  data.isActive = data.isActive === 'true';

  try {
    await api('/admin/api/customers', { method: 'POST', body: JSON.stringify(data) });
    event.currentTarget.reset();
    await loadCustomers();
    setMessage('Cliente registrado.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const updateCustomer = async (id, payload) => {
  try {
    await api(`/admin/api/customers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
    await loadCustomers();
    setMessage('Cliente actualizado.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const createLicense = async (event) => {
  event.preventDefault();
  const data = cleanObject(readForm(event.currentTarget));
  const payload = {
    applicationId: data.applicationId,
    customerId: data.customerId,
    validFrom: data.validFrom || undefined,
    validUntil: data.validUntil,
    maxActivations: Number(data.maxActivations || 1),
    metadata: data.plan ? { plan: data.plan } : undefined,
  };

  try {
    const result = await api('/admin/api/licenses', {
      method: 'POST',
      body: JSON.stringify(cleanObject(payload)),
    });
    event.currentTarget.reset();
    await loadLicenses();
    setMessage(`Licencia creada. Numero de serie: ${result.serialNumber}`);
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const revokeLicense = async (id) => {
  const reason = window.prompt('Motivo de revocacion');
  if (reason === null) {
    return;
  }

  try {
    await api(`/admin/api/licenses/${id}/revoke`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
    await loadLicenses();
    setMessage('Licencia revocada.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const renewLicense = async (id) => {
  const validUntil = window.prompt('Nueva vigencia ISO, ejemplo 2028-06-26T00:00:00.000Z');
  if (!validUntil) {
    return;
  }

  try {
    await api(`/admin/api/licenses/${id}/renew`, {
      method: 'POST',
      body: JSON.stringify({ validUntil }),
    });
    await loadLicenses();
    setMessage('Licencia renovada.');
  } catch (error) {
    setMessage(error.message, 'error');
  }
};

const renderLogin = () => {
  app.innerHTML = `
    <section class="login-shell">
      <div class="login-box">
        <h1>SIM Admin</h1>
        <p>Inicia sesion para administrar aplicaciones, clientes y licencias.</p>
        ${renderMessage()}
        <form class="form-stack" id="login-form">
          <label>Usuario
            <input name="username" autocomplete="username" required />
          </label>
          <label>Password
            <input name="password" type="password" autocomplete="current-password" required />
          </label>
          <button type="submit">Iniciar sesion</button>
        </form>
      </div>
    </section>
  `;
  document.querySelector('#login-form').addEventListener('submit', login);
};

const renderMessage = () =>
  state.message ? `<div class="message ${state.message.type === 'error' ? 'error' : ''}">${escapeHtml(state.message.text)}</div>` : '';

const renderShell = () => {
  app.innerHTML = `
    <section class="app-shell">
      <aside class="sidebar">
        <div class="brand">
          <strong>SIM Admin</strong>
          <span>Administracion de licencias</span>
        </div>
        <nav class="nav">
          ${navButton('applications', 'Aplicaciones')}
          ${navButton('customers', 'Clientes')}
          ${navButton('licenses', 'Licencias')}
        </nav>
        <div class="user-panel">
          <strong>${escapeHtml(state.user.displayName)}</strong>
          <span>${escapeHtml((state.user.roles || []).join(', '))}</span>
          <button class="secondary" id="logout-button">Cerrar sesion</button>
        </div>
      </aside>
      <section class="content">
        ${renderMessage()}
        ${renderView()}
      </section>
    </section>
  `;

  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => switchView(button.dataset.view));
  });
  document.querySelector('#logout-button').addEventListener('click', logout);
  bindViewEvents();
};

const navButton = (view, label) =>
  `<button class="${state.view === view ? 'active' : ''}" data-view="${view}" type="button">${label}</button>`;

const renderView = () => {
  if (state.view === 'applications') {
    return renderApplications();
  }
  if (state.view === 'customers') {
    return renderCustomers();
  }
  return renderLicenses();
};

const renderApplications = () => `
  <div class="topbar">
    <div class="section-title">
      <h1>Aplicaciones</h1>
      <p>Productos o sistemas que pueden emitir licencias.</p>
    </div>
    <button class="secondary" id="reload">Actualizar</button>
  </div>
  <div class="layout-grid">
    <div class="panel">
      <div class="panel-header"><h2>Catalogo</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>Codigo</th><th>Estado</th><th>Id</th><th>Acciones</th></tr></thead>
          <tbody>${state.applications.map(renderApplicationRow).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Nueva aplicacion</h2></div>
      <div class="panel-body">
        <form class="form-stack" id="application-form">
          <label>Nombre<input name="name" required /></label>
          <label>Codigo<input name="code" required /></label>
          <label>Estado<select name="isActive"><option value="true">Activa</option><option value="false">Inactiva</option></select></label>
          <button type="submit">Guardar</button>
        </form>
      </div>
    </div>
  </div>
`;

const renderApplicationRow = (item) => `
  <tr>
    <td>${escapeHtml(item.name)}</td>
    <td class="mono">${escapeHtml(item.code)}</td>
    <td>${statusBadge(item.isActive ? 'active' : 'inactive')}</td>
    <td class="mono">${escapeHtml(item.id)}</td>
    <td class="actions">
      <button class="secondary" data-toggle-application="${escapeHtml(item.id)}" data-active="${item.isActive ? 'false' : 'true'}">${item.isActive ? 'Desactivar' : 'Activar'}</button>
    </td>
  </tr>
`;

const renderCustomers = () => `
  <div class="topbar">
    <div class="section-title">
      <h1>Clientes</h1>
      <p>Datos administrativos y fiscales de propietarios de licencias.</p>
    </div>
    <button class="secondary" id="reload">Actualizar</button>
  </div>
  <div class="layout-grid">
    <div class="panel">
      <div class="panel-header"><h2>Directorio</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>RFC</th><th>Contacto</th><th>Estado</th><th>Id</th><th>Acciones</th></tr></thead>
          <tbody>${state.customers.map(renderCustomerRow).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Nuevo cliente</h2></div>
      <div class="panel-body">
        <form class="form-stack" id="customer-form">
          <label>Nombre<input name="name" required /></label>
          <label>Email<input name="email" type="email" /></label>
          <label>Referencia externa<input name="externalRef" /></label>
          <label>RFC<input name="rfc" maxlength="13" /></label>
          <label>Regimen fiscal<input name="fiscalRegime" /></label>
          <label>CP<input name="postalCode" maxlength="5" /></label>
          <label>Estado<select name="isActive"><option value="true">Activo</option><option value="false">Inactivo</option></select></label>
          <button type="submit">Guardar</button>
        </form>
      </div>
    </div>
  </div>
`;

const renderCustomerRow = (item) => `
  <tr>
    <td><strong>${escapeHtml(item.name)}</strong><br><span class="muted">${escapeHtml(item.externalRef || '')}</span></td>
    <td class="mono">${escapeHtml(item.rfc || '')}<br><span class="muted">${escapeHtml(item.fiscalRegime || '')} ${escapeHtml(item.postalCode || '')}</span></td>
    <td>${escapeHtml(item.email || '')}</td>
    <td>${statusBadge(item.isActive ? 'active' : 'inactive')}</td>
    <td class="mono">${escapeHtml(item.id)}</td>
    <td class="actions">
      <button class="secondary" data-toggle-customer="${escapeHtml(item.id)}" data-active="${item.isActive ? 'false' : 'true'}">${item.isActive ? 'Desactivar' : 'Activar'}</button>
    </td>
  </tr>
`;

const renderLicenses = () => `
  <div class="topbar">
    <div class="section-title">
      <h1>Licencias</h1>
      <p>Emision, consulta, renovacion y revocacion de licencias.</p>
    </div>
    <button class="secondary" id="reload">Actualizar</button>
  </div>
  <div class="layout-grid">
    <div class="panel">
      <div class="panel-header"><h2>Licencias recientes</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Cliente</th><th>Aplicacion</th><th>Vigencia</th><th>Estado</th><th>Id</th><th>Acciones</th></tr></thead>
          <tbody>${state.licenses.map(renderLicenseRow).join('')}</tbody>
        </table>
      </div>
    </div>
    <div class="panel">
      <div class="panel-header"><h2>Nueva licencia</h2></div>
      <div class="panel-body">
        <form class="form-stack" id="license-form">
          <label>Aplicacion<select name="applicationId" required>${state.applications.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select></label>
          <label>Cliente<select name="customerId" required>${state.customers.map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('')}</select></label>
          <label>Vigencia desde<input name="validFrom" placeholder="2026-06-26T00:00:00.000Z" /></label>
          <label>Vigencia hasta<input name="validUntil" required placeholder="2027-06-26T00:00:00.000Z" /></label>
          <label>Max activaciones<input name="maxActivations" type="number" min="1" max="100000" value="1" /></label>
          <label>Plan<input name="plan" /></label>
          <button type="submit">Emitir licencia</button>
        </form>
      </div>
    </div>
  </div>
`;

const renderLicenseRow = (item) => `
  <tr>
    <td>${escapeHtml(item.customerName || '')}<br><span class="muted">${escapeHtml(item.customerEmail || '')}</span></td>
    <td>${escapeHtml(item.applicationName || '')}<br><span class="mono">${escapeHtml(item.applicationCode || '')}</span></td>
    <td><span class="muted">Hasta</span><br>${escapeHtml(formatDate(item.validUntil))}</td>
    <td>${statusBadge(item.status)}</td>
    <td class="mono">${escapeHtml(item.id)}<br><span class="muted">...${escapeHtml(item.serialNumberSuffix || '')}</span></td>
    <td class="actions">
      <button class="secondary" data-renew-license="${escapeHtml(item.id)}">Renovar</button>
      <button class="danger" data-revoke-license="${escapeHtml(item.id)}">Revocar</button>
    </td>
  </tr>
`;

const statusBadge = (status) => {
  const normalized = String(status || '');
  const type =
    normalized === 'active'
      ? 'ok'
      : normalized === 'revoked' || normalized === 'inactive'
        ? 'danger'
        : 'warn';
  const label = normalized === 'active' ? 'Activo' : normalized === 'inactive' ? 'Inactivo' : normalized;
  return `<span class="badge ${type}">${escapeHtml(label)}</span>`;
};

const formatDate = (value) => (value ? new Date(value).toLocaleDateString('es-MX') : '');

const bindViewEvents = () => {
  document.querySelector('#reload')?.addEventListener('click', loadCurrentView);
  document.querySelector('#application-form')?.addEventListener('submit', createApplication);
  document.querySelector('#customer-form')?.addEventListener('submit', createCustomer);
  document.querySelector('#license-form')?.addEventListener('submit', createLicense);
  document.querySelectorAll('[data-toggle-application]').forEach((button) => {
    button.addEventListener('click', () =>
      updateApplication(button.dataset.toggleApplication, {
        isActive: button.dataset.active === 'true',
      })
    );
  });
  document.querySelectorAll('[data-toggle-customer]').forEach((button) => {
    button.addEventListener('click', () =>
      updateCustomer(button.dataset.toggleCustomer, {
        isActive: button.dataset.active === 'true',
      })
    );
  });
  document.querySelectorAll('[data-revoke-license]').forEach((button) => {
    button.addEventListener('click', () => revokeLicense(button.dataset.revokeLicense));
  });
  document.querySelectorAll('[data-renew-license]').forEach((button) => {
    button.addEventListener('click', () => renewLicense(button.dataset.renewLicense));
  });
};

const render = () => {
  if (!state.user) {
    renderLogin();
  } else {
    renderShell();
  }
};

loadSession().catch((error) => {
  state.message = { text: error.message, type: 'error' };
  render();
});
