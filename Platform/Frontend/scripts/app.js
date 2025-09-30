import { $ } from './utils.js';
import { initSunburst, on as onSunburst, rebuild, setCenter, setSearchTerm, SUNBURST_EVENT, closeContextMenu, getCenterId } from './sunburst.js';
import { initPanel, renderPanel } from './view/panel.js';
import { applyPlatformData, DATA_CHANGED, DIRTY_STATE_CHANGED, downloadCurrentPlatformData, hasUnsavedChanges, loadPlatformData, on as onDataStore, readFileAsJSON, syncPlatformSnapshot } from './dataStore.js';
import { computeBreadcrumbs } from './model.js';

let currentPanelEntity = 'platform';

function updateSaveStatus() {
  const status = $('#saveStatus');
  const btn = $('#saveBtn');
  if (status) {
    status.textContent = hasUnsavedChanges() ? 'Есть несохранённые изменения' : 'Изменений нет';
  }
  if (btn) {
    btn.disabled = !hasUnsavedChanges();
  }
}

function updateTopBreadcrumbs(centerId) {
  const nav = $('#crumbs');
  if (!nav) return;
  const crumbs = computeBreadcrumbs(centerId);
  nav.innerHTML = '';
  crumbs.forEach((crumb, index) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = crumb.label;
    btn.addEventListener('click', () => {
      setCenter(crumb.id);
      renderPanel(crumb.id);
    });
    nav.appendChild(btn);
    if (index < crumbs.length - 1) {
      const sep = document.createElement('span');
      sep.textContent = '›';
      nav.appendChild(sep);
    }
  });
}

function wireContextMenu() {
  const ctx = $('#ctx');
  if (!ctx) return;
  ctx.addEventListener('click', event => {
    const btn = event.target.closest('button[data-act]');
    if (!btn) return;
    const action = btn.dataset.act;
    const id = ctx.dataset.targetId;
    if (!id) return;
    if (action === 'center') {
      currentPanelEntity = id;
      setCenter(id);
      renderPanel(id);
    }
    if (action === 'open-swagger') {
      console.info('Swagger open stub for', id);
    }
    if (action === 'run-qa') {
      console.info('QA pipeline stub for', id);
    }
    if (action === 'validate') {
      console.info('Validation stub for', id);
    }
    closeContextMenu();
  });
}

async function bootstrap() {
  initSunburst({
    canvas: $('#sun'),
    tooltip: $('#tooltip'),
    contextMenu: $('#ctx')
  });
  initPanel({
    container: $('#panelContent'),
    breadcrumbs: $('#panelBreadcrumbs'),
    title: $('#panelTitle'),
    onNavigate: id => {
      currentPanelEntity = id;
      setCenter(id);
      renderPanel(id);
    }
  });

  wireContextMenu();

  await loadPlatformData();
  await rebuild();
  renderPanel(currentPanelEntity);
  updateSaveStatus();
  updateTopBreadcrumbs(getCenterId());

  onSunburst(SUNBURST_EVENT.SELECT, ({ detail }) => {
    const { id } = detail;
    currentPanelEntity = id;
    renderPanel(id);
  });

  onSunburst(SUNBURST_EVENT.CENTER, ({ detail }) => {
    updateTopBreadcrumbs(detail.centerId);
  });

  onDataStore(DIRTY_STATE_CHANGED, updateSaveStatus);
  onDataStore(DATA_CHANGED, async () => {
    await rebuild();
    renderPanel(currentPanelEntity);
  });

  $('#homeBtn')?.addEventListener('click', () => {
    currentPanelEntity = 'platform';
    setCenter('platform');
    renderPanel('platform');
  });

  $('#search')?.addEventListener('input', event => {
    setSearchTerm(event.target.value);
  });

  $('#saveBtn')?.addEventListener('click', async () => {
    const btn = $('#saveBtn');
    const status = $('#saveStatus');
    if (btn) btn.disabled = true;
    if (status) status.textContent = 'Синхронизация…';
    const result = await syncPlatformSnapshot();
    if (!result.success) {
      downloadCurrentPlatformData();
    }
    updateSaveStatus();
  });

  $('#dataFile')?.addEventListener('change', async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const json = await readFileAsJSON(file);
      applyPlatformData(json, { clean: false });
    } catch (error) {
      console.error('Ошибка загрузки файла', error);
    } finally {
      event.target.value = '';
    }
  });
}

document.addEventListener('DOMContentLoaded', bootstrap);
