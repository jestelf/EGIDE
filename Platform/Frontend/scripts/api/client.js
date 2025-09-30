const API_ROOT = './data/api';

function buildUrl(path) {
  if (!path) throw new Error('API path is required');
  if (/^https?:/i.test(path)) return path;
  const normalized = path.startsWith('./') ? path.slice(2) : path.replace(/^\//, '');
  return `${API_ROOT}/${normalized}`;
}

async function request(path, { method = 'GET', body, headers = {} } = {}) {
  const url = buildUrl(path);
  const response = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store'
  });
  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`API ${method} ${url} failed: ${response.status} ${message}`);
  }
  return response.status !== 204 ? response.json() : null;
}

export async function fetchPlatformContract() {
  return request('./platform.json');
}

export async function fetchServiceIndex() {
  const payload = await request('./services.json');
  const items = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.services)
      ? payload.services
      : [];
  return items.map(item => ({
    id: item.id || item.slug,
    slug: item.slug || item.id,
    name: item.name || item.displayName || '',
    summary: item.summary || '',
    domains: Array.isArray(item.domains) ? item.domains.slice() : [],
    href: item.href || item.links?.self || `./services/${item.id || item.slug}/detail.json`
  }));
}

export async function fetchServiceContract(reference) {
  if (!reference) throw new Error('Service reference is required');
  const target = typeof reference === 'string'
    ? `./services/${reference}/detail.json`
    : reference.href || reference.links?.self || `./services/${reference.id || reference.slug}/detail.json`;
  return request(target);
}

export async function pushPlatformSnapshot(snapshot) {
  // Симуляция REST-запроса сохранения данных платформы.
  console.info('POST /platform snapshot', snapshot);
  await new Promise(resolve => setTimeout(resolve, 150));
  return { status: 202 };
}
