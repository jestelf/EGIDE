import { CATEGORY_LABELS, findServiceById, getEntity, getPlatform, sanitizeComponent, sanitizeService } from '../model.js';
import { markDirty } from '../dataStore.js';
import { createEl } from '../utils.js';

let containerEl = null;
let breadcrumbsEl = null;
let titleEl = null;
let navigateCallback = null;

export function initPanel({ container, breadcrumbs, title, onNavigate }) {
  containerEl = container;
  breadcrumbsEl = breadcrumbs;
  titleEl = title;
  navigateCallback = typeof onNavigate === 'function' ? onNavigate : null;
}

export function renderPanel(entityId) {
  if (!containerEl) return;
  const entity = getEntity(entityId) || getEntity('platform');
  renderBreadcrumbs(entityId);
  containerEl.innerHTML = '';
  if (!entity) {
    containerEl.appendChild(createEl('div', { text: 'Нет данных для отображения.' }));
    return;
  }
  if (titleEl) {
    titleEl.textContent = entity.title || 'Редактор данных';
  }
  if (entity.kind === 'platform') {
    containerEl.appendChild(renderPlatform());
    return;
  }
  if (entity.kind === 'service') {
    containerEl.appendChild(renderService(entity.service));
    return;
  }
  if (entity.kind === 'category') {
    containerEl.appendChild(renderCategory(entity));
    return;
  }
  if (entity.kind === 'component') {
    containerEl.appendChild(renderComponent(entity));
  }
}

function renderBreadcrumbs(id) {
  if (!breadcrumbsEl) return;
  const entity = getEntity(id) || getEntity('platform');
  const crumbs = [];
  crumbs.push(createEl('span', { text: 'Платформа' }));
  if (!entity || entity.kind === 'platform') {
    breadcrumbsEl.replaceChildren(...crumbs);
    return;
  }
  const service = entity.service || findServiceById(entity.id);
  if (service) crumbs.push(createEl('span', { text: service.name }));
  if ((entity.kind === 'category' || entity.kind === 'component') && service) {
    crumbs.push(createEl('span', { text: CATEGORY_LABELS[entity.category] }));
  }
  if (entity.kind === 'component') {
    crumbs.push(createEl('span', { text: entity.component.name }));
  }
  breadcrumbsEl.replaceChildren(...crumbs);
}

function renderPlatform() {
  const platform = getPlatform();
  const fragment = document.createDocumentFragment();
  fragment.appendChild(sectionGeneral(platform));
  fragment.appendChild(sectionPrinciples(platform));
  fragment.appendChild(sectionServices(platform));
  return fragment;
}

function renderService(service) {
  const fragment = document.createDocumentFragment();
  fragment.appendChild(sectionGeneral(service));
  fragment.appendChild(sectionServiceMeta(service));
  fragment.appendChild(sectionRoadmap(service));
  fragment.appendChild(sectionCategoryNotes(service));
  fragment.appendChild(sectionComponents(service));
  fragment.appendChild(sectionStructure(service));
  return fragment;
}

function renderCategory(entity) {
  const { service, category } = entity;
  const fragment = document.createDocumentFragment();
  fragment.appendChild(sectionCategoryNotes(service, category));
  fragment.appendChild(sectionComponents(service, category));
  return fragment;
}

function renderComponent(entity) {
  const { component, category } = entity;
  const fragment = document.createDocumentFragment();
  fragment.appendChild(sectionComponentCard(component, category, entity.service));
  return fragment;
}

function sectionGeneral(subject) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [createEl('h3', { text: 'Общие сведения' })]));
  const grid = createEl('div', { className: 'edit-grid' });
  grid.appendChild(makeEditableRow('Название', subject.name, value => { subject.name = value; }));
  grid.appendChild(makeEditableRow('Описание', subject.summary || subject.description || '', value => {
    if ('summary' in subject) subject.summary = value;
    else subject.description = value;
  }, { multiline: true }));
  if ('mission' in subject) {
    grid.appendChild(makeEditableRow('Миссия', subject.mission, value => { subject.mission = value; }, { multiline: true }));
  }
  if ('owner' in subject) {
    grid.appendChild(makeEditableRow('Владелец', subject.owner, value => { subject.owner = value; }));
    grid.appendChild(makeEditableRow('Лид', subject.lead, value => { subject.lead = value; }));
  }
  if ('status' in subject) grid.appendChild(makeEditableRow('Статус', subject.status, value => { subject.status = value; }));
  if ('sla' in subject) grid.appendChild(makeEditableRow('SLA', subject.sla, value => { subject.sla = value; }));
  if ('impact' in subject) grid.appendChild(makeEditableRow('Impact', subject.impact, value => { subject.impact = value; }));
  section.appendChild(grid);
  return section;
}

