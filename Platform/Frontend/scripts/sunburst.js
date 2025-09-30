import { arcPath, deg, makeLabel, polar, rad, shade } from './utils.js';
import {
  CATEGORY_LABELS,
  COLORS,
  MIN_ARC_DEG,
  computeBreadcrumbs,
  getCenterLabel,
  getEntity,
  getPlatform
} from './model.js';

const bus = new EventTarget();
export const SUNBURST_EVENT = {
  SELECT: 'sunburst-select',
  HOVER: 'sunburst-hover',
  CENTER: 'sunburst-center'
};

let canvas;
let ctx;
let width = 0;
let height = 0;
let centerX = 0;
let centerY = 0;
let ringWidth = 0;
let tree = null;
let layout = [];
let centerId = 'platform';
let hoveredId = null;
let selectedId = 'platform';
let breadcrumbs = [];
let tooltipEl = null;
let ctxMenuEl = null;
let lastSearch = '';
let resizeObserver;

function emit(type, detail) {
  bus.dispatchEvent(new CustomEvent(type, { detail }));
}

export function on(type, handler) {
  bus.addEventListener(type, handler);
  return () => bus.removeEventListener(type, handler);
}

export function getCenterId() {
  return centerId;
}

export function getBreadcrumbs() {
  return breadcrumbs.slice();
}

export function setSearchTerm(term) {
  lastSearch = (term || '').trim().toLowerCase();
  draw();
}

export function initSunburst({ canvas: canvasElement, tooltip, contextMenu }) {
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  tooltipEl = tooltip;
  ctxMenuEl = contextMenu;
  resize();
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => resize());
    resizeObserver.observe(canvas.parentElement || canvas);
  }
  window.requestAnimationFrame(() => resize());
  bindEvents();
}

function resize() {
  if (!canvas) return;
  const dpr = window.devicePixelRatio || 1;
  let rect = canvas.getBoundingClientRect();
  if ((!rect.width || !rect.height) && canvas.parentElement) {
    rect = canvas.parentElement.getBoundingClientRect();
  }
  const fallbackWidth = rect.width || window.innerWidth || 800;
  const fallbackHeight = rect.height || window.innerHeight || 600;
  const cssWidth = Math.max(1, fallbackWidth);
  const cssHeight = Math.max(1, fallbackHeight);
  const targetWidth = Math.floor(cssWidth * dpr);
  const targetHeight = Math.floor(cssHeight * dpr);
  if (canvas.width !== targetWidth) canvas.width = targetWidth;
  if (canvas.height !== targetHeight) canvas.height = targetHeight;
  width = cssWidth;
  height = cssHeight;
  centerX = width / 2;
  centerY = height / 2;
  ringWidth = Math.min(width, height) * 0.12;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  draw();
}

function normalizeWeights(children) {
  const sum = children.reduce((acc, child) => acc + (child.weight || 1), 0) || 1;
  children.forEach(child => {
    child._w = (child.weight || 1) / sum;
  });
}

function aggregateSmall(children, totalAngleRad) {
  if (!children || children.length === 0) return children;
  const minAngle = rad(MIN_ARC_DEG);
  const result = [];
  const small = [];
  children.forEach(child => {
    const span = totalAngleRad * (child._w || 0);
    if (span < minAngle) small.push(child);
    else result.push(child);
  });
  if (small.length === 0) return result;
  const aggregated = {
    id: `agg-${small.map(item => item.id).join('_').slice(0, 32)}`,
    name: `+${small.length}`,
    type: 'other',
    weight: small.reduce((acc, item) => acc + (item.weight || 1), 0),
    children: small
  };
  aggregated._w = small.reduce((acc, item) => acc + (item._w || 0), 0);
  result.push(aggregated);
  const total = result.reduce((acc, item) => acc + (item._w || 0), 0) || 1;
  result.forEach(item => { item._w = (item._w || 0) / total; });
  return result;
}

function layoutRadial(node, th0, th1, r0, ringStep, out) {
  node._geom = { th0, th1, r0, r1: r0 + ringStep };
  out.push(node);
  if (!node.children || node.children.length === 0) return;
  normalizeWeights(node.children);
  let children = node.children.map(child => ({ ...child }));
  const totalAngle = th1 - th0;
  children.forEach(child => {
    child._w = child._w ?? (child.weight || 1);
  });
  children = aggregateSmall(children, totalAngle);
  let cursor = th0;
  children.forEach(child => {
    const span = totalAngle * (child._w || 0);
    layoutRadial(child, cursor, cursor + span, r0 + ringStep, ringStep, out);
    cursor += span;
  });
}

