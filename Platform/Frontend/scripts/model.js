import { clamp } from './utils.js';

const SERVICE_DOMAIN_KEYS = ['frontend', 'backend', 'qa'];
export const SERVICE_DOMAINS = SERVICE_DOMAIN_KEYS.slice();

const createDomainMap = (initialValue = '') => SERVICE_DOMAIN_KEYS.reduce((acc, key) => {
  acc[key] = typeof initialValue === 'function' ? initialValue(key) : initialValue;
  return acc;
}, {});

export const COLORS = {
  platform: '#1f6feb',
  service: '#ffad60',
  backend: '#4cc9f0',
  frontend: '#80ed99',
  qa: '#c77dff',
  other: '#91a7ff'
};

export const CATEGORY_LABELS = {
  frontend: 'Frontend',
  backend: 'Backend',
  qa: 'QA'
};

export const MIN_ARC_DEG = 6;
export const ANIM_MS = 350;
export const REBUILD_DEBOUNCE_MS = 600;
export const LOCAL_STORAGE_KEY = 'egide-platform-data';

export const deepClone = obj => JSON.parse(JSON.stringify(obj ?? {}));
export const ensureArray = value => (Array.isArray(value) ? value.slice() : []);
export const sanitizeStringArray = arr => ensureArray(arr).map(item => String(item ?? ''));

export function sanitizeMetrics(metrics) {
  const result = {};
  if (metrics && typeof metrics === 'object') {
    Object.entries(metrics).forEach(([key, value]) => {
      const safeKey = String(key ?? '');
      if (!safeKey) return;
      result[safeKey] = String(value ?? '');
    });
  }
  return result;
}

let idCounter = 0;
export const generateId = (prefix) => `${prefix}-${Date.now().toString(36)}-${(idCounter++).toString(36)}`;

export function sanitizeComponent(component = {}) {
  const comp = { ...deepClone(component) };
  comp.id = comp.id || generateId('cmp');
  comp.name = comp.name || '';
  comp.description = comp.description || '';
  comp.stack = comp.stack || '';
  comp.status = comp.status || '';
  comp.lead = comp.lead || '';
  comp.repo = comp.repo || '';
  comp.cadence = comp.cadence || '';
  comp.coverage = comp.coverage || '';
  comp.metrics = sanitizeMetrics(comp.metrics);
  if (comp.weight === undefined) comp.weight = 1;
  if (!comp.artifacts) comp.artifacts = [];
  if (!comp.tasks) comp.tasks = [];
  return comp;
}

export function sanitizeComponentList(list) {
  return ensureArray(list).map(item => sanitizeComponent(item));
}

export function sanitizeService(service = {}) {
  const src = { ...deepClone(service) };
  src.id = src.id || generateId('service');
  src.slug = src.slug || src.id;
  src.name = src.name || '';
  src.summary = src.summary || '';
  src.mission = src.mission || '';
  src.owner = src.owner || '';
  src.lead = src.lead || '';
  src.status = src.status || '';
  src.impact = src.impact || '';
  src.sla = src.sla || '';
  src.area = src.area || '';
  src.repo = src.repo || '';
  src.roadmap = sanitizeStringArray(src.roadmap);
  src.frontend = sanitizeComponentList(src.frontend);
  src.backend = sanitizeComponentList(src.backend);
  src.qa = sanitizeComponentList(src.qa);
  src.categoryNotes = Object.assign(createDomainMap(''), src.categoryNotes || {});
  src.servicesTree = ensureArray(src.servicesTree);
  return src;
}

export function sanitizePlatformData(raw = {}) {
  const platform = deepClone(raw);
  platform.id = platform.id || 'platform';
  platform.name = platform.name || 'EGIDE Platform';
  platform.description = platform.description || '';
  platform.principles = sanitizeStringArray(platform.principles);
  platform.services = ensureArray(platform.services).map(sanitizeService);
  return platform;
}

const normalizeDomainKey = value => {
  if (!value) return null;
  const normalized = String(value).toLowerCase();
  return SERVICE_DOMAIN_KEYS.find(key => key === normalized) || null;
};

function normalizeComponentContract(component = {}) {
  return sanitizeComponent({
    id: component.id,
    name: component.name ?? component.displayName ?? '',
    description: component.description ?? '',
    stack: component.stack ?? component.techStack ?? '',
    status: component.status ?? component.lifecycle ?? '',
    lead: component.lead ?? component.owner ?? '',
    repo: component.repo ?? component.repository ?? '',
    cadence: component.cadence ?? component.releaseCadence ?? '',
    coverage: component.coverage ?? component.testCoverage ?? '',
    metrics: component.metrics ?? component.indicators ?? {},
    artifacts: ensureArray(component.artifacts),
    tasks: ensureArray(component.tasks)
  });
}