function sectionServiceMeta(service) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [createEl('h3', { text: 'Метрики и доступы' })]));
  const grid = createEl('div', { className: 'edit-grid' });
  grid.appendChild(makeEditableRow('Area', service.area || '', value => { service.area = value; }));
  grid.appendChild(makeEditableRow('Репозиторий', service.repo || '', value => { service.repo = value; }));
  section.appendChild(grid);
  return section;
}

function sectionPrinciples(platform) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [
    createEl('h3', { text: 'Принципы' }),
    createEl('div', { className: 'inline-actions' }, [
      createEl('button', {
        className: 'btn-secondary',
        text: 'Добавить принцип',
        onclick: () => {
          platform.principles.push('Новый принцип');
          markDirty();
          renderPanel('platform');
        }
      })
    ])
  ]));
  const stack = createEl('div', { className: 'list-stack' });
  platform.principles.forEach((item, index) => {
    stack.appendChild(makeEditableRow(`Принцип ${index + 1}`, item, value => {
      platform.principles[index] = value;
    }, {
      multiline: true,
      onRemove: () => {
        platform.principles.splice(index, 1);
        markDirty();
        renderPanel('platform');
      }
    }));
  });
  section.appendChild(stack);
  return section;
}

function sectionServices(platform) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [
    createEl('h3', { text: 'Сервисы' }),
    createEl('div', { className: 'inline-actions' }, [
      createEl('button', {
        className: 'btn-secondary',
        text: 'Добавить сервис',
        onclick: () => {
          const service = sanitizeService({ name: 'New service', summary: '' });
          platform.services.push(service);
          markDirty();
          if (navigateCallback) navigateCallback(service.id);
          renderPanel(service.id);
        }
      })
    ])
  ]));
  const stack = createEl('div', { className: 'list-stack' });
  platform.services.forEach(service => {
    const card = createEl('div', { className: 'component-card' });
    card.appendChild(createEl('header', {}, [
      createEl('h4', { text: service.name }),
      createEl('div', { className: 'inline-actions' }, [
        createEl('button', {
          className: 'btn-secondary',
          text: 'Открыть',
          onclick: () => {
            if (navigateCallback) navigateCallback(service.id);
            renderPanel(service.id);
          }
        })
      ])
    ]));
    card.appendChild(makeEditableRow('Название', service.name, value => { service.name = value; }, {
      onChange: value => card.querySelector('h4').textContent = value || 'Без названия'
    }));
    card.appendChild(makeEditableRow('Описание', service.summary, value => { service.summary = value; }, { multiline: true }));
    stack.appendChild(card);
  });
  section.appendChild(stack);
  return section;
}

function sectionRoadmap(service) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [
    createEl('h3', { text: 'Роадмап' }),
    createEl('button', {
      className: 'btn-secondary',
      text: 'Добавить пункт',
      onclick: () => {
        service.roadmap.push('Новая задача');
        markDirty();
        renderPanel(service.id);
      }
    })
  ]));
  const stack = createEl('div', { className: 'list-stack' });
  service.roadmap.forEach((item, index) => {
    stack.appendChild(makeEditableRow(`Этап ${index + 1}`, item, value => {
      service.roadmap[index] = value;
    }, {
      multiline: true,
      onRemove: () => {
        service.roadmap.splice(index, 1);
        markDirty();
        renderPanel(service.id);
      }
    }));
  });
  section.appendChild(stack);
  return section;
}

function sectionCategoryNotes(service, onlyCategory) {
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [createEl('h3', { text: 'Заметки направлений' })]));
  const grid = createEl('div', { className: 'edit-grid' });
  const categories = onlyCategory ? [onlyCategory] : ['frontend', 'backend', 'qa'];
  categories.forEach(category => {
    grid.appendChild(makeEditableRow(CATEGORY_LABELS[category], service.categoryNotes[category] || '', value => {
      service.categoryNotes[category] = value;
    }, { multiline: true }));
  });
  section.appendChild(grid);
  return section;
}

function sectionComponents(service, onlyCategory) {
  const categories = onlyCategory ? [onlyCategory] : ['frontend', 'backend', 'qa'];
  const fragment = document.createDocumentFragment();
  categories.forEach(category => {
    const items = service[category] || [];
    const section = createEl('section', { className: 'edit-section' });
    section.appendChild(createEl('header', {}, [
      createEl('h3', { text: `${CATEGORY_LABELS[category]} · ${items.length}` }),
      createEl('div', { className: 'inline-actions' }, [
        createEl('button', {
          className: 'btn-secondary',
          text: 'Добавить',
          onclick: () => {
            const component = sanitizeComponent({ name: 'New module', description: '' });
            items.push(component);
            markDirty();
            const entityId = `${service.id}:${category}`;
            if (navigateCallback) navigateCallback(entityId);
            renderPanel(entityId);
          }
        })
      ])
    ]));
    const stack = createEl('div', { className: 'list-stack' });
    items.forEach(component => {
      stack.appendChild(sectionComponentCard(component, category, service));
    });
    section.appendChild(stack);
    fragment.appendChild(section);
  });
  return fragment;
}