function assignWeights(node) {
  if (!node.children || node.children.length === 0) {
    node.weight = node.weight || 1;
    return node.weight;
  }
  let sum = 0;
  node.children.forEach(child => {
    sum += assignWeights(child);
  });
  node.weight = Math.max(1, sum);
  return node.weight;
}

function buildTree(rootId) {
  const platform = getPlatform();
  const entity = getEntity(rootId) || getEntity('platform');
  if (!entity || !platform) {
    const fallback = { id: 'platform', name: platform ? platform.name : 'Платформа', type: 'platform', weight: 1, children: [] };
    assignWeights(fallback);
    return fallback;
  }
  if (entity.kind === 'platform') {
    const services = platform.services || [];
    const root = {
      id: 'platform',
      name: platform.name,
      type: 'platform',
      weight: 1,
      children: services.map(service => ({
        id: service.id,
        name: service.name,
        type: 'service',
        weight: service.weight || (service.frontend.length + service.backend.length + service.qa.length) || 1,
        service
      }))
    };
    root.children.forEach(child => {
      child.children = ['frontend', 'backend', 'qa'].map(category => ({
        id: `${child.id}:${category}`,
        name: CATEGORY_LABELS[category],
        type: category,
        weight: (child.service[category] || []).reduce((acc, comp) => acc + (comp.weight || 1), 0) || 1,
        service: child.service,
        category,
        children: (child.service[category] || []).map(comp => ({
          id: `${child.id}:${category}:${comp.id}`,
          name: comp.name,
          type: category,
          weight: comp.weight || 1,
          service: child.service,
          category,
          component: comp
        }))
      }));
    });
    assignWeights(root);
    return root;
  }
  if (entity.kind === 'service') {
    const { service } = entity;
    const root = {
      id: service.id,
      name: service.name,
      type: 'service',
      weight: 1,
      children: ['frontend', 'backend', 'qa'].map(category => ({
        id: `${service.id}:${category}`,
        name: CATEGORY_LABELS[category],
        type: category,
        category,
        service,
        weight: (service[category] || []).reduce((acc, comp) => acc + (comp.weight || 1), 0) || 1,
        children: (service[category] || []).map(comp => ({
          id: `${service.id}:${category}:${comp.id}`,
          name: comp.name,
          type: category,
          service,
          category,
          component: comp,
          weight: comp.weight || 1
        }))
      }))
    };
    assignWeights(root);
    return root;
  }
  if (entity.kind === 'category') {
    const { service, category } = entity;
    const root = {
      id: entity.id,
      name: `${CATEGORY_LABELS[category]} • ${service.name}`,
      type: category,
      service,
      category,
      weight: 1,
      children: (service[category] || []).map(comp => ({
        id: `${service.id}:${category}:${comp.id}`,
        name: comp.name,
        type: category,
        service,
        category,
        component: comp,
        weight: comp.weight || 1
      }))
    };
    assignWeights(root);
    return root;
  }
  if (entity.kind === 'component') {
    const { component, category, service } = entity;
    const root = {
      id: entity.id,
      name: component.name,
      type: category,
      service,
      category,
      weight: 1,
      children: []
    };
    assignWeights(root);
    return root;
  }
  const fallback = { id: 'platform', name: platform.name, type: 'platform', weight: 1, children: [] };
  assignWeights(fallback);
  return fallback;
}

function colorFor(type, isSelected) {
  const base = COLORS[type] || COLORS.other;
  if (isSelected) return shade(base, 1.25);
  return base;
}

function draw() {
  if (!ctx || !tree) return;
  ctx.clearRect(0, 0, width, height);
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.min(width, height) / 2);
  gradient.addColorStop(0, 'rgba(32,48,70,0.35)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, Math.min(width, height) / 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#203b60';
  ctx.strokeStyle = '#3d6aa1';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, centerY, ringWidth * 0.65, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#dfe7f1';
  ctx.font = `${Math.max(14, Math.floor(ringWidth * 0.22))}px Inter, system-ui`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(getCenterLabel(centerId), centerX, centerY);

  layout = [];
  const flat = [];
  layoutRadial(tree, -Math.PI / 2, 1.5 * Math.PI, ringWidth * 0.65, ringWidth, flat);
  flat.forEach(node => {
    if (node === tree) return;
    const selected = node.id === selectedId;
    ctx.fillStyle = colorFor(node.type, selected);
    ctx.strokeStyle = '#2a3a50';
    ctx.lineWidth = 1;
    arcPath(ctx, centerX, centerY, node._geom.r0, node._geom.r1, node._geom.th0, node._geom.th1);
    ctx.fill();
    ctx.stroke();

    const visibleAngle = deg(node._geom.th1 - node._geom.th0);
    if (visibleAngle > 8) {
      const label = makeLabel(ctx, node.name, node._geom);
      if (label) {
        const thMid = (node._geom.th0 + node._geom.th1) / 2;
        const rMid = (node._geom.r0 + node._geom.r1) / 2;
        const [lx, ly] = polar(centerX, centerY, rMid, thMid);
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(thMid);
        ctx.fillStyle = '#f8fbff';
        ctx.font = `${label.size}px Inter, system-ui`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.text, 0, 0);
        ctx.restore();
      }
    }

    layout.push(node);
  });

  if (lastSearch) {
    ctx.save();
    layout.forEach(node => {
      if (node.name.toLowerCase().includes(lastSearch)) {
        const g = node._geom;
        ctx.strokeStyle = '#ffd166';
        ctx.lineWidth = 3;
        arcPath(ctx, centerX, centerY, g.r0, g.r1, g.th0, g.th1);
        ctx.stroke();
      }
    });
    ctx.restore();
  }
}