export function serviceFromContract(contract = {}) {
  const serviceInfo = deepClone(contract.service || {});
  const draft = { ...serviceInfo };
  draft.id = serviceInfo.id ?? contract.id ?? generateId('service');
  draft.slug = serviceInfo.slug ?? serviceInfo.id ?? contract.slug ?? contract.id;
  draft.name = serviceInfo.name ?? serviceInfo.displayName ?? contract.name ?? '';
  draft.summary = serviceInfo.summary ?? contract.summary ?? '';
  draft.mission = serviceInfo.mission ?? contract.mission ?? '';
  draft.owner = serviceInfo.owner ?? contract.owner ?? '';
  draft.lead = serviceInfo.lead ?? serviceInfo.techLead ?? contract.lead ?? '';
  draft.status = serviceInfo.status ?? serviceInfo.state ?? contract.status ?? '';
  draft.impact = serviceInfo.impact ?? contract.impact ?? '';
  draft.sla = serviceInfo.sla ?? serviceInfo.slo ?? contract.sla ?? '';
  draft.area = serviceInfo.area ?? serviceInfo.domain ?? contract.area ?? '';
  draft.repo = serviceInfo.repo ?? serviceInfo.repository ?? contract.repo ?? contract.repository ?? '';
  draft.roadmap = ensureArray(contract.roadmap ?? serviceInfo.roadmap);
  draft.servicesTree = ensureArray(contract.servicesTree ?? serviceInfo.servicesTree);
  draft.categoryNotes = {
    ...createDomainMap(''),
    ...(contract.categoryNotes || {}),
    ...(serviceInfo.categoryNotes || {})
  };
  SERVICE_DOMAIN_KEYS.forEach(key => {
    draft[key] = [];
  });

  ensureArray(contract.domains ?? serviceInfo.domains).forEach(domain => {
    const key = normalizeDomainKey(domain?.id ?? domain?.domain);
    if (!key) return;
    if (domain?.note) draft.categoryNotes[key] = domain.note;
    const components = ensureArray(domain?.components).map(normalizeComponentContract);
    if (components.length) draft[key] = components;
  });

  SERVICE_DOMAIN_KEYS.forEach(key => {
    if (draft[key].length === 0) {
      const fallback = contract[key] || serviceInfo[key];
      if (fallback) draft[key] = sanitizeComponentList(fallback);
    }
  });

  return sanitizeService(draft);
}

export function composePlatformModel(platformContract = {}, serviceContracts = []) {
  const order = ensureArray(platformContract?.serviceOrder);
  const services = ensureArray(serviceContracts).map(serviceFromContract);
  if (order.length) {
    const weight = id => {
      const index = order.indexOf(id);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };
    services.sort((a, b) => weight(a.id) - weight(b.id));
  }
  const payload = {
    ...deepClone(platformContract),
    services
  };
  return sanitizePlatformData(payload);
}

let platformData = null;

export function getPlatform() {
  return platformData || null;
}

export function setPlatform(data) {
  platformData = sanitizePlatformData(data);
  return platformData;
}

export function toJSON() {
  return platformData ? deepClone(platformData) : null;
}

export function updatePlatform(mutator) {
  if (!platformData) return;
  mutator(platformData);
}

export function findServiceById(id) {
  const platform = getPlatform();
  if (!platform || !platform.services) return null;
  return platform.services.find(s => s.id === id || s.slug === id);
}

export function getCategoryItems(service, category) {
  if (!service) return [];
  return ensureArray(service[category]);
}

export function getEntity(id) {
  if (!id) return getEntity('platform');
  if (id === 'platform') {
    const platform = getPlatform();
    return platform
      ? { kind: 'platform', id: 'platform', title: platform.name }
      : { kind: 'platform', id: 'platform', title: 'Платформа' };
  }
  const parts = id.split(':');
  const service = findServiceById(parts[0]);
  if (!service) return null;
  if (parts.length === 1) {
    return { kind: 'service', id: service.id, service, title: service.name };
  }
  const category = parts[1];
  if (!(category in CATEGORY_LABELS)) return null;
  if (parts.length === 2) {
    const items = getCategoryItems(service, category);
    return {
      kind: 'category',
      id: `${service.id}:${category}`,
      service,
      category,
      items,
      title: `${CATEGORY_LABELS[category]} • ${service.name}`
    };
  }
  const componentId = parts.slice(2).join(':');
  const component = getCategoryItems(service, category).find(c => c.id === componentId);
  if (!component) return null;
  return {
    kind: 'component',
    id: `${service.id}:${category}:${component.id}`,
    service,
    category,
    component,
    title: component.name
  };
}

export function computeBreadcrumbs(id) {
  const entity = getEntity(id) || getEntity('platform');
  const platform = getPlatform();
  const crumbs = [{ id: 'platform', label: platform ? platform.name : 'Платформа' }];
  if (!entity || entity.kind === 'platform') {
    return crumbs;
  }
  const service = entity.service || findServiceById(entity.id);
  if (service) {
    crumbs.push({ id: service.id, label: service.name });
  }
  if ((entity.kind === 'category' || entity.kind === 'component') && service) {
    const catId = `${service.id}:${entity.category}`;
    crumbs.push({ id: catId, label: CATEGORY_LABELS[entity.category] });
  }
  if (entity.kind === 'component' && entity.component) {
    crumbs.push({ id: entity.id, label: entity.component.name });
  }
  return crumbs;
}

export function getCenterLabel(centerId) {
  const entity = getEntity(centerId);
  if (!entity) return centerId;
  if (entity.kind === 'platform') {
    const platform = getPlatform();
    return platform ? platform.name : centerId;
  }
  if (entity.kind === 'service') return entity.service.name;
  if (entity.kind === 'category') return CATEGORY_LABELS[entity.category];
  if (entity.kind === 'component') return entity.component.name;
  return centerId;
}
