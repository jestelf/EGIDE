import { composePlatformModel, ensureArray, LOCAL_STORAGE_KEY, sanitizePlatformData, setPlatform, toJSON } from './model.js';
import { fetchPlatformContract, fetchServiceContract, fetchServiceIndex, pushPlatformSnapshot } from './api/client.js';

const bus = new EventTarget();
let unsavedChanges = false;

const LOCAL_STORAGE_VERSION = 'rest-contracts-v1';

export const DATA_CHANGED = 'data-changed';
export const DIRTY_STATE_CHANGED = 'dirty-state';

function emit(type, detail) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, handler) {
  bus.addEventListener(type, handler);
  return () => bus.removeEventListener(type, handler);
}

function loadPlatformDataFromLocal() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const payload = JSON.parse(raw);
      if (payload && payload.version === LOCAL_STORAGE_VERSION && payload.data) {
        return sanitizePlatformData(payload.data);
      }
      console.info('Игнорируем устаревшие сохранённые данные платформы');
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    }
  } catch (error) {
    console.warn('Не удалось прочитать локальные данные', error);
  }
  return null;
}

function savePlatformDataToLocal() {
  try {
    const json = toJSON();
    if (json) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify({
        version: LOCAL_STORAGE_VERSION,
        data: json
      }));
    }
  } catch (error) {
    console.warn('Не удалось сохранить локальные данные', error);
  }
}

async function fetchPlatformBundle() {
  try {
    const response = await fetch('./data/platform-data.json', { cache: 'no-store' });
    if (response.ok) {
      const json = await response.json();
      return sanitizePlatformData(json);
    }
  } catch (error) {
    console.warn('Не удалось загрузить данные платформы', error);
  }
  return sanitizePlatformData({});
}

export async function loadPlatformData() {
  const local = loadPlatformDataFromLocal();
  if (local) {
    setPlatform(local);
    markClean({ silent: true });
    emit(DATA_CHANGED, { reason: 'load:local' });
    return;
  }

  try {
    const platformContract = await fetchPlatformContract();
    const servicesIndex = await fetchServiceIndex();
    const serviceContracts = await Promise.all(
      ensureArray(servicesIndex).map(item => fetchServiceContract(item))
    );
    const model = composePlatformModel(platformContract, serviceContracts);
    setPlatform(model);
    markClean({ silent: true });
    emit(DATA_CHANGED, { reason: 'load:rest' });
    return;
  } catch (error) {
    console.warn('REST API недоступно, пробуем статический бандл', error);
  }

  const data = await fetchPlatformBundle();
  setPlatform(data);
  markClean({ silent: true });
  emit(DATA_CHANGED, { reason: 'load:fallback' });
}

export function applyPlatformData(data, { clean = true } = {}) {
  setPlatform(data);
  if (clean) markClean({ silent: true });
  else markDirty({ silent: true });
  emit(DATA_CHANGED, { reason: 'apply' });
}

export function markDirty({ silent = false } = {}) {
  unsavedChanges = true;
  savePlatformDataToLocal();
  if (!silent) emit(DIRTY_STATE_CHANGED, { dirty: true });
}

export function markClean({ silent = false } = {}) {
  unsavedChanges = false;
  savePlatformDataToLocal();
  if (!silent) emit(DIRTY_STATE_CHANGED, { dirty: false });
}

export function hasUnsavedChanges() {
  return unsavedChanges;
}

export function downloadCurrentPlatformData() {
  const json = toJSON();
  if (!json) return;
  const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'platform-data.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function readFileAsJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        resolve(json);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export async function syncPlatformSnapshot() {
  const payload = toJSON();
  if (!payload) return { success: false, reason: 'empty' };
  try {
    await pushPlatformSnapshot(payload);
    markClean();
    return { success: true };
  } catch (error) {
    console.warn('Не удалось отправить снапшот платформы', error);
    return { success: false, error };
  }
}