function sectionComponentCard(component, category, service) {
  const card = createEl('div', { className: 'component-card' });
  const header = createEl('header');
  const title = createEl('h4', { text: component.name || 'Без названия' });
  header.appendChild(title);
  header.appendChild(createEl('span', { className: 'tag', text: CATEGORY_LABELS[category] || '' }));
  card.appendChild(header);
  card.appendChild(makeEditableRow('Название', component.name, value => {
    component.name = value;
    title.textContent = value || 'Без названия';
  }));
  card.appendChild(makeEditableRow('Описание', component.description, value => { component.description = value; }, { multiline: true }));
  card.appendChild(makeEditableRow('Стек', component.stack, value => { component.stack = value; }));
  card.appendChild(makeEditableRow('Статус', component.status, value => { component.status = value; }));
  card.appendChild(makeEditableRow('Ответственный', component.lead, value => { component.lead = value; }));
  card.appendChild(makeEditableRow('Репозиторий', component.repo, value => { component.repo = value; }));
  if (component.metrics && Object.keys(component.metrics).length) {
    const meta = createEl('div', { className: 'component-meta' });
    Object.entries(component.metrics).forEach(([key, value]) => {
      meta.appendChild(createEl('span', {}, [createEl('strong', { text: key }), createEl('div', { text: value })]));
    });
    card.appendChild(meta);
  }
  return card;
}

function sectionStructure(service) {
  if (!service.servicesTree || service.servicesTree.length === 0) return document.createDocumentFragment();
  const section = createEl('section', { className: 'edit-section' });
  section.appendChild(createEl('header', {}, [createEl('h3', { text: 'Структура сервисов' })]));
  section.appendChild(renderTree(service.servicesTree));
  return section;
}

function renderTree(nodes, depth = 0) {
  const list = createEl('div', { className: 'list-stack' });
  nodes.forEach(node => {
    const card = createEl('div', { className: 'component-card' });
    card.appendChild(createEl('header', {}, [
      createEl('h4', { text: node.name }),
      node.type ? createEl('span', { className: 'tag', text: node.type }) : null
    ].filter(Boolean)));
    if (node.description) {
      card.appendChild(createEl('p', { text: node.description }));
    }
    if (node.items && node.items.length) {
      const meta = createEl('div', { className: 'component-meta' });
      node.items.forEach(item => {
        meta.appendChild(createEl('span', {}, [createEl('strong', { text: item.name }), createEl('div', { text: item.detail })]));
      });
      card.appendChild(meta);
    }
    if (node.children && node.children.length) {
      card.appendChild(renderTree(node.children, depth + 1));
    }
    list.appendChild(card);
  });
  return list;
}

function makeEditableRow(label, value, onCommit, { multiline = false, onRemove, onChange } = {}) {
  const row = createEl('div', { className: 'edit-row' });
  const labelEl = createEl('div', { className: 'edit-label', text: label });
  const valueBox = createEl('div', { className: 'edit-value' });
  const span = createEl(multiline ? 'div' : 'span');
  span.textContent = value || '—';
  if (multiline) span.style.whiteSpace = 'pre-wrap';
  valueBox.appendChild(span);
  if (onRemove) {
    valueBox.appendChild(createEl('button', {
      className: 'btn-secondary',
      text: 'Удалить',
      onclick: (event) => {
        event.stopPropagation();
        onRemove();
      }
    }));
  }
  const commit = newValue => {
    onCommit(newValue);
    markDirty();
    value = newValue;
    span.textContent = newValue || '—';
    valueBox.classList.remove('is-editing');
    if (onChange) onChange(newValue);
  };
  const startEdit = () => {
    if (valueBox.classList.contains('is-editing')) return;
    valueBox.classList.add('is-editing');
    span.contentEditable = 'true';
    span.focus();
    const range = document.createRange();
    range.selectNodeContents(span);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  };
  const stopEdit = (commitChanges) => {
    span.contentEditable = 'false';
    if (commitChanges) {
      commit(span.textContent.trim());
    } else {
      span.textContent = value || '—';
      valueBox.classList.remove('is-editing');
    }
  };
  span.addEventListener('keydown', event => {
    if (!multiline && event.key === 'Enter') {
      event.preventDefault();
      stopEdit(true);
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      stopEdit(false);
    }
  });
  span.addEventListener('blur', () => stopEdit(true));
  valueBox.addEventListener('click', () => startEdit());
  row.appendChild(labelEl);
  row.appendChild(valueBox);
  return row;
}