function hitTest(x, y) {
  const dx = x - centerX;
  const dy = y - centerY;
  const r = Math.sqrt(dx * dx + dy * dy);
  if (r < ringWidth * 0.65) return tree;
  const angle = Math.atan2(dy, dx);
  for (let i = layout.length - 1; i >= 0; i -= 1) {
    const node = layout[i];
    const g = node._geom;
    if (r >= g.r0 && r <= g.r1) {
      let th = angle;
      if (th < -Math.PI / 2) th += Math.PI * 2;
      if (th >= g.th0 && th <= g.th1) {
        return node;
      }
    }
  }
  return null;
}

function updateTooltip(node, clientX, clientY) {
  if (!tooltipEl) return;
  if (!node || node === tree) {
    tooltipEl.style.display = 'none';
    return;
  }
  tooltipEl.innerHTML = `<strong>${node.name}</strong><br>${node.type}`;
  tooltipEl.style.display = 'block';
  tooltipEl.style.left = `${clientX + 12}px`;
  tooltipEl.style.top = `${clientY + 12}px`;
}

function handlePointerMove(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const node = hitTest(x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1));
  const id = node ? node.id : null;
  if (id !== hoveredId) {
    hoveredId = id;
    emit(SUNBURST_EVENT.HOVER, { id, node });
  }
  updateTooltip(node, event.clientX, event.clientY);
}

function handlePointerLeave() {
  hoveredId = null;
  updateTooltip(null);
}

function handleClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const node = hitTest(x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1));
  if (!node) return;
  if (node.id === tree.id) {
    setCenter('platform');
    return;
  }
  selectedId = node.id;
  emit(SUNBURST_EVENT.SELECT, { id: node.id, node });
  draw();
}

function handleDoubleClick(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const node = hitTest(x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1));
  if (!node) return;
  setCenter(node.id);
}

function handleContextMenu(event) {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  const node = hitTest(x * (window.devicePixelRatio || 1), y * (window.devicePixelRatio || 1));
  if (!node) return;
  selectedId = node.id;
  emit(SUNBURST_EVENT.SELECT, { id: node.id, node });
  draw();
  if (!ctxMenuEl) return;
  ctxMenuEl.style.display = 'block';
  ctxMenuEl.style.left = `${event.clientX + 4}px`;
  ctxMenuEl.style.top = `${event.clientY + 4}px`;
  ctxMenuEl.dataset.targetId = node.id;
}

function bindEvents() {
  window.addEventListener('resize', resize);
  canvas.addEventListener('mousemove', handlePointerMove);
  canvas.addEventListener('mouseleave', handlePointerLeave);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('dblclick', handleDoubleClick);
  canvas.addEventListener('contextmenu', handleContextMenu);
  document.addEventListener('click', event => {
    if (!ctxMenuEl) return;
    if (event.target === ctxMenuEl || ctxMenuEl.contains(event.target)) return;
    ctxMenuEl.style.display = 'none';
  });
}

export async function rebuild({ animate = true } = {}) {
  tree = buildTree(centerId);
  breadcrumbs = computeBreadcrumbs(centerId);
  emit(SUNBURST_EVENT.CENTER, { centerId, breadcrumbs });
  draw();
}

export function setCenter(id) {
  centerId = id || 'platform';
  breadcrumbs = computeBreadcrumbs(centerId);
  emit(SUNBURST_EVENT.CENTER, { centerId, breadcrumbs });
  rebuild();
}

export function setSelected(id) {
  selectedId = id;
  draw();
}

export function getSelectedId() {
  return selectedId;
}

export function closeContextMenu() {
  if (ctxMenuEl) ctxMenuEl.style.display = 'none';
}
