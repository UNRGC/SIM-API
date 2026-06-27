const config = require('./config');
const { PanelError } = require('./errors');

const toQueryString = (query) => {
  const params = new URLSearchParams();

  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.set(key, String(value));
    }
  });

  const value = params.toString();
  return value ? `?${value}` : '';
};

const callApi = async ({ method = 'GET', path, query, body }) => {
  const response = await fetch(`${config.apiBaseUrl}${path}${toQueryString(query)}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-api-key': config.apiAdminKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new PanelError(
      payload.error?.message || 'La API rechazo la solicitud.',
      response.status,
      payload.error?.code || 'UPSTREAM_API_ERROR',
      payload.error?.details
    );
  }

  return payload;
};

module.exports = {
  callApi,
};
