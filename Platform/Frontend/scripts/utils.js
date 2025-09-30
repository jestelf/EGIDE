export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
export const deg = value => value * 180 / Math.PI;
export const rad = value => value * Math.PI / 180;
export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const polar = (cx, cy, r, th) => [cx + r * Math.cos(th), cy + r * Math.sin(th)];

export function arcPath(ctx, cx, cy, r0, r1, th0, th1) {
  ctx.beginPath();
  const [x0, y0] = polar(cx, cy, r0, th0);
  ctx.arc(cx, cy, r1, th0, th1, false);
  const [x1, y1] = polar(cx, cy, r0, th1);
  ctx.lineTo(x1, y1);
  ctx.arc(cx, cy, r0, th1, th0, true);
  ctx.closePath();
}

export const lerp = (a, b, t) => a + (b - a) * t;

export const LABEL_FONT_FAMILY = 'Inter, system-ui, "Segoe UI", sans-serif';

export function makeLabel(ctx, name, geom) {
  if (!geom) return null;
  const arc = geom.th1 - geom.th0;
  if (arc <= 0) return null;
  const rMid = (geom.r0 + geom.r1) / 2;
  const arcLength = Math.abs(arc) * rMid;
  const maxWidth = Math.max(0, arcLength - 10);
  if (maxWidth <= 0) return null;
  const previousFont = ctx.font;
  const sizes = [12, 11, 10, 9, 8];
  for (const size of sizes) {
    ctx.font = `${size}px ${LABEL_FONT_FAMILY}`;
    if (ctx.measureText(name).width <= maxWidth) {
      ctx.font = previousFont;
      return { text: name, size };
    }
    let truncated = name;
    while (truncated.length > 1) {
      truncated = truncated.slice(0, -1);
      const candidate = `${truncated}…`;
      if (ctx.measureText(candidate).width <= maxWidth) {
        ctx.font = previousFont;
        return { text: candidate, size };
      }
    }
  }
  ctx.font = previousFont;
  return null;
}

export function shade(hex, factor) {
  const color = hex.replace('#', '');
  const r = parseInt(color.slice(0, 2), 16);
  const g = parseInt(color.slice(2, 4), 16);
  const b = parseInt(color.slice(4, 6), 16);
  const rr = clamp(Math.round(r * factor), 0, 255);
  const gg = clamp(Math.round(g * factor), 0, 255);
  const bb = clamp(Math.round(b * factor), 0, 255);
  return `#${rr.toString(16).padStart(2, '0')}${gg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

export const createEl = (tag, props = {}, children = []) => {
  const el = document.createElement(tag);
  Object.entries(props).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (key === 'className') {
      el.className = value;
    } else if (key === 'text') {
      el.textContent = value;
    } else if (key.startsWith('on') && typeof value === 'function') {
      el.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key === 'attrs') {
      Object.entries(value).forEach(([attr, attrValue]) => {
        if (attrValue === false || attrValue === null || attrValue === undefined) return;
        if (attrValue === true) el.setAttribute(attr, '');
        else el.setAttribute(attr, attrValue);
      });
    } else {
      el[key] = value;
    }
  });
  children.forEach(child => {
    if (!child) return;
    if (Array.isArray(child)) child.forEach(node => node && el.appendChild(node));
    else el.appendChild(child);
  });
  return el;
};
