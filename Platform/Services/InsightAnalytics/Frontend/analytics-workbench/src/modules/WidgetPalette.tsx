import React from 'react';
import { WidgetInstance } from './DashboardCanvas';

const templates: Omit<WidgetInstance, 'id'>[] = [
  { type: 'chart', title: 'Revenue', query: 'select * from revenue' },
  { type: 'kpi', title: 'Active users', query: 'select count(*) from sessions' },
];

export const WidgetPalette: React.FC<{ onAdd: (widget: WidgetInstance) => void }> = ({ onAdd }) => (
  <aside className="widget-palette">
    <h2>Widgets</h2>
    <ul>
      {templates.map((template, index) => (
        <li key={template.title}>
          <button type="button" onClick={() => onAdd({ id: `${template.type}-${index}-${Date.now()}`, ...template })}>
            Add {template.title}
          </button>
        </li>
      ))}
    </ul>
  </aside>
);
